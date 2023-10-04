﻿#pragma once

#include "common.hpp"

#include <array>
#include <mutex>
#include <queue>
#include <memory>
#include <vector>
#include <utility>


namespace app {

	using ctx_buffer_t = std::unique_ptr<std::vector<uint8_t>>;
	using ctx_data_t = std::unique_ptr<std::pair<SOCKET, ctx_buffer_t>>;
	using ctx_queue_t = std::queue<ctx_data_t>;

	constexpr DWORD CTX_LIVEAPI = 0;
	constexpr DWORD CTX_WEBAPI = 1;

	class shared_context {
	private:
		std::array<std::mutex, 2> rmtx_;
		std::array<ctx_queue_t, 2> rq_;
		std::array<std::mutex, 2> wmtx_;
		std::array<ctx_queue_t, 2> wq_;

	public:
		std::array<HANDLE, 2> revent_;

		shared_context();
		~shared_context();

		// コピー不可
		shared_context(const shared_context&) = delete;
		shared_context& operator = (const shared_context&) = delete;
		// ムーブ不可
		shared_context(shared_context&&) = delete;
		shared_context& operator = (shared_context&&) = delete;

		bool init();

		// called by websocket
		void push_rq(DWORD _id, ctx_data_t&&_data);
		std::unique_ptr<ctx_queue_t> pull_wq(DWORD _id);

		// called by core
		void push_wq(DWORD _id, ctx_data_t&& _data);
		std::unique_ptr<ctx_queue_t> pull_rq(DWORD _id);
	};
}
