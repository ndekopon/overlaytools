#pragma once

#include "common.hpp"

#include <array>
#include <vector>
#include <string>
#include <cstdint>
#include <memory>
#include <queue>
#include <unordered_map>

namespace app {

	constexpr UINT WS_TCP_RECV = 1001;
	constexpr UINT WS_TCP_SEND = 1002;

	struct WS_ACCEPT_CONTEXT {
		WSAOVERLAPPED ov;
		SOCKET sock;
		char* data;
	};

	struct WS_IO_CONTEXT {
		WSAOVERLAPPED ov;
		SOCKET sock;
		WSABUF buf;
		UINT type;
		std::vector<uint8_t> rbuf;
		std::shared_ptr<std::vector<uint8_t>> wbuf;
	};

	std::wstring get_remote_ipport(LPVOID _buffer, DWORD _len);

	class wspacket {
	private:
		size_t header_readed;
		size_t mask_index;
		uint64_t len;
		uint64_t exlen;
		bool mask;
		std::array<uint8_t, 4> masking_key;

	public:
		bool fin;
		bool rsv1;
		bool rsv2;
		bool rsv3;
		uint16_t opcode;
		std::unique_ptr<std::vector<uint8_t>> data;

		wspacket();
		~wspacket();

		bool parse(const std::vector<uint8_t>& in, size_t inlen, size_t offset, size_t& remain) noexcept;
		uint64_t header_length() const noexcept;
		uint64_t payload_length() const noexcept;
		bool filled() const noexcept;
	};


	// handshake
	//   0: none
	//   1: handshaked
	struct wsconn_t {
		bool handshake;
		std::unique_ptr<wspacket> packet;
		std::unique_ptr<std::vector<uint8_t>> buffer;
		WS_IO_CONTEXT ior_ctx;
		WS_IO_CONTEXT iow_ctx;
		std::queue<std::shared_ptr<std::vector<uint8_t>>> wq;
		wsconn_t() : handshake(false), packet(nullptr), buffer(nullptr) {};
	};

	class websocket_server {
	private:
		std::string listen_address_;
		uint16_t listen_port_;
		char addr_buffer_[1024];
		WS_ACCEPT_CONTEXT accept_ctx_;
		DWORD logid_;
		uint16_t maxconn_;


		bool socket();
		bool bind();

		bool listen();

		void broadcast(std::shared_ptr<std::vector<uint8_t>>&_data);
		bool response(SOCKET _sock, const std::vector<uint8_t>& _data, int _len);
		void pong(SOCKET _sock, const uint8_t* _data, int _len);

	public:
		SOCKET sock_;
		std::unordered_map<SOCKET, wsconn_t> wsconns_;

		websocket_server(const std::string _address, uint16_t _port, uint16_t _maxconn, DWORD _logid);
		~websocket_server();

		size_t count() const noexcept;
		bool contains(SOCKET _sock) const noexcept;

		bool acceptex();
		bool send(SOCKET _sock, std::shared_ptr<std::vector<uint8_t>>& _data);
		bool read(SOCKET _sock);

		bool prepare();
		bool insert(SOCKET _sock);
		void close(SOCKET _sock);

		void send_binary(SOCKET _sock, const std::vector<uint8_t>& _data, size_t _len);
		void broadcast_binary(const std::vector<uint8_t>& _data, size_t _len);
		void broadcast_ping();

		std::queue<std::unique_ptr<std::vector<uint8_t>>> receive_data(SOCKET _sock, const std::vector<uint8_t>& data, int len);
	};
}
