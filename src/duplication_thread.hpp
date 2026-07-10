#pragma once

#include "common.hpp"

#include <mutex>
#include <vector>
#include <string>
#include <variant>
#include <queue>

namespace app {

	struct duplication_stats
	{
	};

	struct duplication_message_in_capture
	{
	};

	struct duplication_message_in_get_stats
	{
	};

	struct duplication_message_in_get_monitors
	{
	};

	struct duplication_message_in_set_monitor
	{
		std::wstring monitor;
	};

	using duplication_message_in = std::variant<
		duplication_message_in_capture,
		duplication_message_in_get_stats,
		duplication_message_in_get_monitors,
		duplication_message_in_set_monitor
	>;

	struct duplication_message_out_capture
	{
		DWORD width = 0;
		DWORD height = 0;
		std::vector<uint32_t> buffer;
	};

	struct duplication_message_out_get_stats
	{
		uint64_t fps = 0;
		uint64_t total = 0;
		uint64_t skipped = 0;
		uint64_t exited = 0;
	};

	struct duplication_message_out_get_monitors
	{
		std::vector<std::wstring> monitors;
	};

	struct duplication_message_out_banner_state
	{
		bool state;
	};

	struct duplication_message_out_map_state
	{
		bool state;
	};

	using duplication_message_out = std::variant<
		duplication_message_out_capture,
		duplication_message_out_get_stats,
		duplication_message_out_get_monitors,
		duplication_message_out_banner_state,
		duplication_message_out_map_state
	>;


	class duplication_thread
	{
	private:
		HWND window_;
		HANDLE thread_;
		HANDLE event_close_;
		HANDLE event_in_;
		std::mutex mtx_in_;
		std::mutex mtx_out_;
		std::queue<duplication_message_in> q_in_;
		std::queue<duplication_message_out> q_out_;

		static DWORD WINAPI proc_common(LPVOID);
		DWORD proc();

		void push_in(duplication_message_in&& _msg);
		void push_out(duplication_message_out&& _msg);

		std::queue<duplication_message_in> pull_q_in();

	public:
		duplication_thread();
		~duplication_thread();

		// コピー不可
		duplication_thread(const duplication_thread&) = delete;
		duplication_thread& operator = (const duplication_thread&) = delete;
		// ムーブ不可
		duplication_thread(duplication_thread&&) = delete;
		duplication_thread& operator = (duplication_thread&&) = delete;

		bool run(HWND _window);
		void stop();

		std::queue<duplication_message_out> pull_q_out();

		void set_monitor(const std::wstring& _monitor);
		void get_monitors();
		void capture();
		void get_stats();
	};
}
