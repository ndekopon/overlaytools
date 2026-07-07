#include "websocket_thread.hpp"

#include "log.hpp"

#include "websocket_server.hpp"

namespace app {
	websocket_thread::websocket_thread(DWORD _logid,  const std::string& _ip, uint16_t _port, uint16_t _maxconn)
		: logid_(_logid)
		, ip_(_ip)
		, port_(_port)
		, maxconn_(_maxconn)
		, thread_(NULL)
		, compport_(NULL)
		, event_out_(NULL)
	{
	}

	websocket_thread::~websocket_thread()
	{
		stop();
	}

	DWORD WINAPI websocket_thread::proc_common(LPVOID _p)
	{
		auto p = reinterpret_cast<websocket_thread*>(_p);
		return p->proc();
	}

	DWORD websocket_thread::proc()
	{
		log(logid_ , L"Info: thread start.");

		websocket_server ws(ip_.c_str(), port_, maxconn_, logid_);

		ws.set_on_disconnect([this](SOCKET _sock) {
			push_out(websocket_message_out_disconnected{ _sock });
			});

		if (ws.prepare())
		{
			log(logid_, L"Info: websocket_server::prepare() success.");

			auto port = ::CreateIoCompletionPort((HANDLE)ws.sock_, compport_, 0, 0);
			uint64_t recv_count = 0;
			uint64_t send_count = 0;

			// 接続待ち
			if (!ws.acceptex())
			{
				log(logid_, L"Error: websocket_server::acceptex() failed.");
				return 0;
			}

			while (true)
			{
				DWORD transferred = 0;
				ULONG_PTR compkey = 0;
				LPOVERLAPPED ov = NULL;
				auto rc = ::GetQueuedCompletionStatus(compport_, &transferred, &compkey, &ov, INFINITE);
				auto gqcs_error = rc == FALSE ? ::GetLastError() : ERROR_SUCCESS;

				if (rc == FALSE && ov == NULL)
				{
					log(logid_, std::format(L"Error: GetQueuedCompletionStatus() failed. ErrorCode={}", gqcs_error));
					continue;
				}

				if (compkey == 0 && ov == NULL)
				{

					if (transferred == 0)
					{
						// 終了通知
						break;
					}
					else if (transferred == 1)
					{
						// 受信したメッセージの処理
						auto q = pull_q_in();

						while (q.size() > 0)
						{
							std::visit(overloaded{
								[&](websocket_message_in_send_binary& _m) {
									ws.send_binary(_m.sock, _m.data, _m.data.size());
								},
								[&](websocket_message_in_ping&) {
									ws.broadcast_ping();
								},
								[&](websocket_message_in_get_stats&) {
									uint64_t conn_count = ws.count();
									push_out_get_stats(conn_count, recv_count, send_count);
								}
								}, q.front());
							q.pop();
						}
					}
				}
				if (compkey == 0 && ov != NULL)
				{
					// ACCEPT
					WS_ACCEPT_CONTEXT *ctx = (WS_ACCEPT_CONTEXT*)ov;
					SOCKET sock = ctx->sock;

					if (rc == FALSE)
					{
						log(logid_, std::format(L"Error: ACCEPT completion failed. ErrorCode={}", gqcs_error));
						if (sock != INVALID_SOCKET)
						{
							::closesocket(sock);
						}
						if (!ws.acceptex())
						{
							log(logid_, L"Error: websocket_server::acceptex() failed.");
							break;
						}
						continue;
					}


					auto ipport = get_remote_ipport(ctx->data, transferred);
					log(logid_, std::format(L"Info: connected from {}", ipport));

					if (!ws.acceptex())
					{
						log(logid_, L"Error: websocket_server::acceptex() failed.");
						break;
					}
					if (!ws.insert(sock))
					{
						log(logid_, L"Error: reached max connection.");
						::closesocket(sock);
						continue;
					}

					// 接続元の表示
					log(logid_, std::format(L"Info: ACCEPT called. sock={}", sock));

					::CreateIoCompletionPort((HANDLE)sock, compport_, (ULONG_PTR)ctx, 0);

					// 読込待ち
					if (!ws.read(sock))
					{
						log(logid_, L"Error: websocket_server::read() failed.");
					}

					push_out(websocket_message_out_connected{ sock, ipport });
				}
				if (compkey != 0 && ov != NULL)
				{
					WS_ACCEPT_CONTEXT* ctx = (WS_ACCEPT_CONTEXT*)compkey;
					WS_IO_CONTEXT* ioctx = (WS_IO_CONTEXT*)ov;

					auto sock = ioctx->sock;
					ioctx->pending = 0;

					if (rc == FALSE)
					{
						log(logid_, std::format(L"Error: socket I/O completion failed. sock={},type={},ErrorCode={}", sock, ioctx->type, gqcs_error));
						ws.close(sock);
						continue;
					}

					if (transferred == 0 && (ioctx->type == WS_TCP_RECV || ioctx->type == WS_TCP_SEND))
					{
						ws.close(sock);
					}
					else if (ioctx->type == WS_TCP_RECV)
					{
						auto queue = ws.receive_data(sock, ioctx->rbuf, transferred);
						while (queue.size() > 0)
						{
							if (queue.front() != nullptr)
							{
								push_out_recv_binary(sock, std::move(*queue.front()));
								recv_count++;
							}
							queue.pop();
						}

						// 読込待ち
						if (!ws.read(sock))
						{
							log(logid_, L"Error: websocket_server::read() failed.");
						}
					}
					else if (ioctx->type == WS_TCP_SEND)
					{
						// 書き込み用に確保していたものをクリア
						ioctx->wbuf = nullptr;

						// 残りのバッファを送信
						std::shared_ptr<std::vector<uint8_t>> empty = nullptr;
						if (!ws.send(sock, empty))
						{
							log(logid_, L"Error: websocket_server::send() failed.");
							ws.close(sock);
						}
						send_count++;
					}
				}
			}
		}
		log(logid_, L"Info: thread end.");

		return 0;
	}

	bool websocket_thread::run()
	{
		// CompPort作成
		compport_ = ::CreateIoCompletionPort(INVALID_HANDLE_VALUE, NULL, 0, 0);
		if (compport_ == NULL)
		{
			log(logid_, L"Error: CreateIoCompletionPort() failed.");
			return false;
		}

		// イベント作成
		event_out_ = ::CreateEvent(NULL, FALSE, FALSE, NULL);
		if (event_out_ == NULL)
		{
			log(logid_, L"Error: CreateEvent() failed.");
			return false;
		}

		// スレッド起動
		thread_ = ::CreateThread(NULL, 0, proc_common, this, 0, NULL);
		return thread_ != NULL;
	}

	void websocket_thread::stop()
	{
		if (thread_ != NULL)
		{
			::PostQueuedCompletionStatus(compport_, 0, 0, NULL);
			::WaitForSingleObject(thread_, INFINITE);
			thread_ = NULL;
		}

		if (event_out_ != NULL)
		{
			::CloseHandle(event_out_);
			event_out_ = NULL;
		}

		if (compport_ != NULL)
		{
			::CloseHandle(compport_);
			compport_ = NULL;
		}
	}

	void websocket_thread::push_in(websocket_message_in&& _message)
	{
		{
			std::lock_guard<std::mutex> lock(mtx_in_);
			q_in_.push(std::move(_message));
		}

		if (thread_ != NULL && compport_ != NULL)
		{
			::PostQueuedCompletionStatus(compport_, 1, 0, NULL);
		}
	}

	void websocket_thread::push_out(websocket_message_out&& _message)
	{
		{
			std::lock_guard<std::mutex> lock(mtx_out_);
			q_out_.push(std::move(_message));
		}

		if (event_out_ != NULL)
		{
			::SetEvent(event_out_);
		}
	}

	std::queue<websocket_message_in> websocket_thread::pull_q_in()
	{
		std::queue<websocket_message_in> q;
		{
			std::lock_guard<std::mutex> lock(mtx_in_);
			q.swap(q_in_);
		}
		return q;
	}

	std::queue<websocket_message_out> websocket_thread::pull_q_out()
	{
		std::queue<websocket_message_out> q;
		{
			std::lock_guard<std::mutex> lock(mtx_out_);
			q.swap(q_out_);
		}
		return q;
	}

	void websocket_thread::push_out_get_stats(uint64_t _conn_count, uint64_t _recv_count, uint64_t _send_count)
	{
		push_out(websocket_message_out_get_stats{ _conn_count, _recv_count, _send_count });
	}

	void websocket_thread::push_out_recv_binary(SOCKET _sock, std::vector<uint8_t>&& _data)
	{
		push_out(websocket_message_out_recv_binary{ _sock, std::move(_data) });
	}

	void websocket_thread::ping()
	{
		push_in(websocket_message_in_ping{});
	}

	void websocket_thread::get_stats()
	{
		push_in(websocket_message_in_get_stats{});
	}

	void websocket_thread::send_binary(SOCKET _sock, std::vector<uint8_t>&& _data)
	{
		push_in(websocket_message_in_send_binary{ _sock, std::move(_data) });
	}
}
