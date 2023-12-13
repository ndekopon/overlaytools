#pragma once

#include "common.hpp"

#include <memory>
#include <string>
#include <mutex>
#include <queue>

#include <winhttp.h>

namespace app
{
	bool check_stats_code(const std::string& _stats_code);

	struct http_get_queue_data
	{
		SOCKET sock = INVALID_SOCKET;
		uint32_t sequence = 0u;
		std::string code = "";
		uint32_t status_code = 0u;
		std::unique_ptr<std::string> json = nullptr;
	};

	using http_get_queue_data_t = std::unique_ptr<http_get_queue_data>;

	struct response_header {
		std::wstring data;
		DWORD code;
	};

	class http_get_thread {
	private:
		DWORD logid_;
		HINTERNET session_;
		HINTERNET connect_;
		HINTERNET request_;
		HANDLE thread_;
		HANDLE event_close_;
		HANDLE event_ping_;

		// winhttp callbackとのやり取り用
		HANDLE event_winhttp_;
		std::mutex available_mtx_;
		DWORD available_;
		std::mutex event_mtx_;
		std::queue<uint32_t> event_queue_;

		// 外部とのやり取り用
		std::mutex wqmtx_;
		std::mutex rqmtx_;
		HANDLE event_wq_;
		HANDLE event_rq_;
		std::queue<http_get_queue_data_t> wq_;
		std::queue<http_get_queue_data_t> rq_;


		static DWORD WINAPI proc_common(LPVOID);
		DWORD proc();

		bool proc_connect_and_request(const std::string& _stats_code);
		response_header proc_get_header();

		static void CALLBACK callback_common(HINTERNET _internet, DWORD_PTR _context, DWORD _internet_status, void* _status_info, DWORD _info_length);
		void callback(HINTERNET _internet, DWORD _internet_status, void* _status_info, DWORD _info_length);

		void push_wq(http_get_queue_data_t&& _data);

	public:
		http_get_thread(DWORD _logid);
		~http_get_thread();

		// コピー不可
		http_get_thread(const http_get_thread&) = delete;
		http_get_thread& operator = (const http_get_thread&) = delete;
		// ムーブ不可
		http_get_thread(http_get_thread&&) = delete;
		http_get_thread& operator = (http_get_thread&&) = delete;

		bool run();
		void stop();
		void ping();

		void get_stats_json(SOCKET _sock, uint32_t _sequence, const std::string& _stats_code);

		HANDLE get_event_wq();
		std::queue<http_get_queue_data_t> pull_wq();
	};
}
