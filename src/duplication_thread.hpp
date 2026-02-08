#pragma once

#include "common.hpp"

#include <mutex>
#include <vector>
#include <string>

namespace app {

	struct duplication_stats
	{
		uint64_t fps = 0;
		uint64_t total = 0;
		uint64_t skipped = 0;
		uint64_t exited = 0;
	};

	class duplication_thread
	{
	private:
		HWND window_;
		HANDLE thread_;
		HANDLE event_close_;
		HANDLE event_capture_;
		HANDLE event_stats_;
		HANDLE event_get_monitors_;
		HANDLE event_set_monitor_;
		std::mutex mtx_stats_;
		duplication_stats stats_;
		std::mutex mtx_buffer_;
		std::vector<uint32_t> buffer_;
		std::mutex mtx_monitor_;
		std::wstring monitor_;
		std::vector<std::wstring> monitors_;

		static DWORD WINAPI proc_common(LPVOID);
		DWORD proc();

		std::wstring get_monitor();

	public:
		duplication_thread();
		~duplication_thread();

		// コピー不可
		duplication_thread(const duplication_thread&) = delete;
		duplication_thread& operator = (const duplication_thread&) = delete;
		// ムーブ不可
		duplication_thread(duplication_thread&&) = delete;
		duplication_thread& operator = (duplication_thread&&) = delete;

		bool run(HWND);
		void stop();

		std::vector<std::wstring> get_monitors();
		std::vector<std::uint32_t> get_buffer();
		duplication_stats get_stats();

		void request_set_monitor(const std::wstring& _monitor);
		void request_get_monitors();
		void request_capture();
		void request_stats();
	};
}
