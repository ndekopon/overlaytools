#include "websocket_thread.hpp"

#include "log.hpp"

#include "websocket_server.hpp"

namespace app {
	websocket_thread::websocket_thread(DWORD _logid, DWORD _ctxid, shared_context& _ctx, const std::string& _ip, uint16_t _port, uint16_t _maxconn)
		: logid_(_logid)
		, ctxid_(_ctxid)
		, ctx_(_ctx)
		, ip_(_ip)
		, port_(_port)
		, maxconn_(_maxconn)
		, window_(NULL)
		, thread_(NULL)
		, compport_(NULL)
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
		if (ws.prepare())
		{
			log(logid_, L"Info: websocket_server::prepare() success.");

			auto port = ::CreateIoCompletionPort((HANDLE)ws.sock, compport_, 0, 0);

			// 接続待ち
			if (!ws.acceptex())
			{
				log(logid_, L"Error: websocket_server::acceptex() failed.");
				return 0;
			}

			while (true)
			{
				DWORD transferred;
				ULONG_PTR compkey;
				LPOVERLAPPED ov;
				auto rc = ::GetQueuedCompletionStatus(compport_, &transferred, &compkey, &ov, INFINITE);
				if (rc == FALSE) continue;

				if (compkey == 0 && ov == NULL)
				{

					if (transferred == 0)
					{
						// 終了通知
						break;
					}
					else if (transferred == 1)
					{
						// PING通知
						ws.broadcast_ping();
					}
					else if (transferred == 2)
					{
						// wq到達
						auto wq = ctx_.pull_wq(ctxid_);
						while (wq->size() > 0)
						{
							auto q = std::move(wq->front());
							wq->pop();
							if (q)
							{
								log(logid_, L"Info: receive data from core thread. size=%zu", q->second->size());
								ws.send_binary(q->first, *(q->second), q->second->size());
							}
						}
					}
				}
				if (compkey == 0 && ov != NULL)
				{
					// ACCEPT
					WS_ACCEPT_CONTEXT *ctx = (WS_ACCEPT_CONTEXT*)ov;
					SOCKET sock = ctx->sock;
					auto ipport = get_remote_ipport(ctx->data, transferred);
					log(logid_, L"Info: connected from %s.", ipport.c_str());

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
					log(logid_, L"Info: ACCEPT called. sock=%d.", sock);

					::CreateIoCompletionPort((HANDLE)sock, compport_, (ULONG_PTR)ctx, 0);

					// 読込待ち
					if (!ws.read(sock))
					{
						log(logid_, L"Error: websocket_server::read() failed.");
					}
				}
				if (compkey != 0 && ov != NULL)
				{
					WS_ACCEPT_CONTEXT* ctx = (WS_ACCEPT_CONTEXT*)compkey;
					WS_IO_CONTEXT* ioctx = (WS_IO_CONTEXT*)ov;

					if (transferred == 0 && (ioctx->type == WS_TCP_RECV || ioctx->type == WS_TCP_SEND))
					{
						ws.close(ioctx->sock);
					}
					else if (ioctx->type == WS_TCP_RECV)
					{
						auto queue = ws.receive_data(ioctx->sock, ioctx->rbuf, transferred);
						while (queue.size() > 0)
						{
							auto data = std::make_unique<std::pair<SOCKET, ctx_buffer_t>>(std::make_pair(ioctx->sock, std::move(queue.front())));
							queue.pop();
							log(logid_, L"Info: read data size=%d", data->second->size());

							if (data)
							{
								// rqに渡す
								ctx_.push_rq(ctxid_, std::move(data));
							}
						}

						// 読込待ち
						if (!ws.read(ioctx->sock))
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
						if (!ws.send(ioctx->sock, empty))
						{
							log(logid_, L"Error: websocket_server::send() failed.");
						}
					}
				}
			}
		}
		log(logid_, L"Info: thread end.");

		return 0;
	}

	bool websocket_thread::run(HWND _window)
	{
		window_ = _window;

		// CompPort作成
		compport_ = ::CreateIoCompletionPort(INVALID_HANDLE_VALUE, NULL, 0, 0);
		if (compport_ == NULL)
		{
			log(logid_, L"Error: CreateIoCompletionPort() failed.");
			return false;
		}

		// スレッド起動
		thread_ = ::CreateThread(NULL, 0, proc_common, this, 0, NULL);
		return thread_ != NULL;
	}

	void websocket_thread::ping()
	{
		if (thread_ != NULL && compport_ != NULL)
		{
			::PostQueuedCompletionStatus(compport_, 1, 0, NULL);
		}
	}

	void websocket_thread::tell_wq()
	{
		if (thread_ != NULL && compport_ != NULL)
		{
			::PostQueuedCompletionStatus(compport_, 2, 0, NULL);
		}
	}

	void websocket_thread::stop()
	{
		if (thread_ != NULL)
		{
			::PostQueuedCompletionStatus(compport_, 0, 0, NULL);
			::WaitForSingleObject(thread_, INFINITE);
			thread_ = NULL;
		}

		if (compport_ != NULL)
		{
			::CloseHandle(compport_);
			compport_ = NULL;
		}
	}
}
