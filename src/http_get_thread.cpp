#include "http_get_thread.hpp"

#include "log.hpp"

#include "utils.hpp"

#include <nlohmann/json.hpp>

#pragma comment (lib, "winhttp.lib")

namespace {
}


namespace app {

	bool check_stats_code(const std::string& _stats_code)
	{
		for (size_t i = 0; i < _stats_code.length(); ++i)
		{
			switch (_stats_code.at(i))
			{
			case '-':
			case '0':
			case '1':
			case '2':
			case '3':
			case '4':
			case '5':
			case '6':
			case '7':
			case '8':
			case '9':
			case 'a':
			case 'b':
			case 'c':
			case 'd':
			case 'e':
			case 'f':
				break;
			default:
				return false;
			}
		}
		return true;
	}

	enum : uint32_t {
		WINHTTP_GET_EVENT_CLOSED,
		WINHTTP_GET_EVENT_REQUEST_COMPLETE,
		WINHTTP_GET_EVENT_HEADER_AVAILABLE,
		WINHTTP_GET_EVENT_RESPONSE_RECEIVED,
		WINHTTP_GET_EVENT_BODY_READABLE,
		WINHTTP_GET_EVENT_READ_COMPLETE,
		WINHTTP_GET_EVENT_ERROR,
		WINHTTP_GET_EVENT_TLS_ERROR,
	};

	http_get_thread::http_get_thread(DWORD _logid)
		: logid_(_logid)
		, session_(NULL)
		, connect_(NULL)
		, request_(NULL)
		, thread_(NULL)
		, event_close_(NULL)
		, event_ping_(NULL)
		, event_winhttp_(NULL)
		, available_(0)
		, event_mtx_()
		, event_queue_()
		, wqmtx_()
		, rqmtx_()
		, event_wq_(NULL)
		, event_rq_(NULL)
		, wq_()
		, rq_()
	{
	}

	http_get_thread::~http_get_thread()
	{
		stop();
		if (event_wq_) ::CloseHandle(event_wq_);
		if (event_rq_) ::CloseHandle(event_rq_);
		if (event_winhttp_) ::CloseHandle(event_winhttp_);
		if (event_ping_) ::CloseHandle(event_ping_);
		if (event_close_) ::CloseHandle(event_close_);
		if (request_) ::WinHttpCloseHandle(request_);
		if (connect_) ::WinHttpCloseHandle(connect_);
		if (session_) ::WinHttpCloseHandle(session_);
	}

	DWORD WINAPI http_get_thread::proc_common(LPVOID _p)
	{
		auto p = reinterpret_cast<http_get_thread*>(_p);
		return p->proc();
	}

	DWORD http_get_thread::proc()
	{
		log(logid_, L"Info: thread start.");

		// WinHTTPの初期化
		session_ = ::WinHttpOpen(L"github.com/ndekopon/overlaytools", WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY, WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, WINHTTP_FLAG_ASYNC | WINHTTP_FLAG_SECURE_DEFAULTS);
		if (session_ == NULL)
		{
			log(logid_, L"Error: WinHttpOpen failed.");
			return 0;
		}

		// callbackの設定
		auto prev_callback = ::WinHttpSetStatusCallback(session_, (WINHTTP_STATUS_CALLBACK)callback_common, WINHTTP_CALLBACK_FLAG_ALL_NOTIFICATIONS, NULL);
		if (prev_callback == WINHTTP_INVALID_STATUS_CALLBACK)
		{
			log(logid_, L"Error: WinHttpSetStatusCallback failed.");
			return 0;
		}

		// callbackのcontext設定
		DWORD_PTR option_context = reinterpret_cast<DWORD_PTR>(this);
		if (!::WinHttpSetOption(session_, WINHTTP_OPTION_CONTEXT_VALUE, &option_context, sizeof(option_context)))
		{
			log(logid_, L"Error: WinHttpSetOption failed.");
			return 0;
		}

		// 返送用データ
		std::vector<char> buf;
		buf.resize(64 * 1024);
		uint64_t timestamp = 0;
		http_get_queue_data_t reply_data = nullptr;

		HANDLE events[] = {
			event_close_,
			event_ping_,
			event_rq_,
			event_winhttp_,
		};


		// 本文の受信
		while (1)
		{
			bool close_connection = false;
			auto id = ::WaitForMultipleObjects(ARRAYSIZE(events), events, FALSE, INFINITE);

			if (id == WAIT_OBJECT_0)
			{
				log(logid_, L"Info: close called.");
				// close要求
				break;
			}
			else if (id == WAIT_OBJECT_0 + 1)
			{
				// ping(タイムアウトを確認する)
				if (timestamp > 0 && get_millis() - timestamp > 10000)
				{
					log(logid_, L"Info: connection timeout.");
					close_connection = true;
				}
			}
			else if (id == WAIT_OBJECT_0 + 2)
			{
				// 現在取得中の場合は何もしない
				if (connect_ != NULL) continue;
				if (request_ != NULL) continue;

				// codeチェック
				{
					std::lock_guard<std::mutex> lock(rqmtx_);
					if (rq_.size() > 0)
					{
						reply_data = std::move(rq_.front());
						rq_.pop();
					}
					else
					{
						// 要求がない場合はスキップ
						continue;
					}
					reply_data->json->reserve(64000);
				}

				if (reply_data->code != "" && check_stats_code(reply_data->code))
				{
					log(logid_, L"Info: stats_code requested [%s].", s_to_ws(reply_data->code).c_str());
					timestamp = get_millis();
					if (!proc_connect_and_request(reply_data->code))
					{
						log(logid_, L"Error: proc_connect_and_request failed.");
						close_connection = true;
					}
				}
				else
				{
					log(logid_, L"Error: stats_code is not valid format [%s].", s_to_ws(reply_data->code));
					close_connection = true;
				}
			}
			else if (id == WAIT_OBJECT_0 + 3)
			{
				// イベントの取り出し
				std::queue<uint32_t> q;
				{
					std::lock_guard<std::mutex> lock(event_mtx_);
					while (event_queue_.size() > 0)
					{
						q.push(event_queue_.front());
						event_queue_.pop();
					}
				}

				// イベント処理
				while (q.size() > 0)
				{
					auto get_event = q.front();
					q.pop();

					switch (get_event)
					{
					case WINHTTP_GET_EVENT_CLOSED:
						log(logid_, L"Info: WINHTTP_GET_EVENT_CLOSED.");
						close_connection = true;
						break;
					case WINHTTP_GET_EVENT_REQUEST_COMPLETE:
						log(logid_, L"Info: WINHTTP_GET_EVENT_REQUEST_COMPLETE.");
						::WinHttpReceiveResponse(request_, NULL);
						break;
					case WINHTTP_GET_EVENT_HEADER_AVAILABLE:
					{
						log(logid_, L"Info: WINHTTP_GET_EVENT_HEADER_AVAILABLE.");
						auto hdr = proc_get_header();
						if (reply_data)
						{
							reply_data->status_code = hdr.code;
						}
						break;
					}
					case WINHTTP_GET_EVENT_RESPONSE_RECEIVED:
					{
						log(logid_, L"Info: WINHTTP_GET_EVENT_RESPONSE_RECEIVED.");
						available_ = 0;
						if (request_)
						{
							::WinHttpQueryDataAvailable(request_, &available_);
						}
						break;
					}
					case WINHTTP_GET_EVENT_READ_COMPLETE:
					{
						log(logid_, L"Info: WINHTTP_GET_EVENT_READ_COMPLETE.");
						available_ = 0;
						if (request_)
						{
							::WinHttpQueryDataAvailable(request_, &available_);
						}
						break;
					}
					case WINHTTP_GET_EVENT_BODY_READABLE:
					{
						log(logid_, L"Info: WINHTTP_GET_EVENT_BODY_READABLE. available=%d", available_);
						if (buf.size() < available_ + 1)
						{
							buf.resize(available_ + 1);
						}
						if (::WinHttpReadData(request_, buf.data(), available_, NULL))
						{
							buf.at(available_) = '\0';
							if (reply_data && reply_data->json)
							{
								*reply_data->json += reinterpret_cast<char*>(buf.data());
							}
						}
						break;
					}
					case WINHTTP_GET_EVENT_ERROR:
					{
						log(logid_, L"Error: GET_EVENT_ERROR.");
						close_connection = true;
						break;
					}
					case WINHTTP_GET_EVENT_TLS_ERROR:
					{
						log(logid_, L"Error: GET_EVENT_TLS_ERROR.");
						break;
					}
					}
				}
			}

			if (close_connection)
			{
				if (request_) ::WinHttpCloseHandle(request_);
				request_ = NULL;
				if (connect_) ::WinHttpCloseHandle(connect_);
				connect_ = NULL;

				if (timestamp > 0)
				{
					if (reply_data && reply_data->json)
					{
						if (reply_data->status_code != 200)
						{
							*reply_data->json = "{}";
						}
						else
						{
							bool is_object = false;
							try
							{
								auto j = nlohmann::json::parse(*reply_data->json);
								if (j.type() == nlohmann::json::value_t::object)
								{
									is_object = true;
								}
							}
							catch (...)
							{
							}
							if (!is_object)
							{
								log(logid_, L"Error: received data is not parsable json object.");
								*reply_data->json = "{}";
							}
						}
						log(logid_, L"Info: data send to core_thread. size=%lu", reply_data->json->length());
						push_wq(std::move(reply_data));
					}

					// 値の初期化
					timestamp = 0;
					reply_data.reset(nullptr);

					::SetEvent(event_rq_); // 次の要求処理
				}
			}
		}

		return 0;
	}

	bool http_get_thread::proc_connect_and_request(const std::string& _stats_code)
	{
		WCHAR hostname[256], urlpath[2048];
		std::wstring url = L"https://r5-crossplay.r5prod.stryder.respawn.com/privatematch/?token=" + s_to_ws(_stats_code);

		// URL解析
		URL_COMPONENTS url_components = { 0 };
		url_components.dwStructSize = sizeof(URL_COMPONENTS);
		url_components.lpszHostName = hostname;
		url_components.dwHostNameLength = sizeof(hostname) / sizeof(WCHAR);
		url_components.lpszUrlPath = urlpath;
		url_components.dwUrlPathLength = sizeof(urlpath) / sizeof(WCHAR);
		if (!::WinHttpCrackUrl(url.c_str(), url.size(), 0, &url_components))
		{
			return false;
		}

		// HTTPの開始(同期的)
		connect_ = ::WinHttpConnect(session_, hostname, url_components.nPort, 0);
		if (connect_ == NULL)
		{
			return false;
		}

		// 接続された
		request_ = ::WinHttpOpenRequest(connect_, L"GET", urlpath, L"HTTP/1.1", WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, (url_components.nScheme == INTERNET_SCHEME_HTTPS) ? WINHTTP_FLAG_SECURE : 0);
		if (request_ == NULL)
		{
			return false;
		}

		// Keep-Aliveしない
		long disable_feature = WINHTTP_DISABLE_KEEP_ALIVE;
		if (!::WinHttpSetOption(request_, WINHTTP_OPTION_DISABLE_FEATURE, &disable_feature, sizeof(disable_feature)))
		{
			return false;
		}

		// リクエストが作成された
		if (::WinHttpSendRequest(request_, WINHTTP_NO_ADDITIONAL_HEADERS, 0, WINHTTP_NO_REQUEST_DATA, 0, WINHTTP_IGNORE_REQUEST_TOTAL_LENGTH, 0) == FALSE)
		{
			return false;
		}

		return true;
	}

	response_header http_get_thread::proc_get_header()
	{
		response_header hdr = { L"", 0 };

		// ヘッダー取得可能
		DWORD size = 0;
		if (::WinHttpQueryHeaders(request_, WINHTTP_QUERY_RAW_HEADERS_CRLF, WINHTTP_HEADER_NAME_BY_INDEX, WINHTTP_NO_OUTPUT_BUFFER, &size, WINHTTP_NO_HEADER_INDEX) == FALSE)
		{
			if (::GetLastError() != ERROR_INSUFFICIENT_BUFFER)
			{
				return hdr;
			}
		}

		auto buffer = (WCHAR*)::HeapAlloc(::GetProcessHeap(), 0, size);
		if (buffer)
		{
			if (::WinHttpQueryHeaders(request_, WINHTTP_QUERY_RAW_HEADERS_CRLF, WINHTTP_HEADER_NAME_BY_INDEX, buffer, &size, WINHTTP_NO_HEADER_INDEX))
			{
				hdr.data = buffer;
			}
			::HeapFree(::GetProcessHeap(), NULL, buffer);
		}

		// レスポンスコードの確認
		size = sizeof(DWORD);
		::WinHttpQueryHeaders(request_, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER, WINHTTP_HEADER_NAME_BY_INDEX, &hdr.code, &size, WINHTTP_NO_HEADER_INDEX);

		return hdr;
	}

	bool http_get_thread::run()
	{
		event_close_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_close_ == NULL)
		{
			return false;
		}
		event_ping_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_ping_ == NULL)
		{
			return false;
		}
		event_winhttp_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_winhttp_ == NULL)
		{
			return false;
		}
		event_wq_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_wq_ == NULL)
		{
			return false;
		}
		event_rq_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_rq_ == NULL)
		{
			return false;
		}

		// スレッド起動
		thread_ = ::CreateThread(NULL, 0, proc_common, this, 0, NULL);
		return thread_ != NULL;
	}

	void http_get_thread::stop()
	{
		// スレッドの停止
		if (thread_ != NULL)
		{
			::SetEvent(event_close_);
			::WaitForSingleObject(thread_, INFINITE);
			thread_ = NULL;
		}
	}

	void http_get_thread::ping()
	{
		// タイムアウト確認用
		::SetEvent(event_ping_);
	}

	void CALLBACK http_get_thread::callback_common(HINTERNET _internet, DWORD_PTR _context, DWORD _internet_status, void* _status_info, DWORD _info_length)
	{
		if (_context != NULL)
		{
			auto p = reinterpret_cast<http_get_thread*>(_context);
			return p->callback(_internet, _internet_status, _status_info, _info_length);
		}
	}

	void http_get_thread::callback(HINTERNET _internet, DWORD _internet_status, void* _status_info, DWORD _info_length)
	{
		switch (_internet_status)
		{
		case WINHTTP_CALLBACK_STATUS_CONNECTING_TO_SERVER:
			break;
		case WINHTTP_CALLBACK_STATUS_CONNECTED_TO_SERVER:
			break;
		case WINHTTP_CALLBACK_STATUS_CLOSING_CONNECTION:
			break;
		case WINHTTP_CALLBACK_STATUS_HANDLE_CREATED:
			break;
		case WINHTTP_CALLBACK_STATUS_HANDLE_CLOSING:
			break;
		case WINHTTP_CALLBACK_STATUS_INTERMEDIATE_RESPONSE:
			break;
		case WINHTTP_CALLBACK_STATUS_RESOLVING_NAME:
			break;
		case WINHTTP_CALLBACK_STATUS_NAME_RESOLVED:
			break;
		case WINHTTP_CALLBACK_STATUS_RECEIVING_RESPONSE:
			break;
		case WINHTTP_CALLBACK_STATUS_REDIRECT:
			break;
		case WINHTTP_CALLBACK_STATUS_SENDING_REQUEST:
			break;
		case WINHTTP_CALLBACK_STATUS_REQUEST_SENT:
			break;
		case WINHTTP_CALLBACK_STATUS_GETPROXYFORURL_COMPLETE: // Proxy
			break;
		case WINHTTP_CALLBACK_STATUS_CLOSE_COMPLETE: // WebSocket
			break;
		case WINHTTP_CALLBACK_STATUS_SHUTDOWN_COMPLETE: // WebSocket
			break;
		case WINHTTP_CALLBACK_STATUS_WRITE_COMPLETE:
			break;
		case WINHTTP_CALLBACK_STATUS_CONNECTION_CLOSED:
			// connection closed -> close request and connect
			{
				std::lock_guard<std::mutex> lock(event_mtx_);
				event_queue_.push(WINHTTP_GET_EVENT_CLOSED);
			}
			::SetEvent(event_winhttp_);
			break;
		case WINHTTP_CALLBACK_STATUS_SENDREQUEST_COMPLETE:
			{
				std::lock_guard<std::mutex> lock(event_mtx_);
				event_queue_.push(WINHTTP_GET_EVENT_REQUEST_COMPLETE);
			}
			::SetEvent(event_winhttp_);
			break;
		case WINHTTP_CALLBACK_STATUS_HEADERS_AVAILABLE:
			{
				std::lock_guard<std::mutex> lock(event_mtx_);
				event_queue_.push(WINHTTP_GET_EVENT_HEADER_AVAILABLE);
			}
			::SetEvent(event_winhttp_);
			break;
		case WINHTTP_CALLBACK_STATUS_RESPONSE_RECEIVED:
			{
				std::lock_guard<std::mutex> lock(event_mtx_);
				event_queue_.push(WINHTTP_GET_EVENT_RESPONSE_RECEIVED);
			}
			::SetEvent(event_winhttp_);
			break;
		case WINHTTP_CALLBACK_STATUS_READ_COMPLETE:
			{
				std::lock_guard<std::mutex> lock(event_mtx_);
				event_queue_.push(WINHTTP_GET_EVENT_READ_COMPLETE);
			}
			::SetEvent(event_winhttp_);
			break;
		case WINHTTP_CALLBACK_STATUS_DATA_AVAILABLE:
			{
				std::lock_guard<std::mutex> lock(event_mtx_);
				event_queue_.push(WINHTTP_GET_EVENT_BODY_READABLE);
			}
			::SetEvent(event_winhttp_);
			break;
		case WINHTTP_CALLBACK_STATUS_REQUEST_ERROR:
			{
				std::lock_guard<std::mutex> lock(event_mtx_);
				event_queue_.push(WINHTTP_GET_EVENT_ERROR);
			}
			::SetEvent(event_winhttp_);
			break;
		case WINHTTP_CALLBACK_STATUS_SECURE_FAILURE:
			{
				std::lock_guard<std::mutex> lock(event_mtx_);
				event_queue_.push(WINHTTP_GET_EVENT_TLS_ERROR);
			}
			::SetEvent(event_winhttp_);
			break;
		}
	}

	void http_get_thread::push_wq(http_get_queue_data_t&& _data)
	{
		{
			std::lock_guard<std::mutex> lock(wqmtx_);
			wq_.push(std::move(_data));
		}
		::SetEvent(event_wq_);
	}

	void http_get_thread::get_stats_json(SOCKET _sock, uint32_t _sequence, const std::string& _stats_code)
	{
		http_get_queue_data_t q(new http_get_queue_data());
		q->sock = _sock;
		q->sequence = _sequence;
		q->code = _stats_code;
		q->status_code = 0;
		q->json.reset(new std::string(""));
		{
			std::lock_guard<std::mutex> lock(rqmtx_);
			rq_.push(std::move(q));
		}
		::SetEvent(event_rq_);
	}

	HANDLE http_get_thread::get_event_wq()
	{
		return event_wq_;
	}

	std::queue<http_get_queue_data_t> http_get_thread::pull_wq()
	{
		std::queue<http_get_queue_data_t> q;
		{
			std::lock_guard<std::mutex> lock(wqmtx_);
			while (wq_.size() > 0)
			{
				q.push(std::move(wq_.front()));
				wq_.pop();
			}
		}
		return q;
	}
}
