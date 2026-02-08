#pragma once

#include "common.hpp"

#include "shared_context.hpp"

#include <array>
#include <string>

namespace app
{

	class websocket_thread
	{
	private:
		DWORD logid_;
		DWORD ctxid_;
		shared_context& ctx_;
		const std::string ip_;
		const uint16_t port_;
		const uint16_t maxconn_;
		HWND window_;
		HANDLE thread_;
		HANDLE compport_;

		static DWORD WINAPI proc_common(LPVOID);
		DWORD proc();
	public:
		websocket_thread(DWORD _logid, DWORD _ctxid, shared_context &_ctx,  const std::string &_ip, uint16_t _port, uint16_t _maxconn);
		~websocket_thread();

		// コピー不可
		websocket_thread(const websocket_thread&) = delete;
		websocket_thread& operator = (const websocket_thread&) = delete;
		// ムーブ不可
		websocket_thread(websocket_thread&&) = delete;
		websocket_thread& operator = (websocket_thread&&) = delete;

		bool run(HWND);
		void ping();
		void tell_wq();
		void get_stats();
		void stop();
	};
}
