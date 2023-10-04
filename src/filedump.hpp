#pragma once

#include "common.hpp"

#include <mutex>
#include <memory>
#include <vector>
#include <queue>

namespace app {
	class filedump {
	private:
		HANDLE thread_;
		HANDLE event_close_;
		HANDLE event_reset_;
		HANDLE event_push_;
		std::mutex mtx_;
		std::queue<std::unique_ptr<std::vector<uint8_t>>> q_;

		static DWORD WINAPI proc_common(LPVOID);
		DWORD proc();

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
		void push(std::unique_ptr<std::vector<uint8_t>> &&_data);
		void reset();
		void stop();
	};
}
