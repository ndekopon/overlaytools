#pragma once

#include "common.hpp"

#include <mutex>
#include <vector>
#include <queue>
#include <cstdint>
#include <variant>

namespace app {

	struct filedump_message_in_close
	{
	};

	struct filedump_message_in_reset
	{
	};

	struct filedump_message_in_append
	{
		std::vector<uint8_t> data;
	};

	using filedump_message_in = std::variant<
		filedump_message_in_close,
		filedump_message_in_reset,
		filedump_message_in_append
	>;

	class filedump {
	private:
		HANDLE thread_;
		HANDLE event_in_;
		std::mutex mtx_in_;
		std::queue<filedump_message_in> q_in_;

		static DWORD WINAPI proc_common(LPVOID);
		DWORD proc();

		void push_in(filedump_message_in&& _msg);

		std::queue<filedump_message_in> pull_q_in();

	public:
		filedump();
		~filedump();

		// コピー不可
		filedump(const filedump&) = delete;
		filedump& operator = (const filedump&) = delete;
		// ムーブ不可
		filedump(filedump&&) = delete;
		filedump& operator = (filedump&&) = delete;

		bool run();
		void stop();

		void append(std::vector<uint8_t>&& _data);
		void reset();
	};
}
