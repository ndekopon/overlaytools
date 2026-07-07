#pragma once

#include "common.hpp"

#include <string>
#include <variant>
#include <queue>
#include <mutex>
#include <vector>
#include <cstdint>

namespace app
{
	/* IN */
	struct websocket_message_in_send_binary
	{
		SOCKET sock;
		std::vector<uint8_t> data;
	};

	struct websocket_message_in_ping
	{
	};

	struct websocket_message_in_get_stats
	{
	};

	using websocket_message_in = std::variant<
		websocket_message_in_send_binary,
		websocket_message_in_ping,
		websocket_message_in_get_stats
	>;

	/* OUT */
	struct websocket_message_out_connected
	{
		SOCKET sock;
		std::wstring ipport;
	};

	struct websocket_message_out_disconnected
	{
		SOCKET sock;
	};

	struct websocket_message_out_recv_binary
	{
		SOCKET sock;
		std::vector<uint8_t> data;
	};

	struct websocket_message_out_get_stats
	{
		uint64_t conn_count;
		uint64_t recv_count;
		uint64_t send_count;
	};

	using websocket_message_out = std::variant<
		websocket_message_out_connected,
		websocket_message_out_disconnected,
		websocket_message_out_recv_binary,
		websocket_message_out_get_stats
	>;

	class websocket_thread
	{
	private:
		DWORD logid_;
		const std::string ip_;
		const uint16_t port_;
		const uint16_t maxconn_;
		HANDLE thread_;
		HANDLE compport_;
		HANDLE event_out_;
		std::mutex mtx_in_;
		std::queue<websocket_message_in> q_in_;
		std::mutex mtx_out_;
		std::queue<websocket_message_out> q_out_;

		static DWORD WINAPI proc_common(LPVOID);
		DWORD proc();

		void push_in(websocket_message_in&&);
		void push_out(websocket_message_out&&);

		std::queue<websocket_message_in> pull_q_in();

		void push_out_get_stats(uint64_t _conn_count, uint64_t _recv_count, uint64_t _send_count);
		void push_out_recv_binary(SOCKET _sock, std::vector<uint8_t>&& _data);

	public:
		websocket_thread(DWORD _logid, const std::string &_ip, uint16_t _port, uint16_t _maxconn);
		~websocket_thread();

		// コピー不可
		websocket_thread(const websocket_thread&) = delete;
		websocket_thread& operator = (const websocket_thread&) = delete;
		// ムーブ不可
		websocket_thread(websocket_thread&&) = delete;
		websocket_thread& operator = (websocket_thread&&) = delete;

		bool run();
		void ping();
		void get_stats();
		void send_binary(SOCKET _sock, std::vector<uint8_t>&& _data);
		void stop();

		HANDLE get_event_out() const { return event_out_; }
		std::queue<websocket_message_out> pull_q_out();
	};
}
