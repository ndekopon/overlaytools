#pragma once

#include "common.hpp"

namespace app {

	constexpr DWORD LOG_LIVEAPI = 0;
	constexpr DWORD LOG_CORE = 1;
	constexpr DWORD LOG_WEBAPI = 2;
	constexpr DWORD LOG_LOCAL = 3;
	constexpr DWORD LOG_DUPLICATION = 4;
	constexpr DWORD LOG_HTTP_GET = 5;

	void log(DWORD _id, const wchar_t* _str, ...);

	class log_thread
	{
	private:
		HANDLE thread_;
		HANDLE event_close_;

		static DWORD WINAPI proc_common(LPVOID);
		DWORD proc();

	public:
		log_thread();
		~log_thread();

		// コピー不可
		log_thread(const log_thread&) = delete;
		log_thread& operator = (const log_thread&) = delete;
		// ムーブ不可
		log_thread(log_thread&&) = delete;
		log_thread& operator = (log_thread&&) = delete;

		bool run();
		void stop();
	};
}
