﻿#include "websocket_server.hpp"

#include "log.hpp"

#include "sha1.hpp"
#include "utils.hpp"

#include <array>
#include <cstring>
#include <sstream>
#include <regex>

#include <Ws2tcpip.h>
#include <mswsock.h>

#pragma comment(lib, "Ws2_32.lib")
#pragma comment(lib, "Mswsock.lib")

namespace {
	constexpr auto BACKLOG = 16;
	constexpr auto WS_BUFFER_READ_SIZE = 64 * 1024;

	const std::array<bool, 0x80> http_available_ascii_codes = {
		0, 0, 0, 0, 0, 0, 0, 0,
		0, 1, 1, 0, 0, 1, 0, 0, // \t, \n, \r
		0, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0,
		1, 1, 1, 1, 1, 1, 1, 1,
		1, 1, 1, 1, 1, 1, 1, 1,
		1, 1, 1, 1, 1, 1, 1, 1,
		1, 1, 1, 1, 1, 1, 1, 1,
		1, 1, 1, 1, 1, 1, 1, 1,
		1, 1, 1, 1, 1, 1, 1, 1,
		1, 1, 1, 1, 1, 1, 1, 1,
		1, 1, 1, 1, 1, 1, 1, 1,
		1, 1, 1, 1, 1, 1, 1, 1,
		1, 1, 1, 1, 1, 1, 1, 1,
		1, 1, 1, 1, 1, 1, 1, 1,
		1, 1, 1, 1, 1, 1, 1, 0
	};

	inline std::string trim(const std::string& s)
	{
		auto a = s.find_first_not_of(" \t\r\n");
		if (a == std::string::npos) return "";
		auto b = s.find_last_not_of(" \t\r\n");
		return s.substr(a, b - a + 1);
	}

	bool check_ascii(const std::string& _s, DWORD _logid)
	{
		for (const auto c : _s)
		{
			if (c > 0x7f || !http_available_ascii_codes.at(c))
			{
				app::log(_logid, L"Error: Invalid char is %d.", (DWORD)c);
				return false;
			}
		}
		return true;
	}

	auto parse_request_line(std::string _s)
	{
		struct return_value {
			std::string method;
			std::string requesttarget;
			std::string httpversion;
		} rv = {
			"",
			"",
			""
		};
		_s = trim(_s);

		std::smatch m;
		if (std::regex_match(_s, m, std::regex(R"(^([^ ]+) ([^ ]+) ([^ ]+)$)")))
		{
			rv.method = m[1].str();
			rv.requesttarget = m[2].str();
			rv.httpversion = m[3].str();
		}
		return rv;
	}

	auto parse_header(std::string line)
	{
		struct return_value {
			std::string key;
			std::string value;
		} rv = {
			"",
			""
		};

		line = trim(line);
		auto index = line.find(':', 0);
		if (index != std::string::npos) {
			rv.key = trim(line.substr(0, index));
			rv.value = trim(line.substr(index + 1));
		}

		return rv;
	}
}

namespace app {

	std::wstring get_remote_ipport(LPVOID _buffer, DWORD _len)
	{
		wchar_t s[INET_ADDRSTRLEN] = {L'\0'};
		DWORD slen = INET_ADDRSTRLEN;


		SOCKADDR_IN* l;
		SOCKADDR_IN* r;
		INT llen = sizeof(SOCKADDR_IN);
		INT rlen = sizeof(SOCKADDR_IN); r->sin_addr;
		::GetAcceptExSockaddrs(_buffer, _len, llen + 16, rlen + 16, reinterpret_cast<sockaddr **>(&l), &llen, reinterpret_cast<sockaddr**>(&r), &rlen);

		::WSAAddressToStringW((SOCKADDR *)r, rlen, NULL, s, &slen);
		return s;
		;

	}

	wspacket::wspacket()
		: header_readed(0)
		, mask_index(0)
		, len(0)
		, exlen(0)
		, mask(false)
		, masking_key({ 0 })
		, fin(true)
		, rsv1(false)
		, rsv2(false)
		, rsv3(false)
		, opcode(0xff)
		, data(std::make_unique<std::vector<uint8_t>>())
	{
	}

	wspacket::~wspacket()
	{
	}

	bool wspacket::parse(const std::vector<uint8_t>& in, size_t inlen, size_t offset, size_t& remain) noexcept
	{
		bool filled = false;
		size_t readed = 0;
		for (auto i = offset; i < inlen; ++i)
		{
			const auto& d = in.at(i);
			if (header_readed < 2)
			{
				if (header_readed == 0)
				{
					fin = (d & 0x80) > 0;
					rsv1 = (d & 0x40) > 0;
					rsv2 = (d & 0x20) > 0;
					rsv3 = (d & 0x10) > 0;
					opcode = d & 0x0f;
				}
				else if (header_readed == 1)
				{
					mask = (d & 0x80) > 0;
					len = d & 0x7f;
					if (len < 0x7e)
					{
						data->reserve(len);
					}
				}
				header_readed++;
			}
			else if (len == 0x7e && header_readed < 4)
			{
				exlen <<= 8;
				exlen |= d;
				if (header_readed == 3)
				{
					data->reserve(exlen);
				}
				header_readed++;
			}
			else if (len == 0x7f && header_readed < 10)
			{
				exlen <<= 8;
				exlen |= d;
				if (header_readed == 9)
				{
					data->reserve(exlen);
				}
				header_readed++;
			}
			else if (mask && mask_index < 4)
			{
				masking_key.at(mask_index) = d;
				mask_index++;
				header_readed++;
			}
			else if (data->size() < payload_length())
			{
				if (mask)
				{
					data->push_back(d ^ masking_key.at(data->size() % masking_key.size()));
				}
				else
				{
					data->push_back(d);
				}
			}

			++readed;

			if (header_length() == header_readed && payload_length() == data->size())
			{
				filled = true;
				break;
			}
		}
		remain = inlen - (offset + readed);
		if (filled) return true;
		return false;
	}

	uint64_t wspacket::header_length() const noexcept
	{
		uint64_t hlen = 2;
		if (len > 0x7d) hlen += 2;
		if (exlen > 0xffff) hlen += 6;
		if (mask) hlen += 4;
		return hlen;
	}

	uint64_t wspacket::payload_length() const noexcept
	{
		if (len >= 0x7e) {
			return exlen;
		}
		return len;
	}

	bool wspacket::filled() const noexcept
	{
		if (opcode == 0xff) return false;
		if (!data) return false;
		return data->size() == payload_length();
	}

	websocket_server::websocket_server(const std::string address, uint16_t port, uint16_t maxconn, DWORD _logid)
		: listen_address(address)
		, listen_port(port)
		, addr_buffer()
		, accept_ctx()
		, sock(-1)
		, wsconns(maxconn)
		, logid_(_logid)
	{
		for (auto& x : wsconns)
		{
			x.ior_ctx.rbuf.resize(WS_BUFFER_READ_SIZE);
			x.ior_ctx.buf.buf = reinterpret_cast<CHAR*>(x.ior_ctx.rbuf.data());
			x.ior_ctx.buf.len = x.ior_ctx.rbuf.size();
			x.ior_ctx.type = WS_TCP_RECV;
		}
	}

	websocket_server::~websocket_server() {
		for (auto& x : wsconns) if (x.sock != INVALID_SOCKET) ::closesocket(x.sock);
		if (sock != INVALID_SOCKET) ::closesocket(sock);
	}

	bool websocket_server::socket()
	{
		sock = ::WSASocketW(AF_INET, SOCK_STREAM, IPPROTO_IP, NULL, 0, WSA_FLAG_OVERLAPPED);
		if (sock == INVALID_SOCKET)
		{
			log(logid_, L"Error: WSASocket() failed. ErrorCode=%d", ::WSAGetLastError());
			return false;
		}
		return true;
	}

	bool websocket_server::bind()
	{
		struct sockaddr_in addr;
		addr.sin_family = AF_INET;
		addr.sin_port = htons(listen_port);
		::inet_pton(AF_INET, listen_address.c_str(), &addr.sin_addr.s_addr);
		if (::bind(sock, (struct sockaddr*)&addr, sizeof(addr)) != 0)
		{
			log(logid_, L"Error: bind() failed. ErrorCode=%d", ::WSAGetLastError());
			return false;
		}
		return true;
	}

	bool websocket_server::listen()
	{
		if (::listen(sock, 16) != 0)
		{
			log(logid_, L"Error: listen() failed. ErrorCode=%d", ::WSAGetLastError());
			return false;
		}
		return true;
	}

	bool websocket_server::insert(SOCKET _sock)
	{
		for (auto& x : wsconns)
		{
			if (x.sock == INVALID_SOCKET)
			{
				x.sock = _sock;
				x.handshake = 0;
				return true;
			}
		}
		return false;
	}

	void websocket_server::broadcast(std::shared_ptr<std::vector<uint8_t>> &_data)
	{
		for (const auto& x : wsconns)
		{
			if (x.sock != INVALID_SOCKET && x.handshake == true)
			{
				send(x.sock, _data);
			}
		}
	}

	bool websocket_server::response(wsconn_t& wsconn, const std::vector<uint8_t>& data, int len)
	{
		std::istringstream req(reinterpret_cast<const char*>(data.data()));
		bool firstline = true;
		std::string line;
		std::string key = "";
		std::string magic = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

		while (std::getline(req, line) && line != "\r")
		{
			if (!check_ascii(line, logid_))
			{
				log(logid_, L"Error: http header contains invalid ascii.");
				return false;
			}
			if (firstline)
			{
				auto [method, requesttarget, httpversion] = parse_request_line(line);
				log(logid_, L"Info: << %s", s_to_ws(line).c_str());
				if (method != "GET" || httpversion != "HTTP/1.1")
				{
					log(logid_, L"Error: Method or HTTP-Version mismatch. method=%s,httpversion=%s", s_to_ws(method).c_str(), s_to_ws(httpversion).c_str());
					return false;
				}
				firstline = false;
			}
			else
			{
				auto [k, v] = parse_header(line);
				if (k == "Sec-WebSocket-Key")
					key = v;
				if (k != "" && v != "")
				{
					log(logid_, L"Info: << %s: %s", s_to_ws(k).c_str(), s_to_ws(v).c_str());
				}
				else
				{
					log(logid_, L"Info: << %s", s_to_ws(line).c_str());
				}
			}
		}

		if (key == "") return false;

		// SHA1計算
		sha1_t sha1;
		if (!get_sha1(key + magic, sha1))
		{
			log(logid_, L"Error: response get_sha1() failed.");
			return false;
		}

		// base64エンコード
		auto b64 = base64encode_from_sha1(sha1);
		log(logid_, L"Info: >> Sec-WebSocket-Accept: %s", s_to_ws(b64).c_str());

		std::string res = "HTTP/1.1 101 Switching Protocols\r\n"
			"Upgrade: websocket\r\n"
			"Connection: Upgrade\r\n"
			"Sec-WebSocket-Accept: " + b64 + "\r\n\r\n";

		auto buf = std::make_shared<std::vector<uint8_t>>(
			reinterpret_cast<const uint8_t*>(res.c_str()), reinterpret_cast<const uint8_t*>(res.c_str()) + res.length());
		if (!send(wsconn.sock, buf))
		{
			log(logid_, L"Error: send() failed.");
			return false;
		}

		// handshake完了
		wsconn.handshake = true;

		return true;
	}

	void websocket_server::pong(wsconn_t& wsconn, const uint8_t* data, int len) {
		// FINがない
		if ((data[0] & 0x80) == 0) return;

		// PINGじゃない
		char opcode = data[0] & 0xf;
		if (opcode != 0x9) return;

		// opcodeだけ変えて返送
		auto buf = std::make_shared<std::vector<uint8_t>>(data, data + len);
		buf->at(0) = ((buf->at(0) & 0xf0) | 0xa);
		send(wsconn.sock, buf);
	}

	bool websocket_server::prepare() {
		if (!socket()) return false;
		if (!bind()) return false;
		if (!listen()) return false;
		log(logid_, L"Info: listen websocket server at %s:%d", s_to_ws(listen_address).c_str(), listen_port);
		return true;
	}

	size_t websocket_server::count() const noexcept
	{
		size_t i = 0;
		for (const auto& x : wsconns)
			if (x.sock != INVALID_SOCKET) i++;
		return i;
	}

	bool websocket_server::acceptex()
	{
		accept_ctx.sock = ::WSASocketW(AF_INET, SOCK_STREAM, IPPROTO_IP, NULL, 0, WSA_FLAG_OVERLAPPED);
		accept_ctx.data = addr_buffer;
		DWORD received;

		auto rc = ::AcceptEx(sock, accept_ctx.sock, addr_buffer, 0,
			sizeof(SOCKADDR_IN) + 16, sizeof(SOCKADDR_IN) + 16, NULL, &accept_ctx.ov);

		if (rc == TRUE)
		{
			return true;
		}

		auto error = ::WSAGetLastError();
		if (error != ERROR_IO_PENDING)
		{
			log(logid_, L"Error: AcceptEx() failed. ErrorCode=", error);
			return false;
		}

		return true;
	}


	bool websocket_server::send(SOCKET _sock, std::shared_ptr<std::vector<uint8_t>>& _data)
	{
		for (auto& x : wsconns)
		{
			if (x.sock != _sock) continue;
			
			// キューに追加
			if (_data) x.wq.push(_data);

			if (x.iow_ctx.wbuf) return true; // 既に送信中

			if (x.wq.size() == 0) return true; // キューが空になった

			// キューの先頭から取り出し
			x.iow_ctx.wbuf = x.wq.front();
			x.wq.pop();

			if (!x.iow_ctx.wbuf) return true; // 送信要求データが空

			// バッファに情報を格納
			std::memset(&x.iow_ctx.ov, 0, sizeof(WSAOVERLAPPED));
			x.iow_ctx.sock = _sock;
			x.iow_ctx.buf.buf = reinterpret_cast<CHAR*>(x.iow_ctx.wbuf->data());
			x.iow_ctx.buf.len = x.iow_ctx.wbuf->size();
			x.iow_ctx.type = WS_TCP_SEND;

			auto rc = ::WSASend(x.sock, &x.iow_ctx.buf, 1, nullptr, 0, &x.iow_ctx.ov, nullptr);
			if (rc == 0)
			{
				return true;
			}
				
			auto error = ::WSAGetLastError();
			if (error != ERROR_IO_PENDING)
			{
				// その他エラー
				log(logid_, L"Error: WSASend() failed. ErrorCode=%d", error);
				close(_sock);
				return false;
			}
			return true;
		}
		return false;
	}

	bool websocket_server::read(SOCKET _sock)
	{
		for (auto& x : wsconns)
		{
			if (x.sock != _sock) continue;

			// バッファに情報を格納
			std::memset(&x.ior_ctx.ov, 0, sizeof(WSAOVERLAPPED));
			x.ior_ctx.sock = _sock;

			DWORD flags = 0;
			auto rc = ::WSARecv(_sock, &x.ior_ctx.buf, 1, NULL, &flags, &x.ior_ctx.ov, NULL);
			if (rc == 0)
			{
				return true;
			}
			
			auto error = ::WSAGetLastError();
			if (error != WSA_IO_PENDING)
			{
				log(logid_, L"Error: WSARecv() failed. ErrorCode=%d", error);
				close(_sock);
				return false;
			}

			return true;
		}

		log(logid_, L"Error: read() invalid socket.");
		return false;
	}

	void websocket_server::send_binary(SOCKET _sock, const std::vector<uint8_t>& _data, size_t _len)
	{
		/* ヘッダサイズを決める */
		size_t header_size = 2;
		if (_len > 0xffff) header_size = 10;
		else if (_len > 0x7d) header_size = 4;

		/* メモリを確保 */
		auto sbuf = std::make_shared<std::vector<uint8_t>>();
		sbuf->resize(_len + header_size);

		/* ヘッダ格納 */
		sbuf->at(0) = 0x82;
		if (_len > 0xffff) {
			sbuf->at(1) = 0x7f;
			uint64_t be64len = _byteswap_uint64(_len);
			std::memcpy(&sbuf->at(2), &be64len, 8);
		}
		else if (_len > 0x7d) {
			sbuf->at(1) = 0x7e;
			uint16_t be16len = _byteswap_ushort(_len);
			std::memcpy(&sbuf->at(2), &be16len, 2);
		}
		else {
			sbuf->at(1) = (_len & 0x7F);
		}

		/* ペイロードコピー */
		std::copy(_data.begin(), _data.begin() + _len, sbuf->begin() + header_size);

		/* 送信 */
		if (_sock == INVALID_SOCKET)
		{
			broadcast(sbuf);
		}
		else
		{
			send(_sock, sbuf);
		}
	}

	void websocket_server::broadcast_binary(const std::vector<uint8_t>& _data, size_t _len)
	{
		send_binary(INVALID_SOCKET, _data, _len);
	}

	void websocket_server::broadcast_ping()
	{
		auto data = std::make_shared<std::vector<uint8_t>>();
		data->push_back(0x89);
		data->push_back(0x00);
		broadcast(data);
	}

	bool websocket_server::contains(SOCKET _sock) const noexcept
	{
		for (const auto& x : wsconns) {
			if (x.sock == _sock) return true;
		}
		return false;
	}

	void websocket_server::close(SOCKET _sock)
	{
		for (auto& x : wsconns) {
			if (x.sock == _sock) {
				::closesocket(_sock);
				x.sock = INVALID_SOCKET;
				x.handshake = false;
				x.buffer = nullptr;
				x.packet = nullptr;
				x.ior_ctx.wbuf = nullptr;
				x.iow_ctx.wbuf = nullptr;
				while (x.wq.size() > 0)
				{
					x.wq.pop();
				}
				log(logid_, L"Info: close socket = %d", _sock);
				return;
			}
		}
		log(logid_, L"Info: close() ignored. socket(%d) not found.", _sock);
	}

	std::queue<std::unique_ptr<std::vector<uint8_t>>> websocket_server::receive_data(SOCKET _sock, const std::vector<uint8_t>& _data, int _len)
	{
		// 入力データの出力
		log(logid_, L"Info: sock=%d,len=%d", _sock, _len);
		std::queue<std::unique_ptr<std::vector<uint8_t>>> r;
		
		for (auto& x : wsconns)
		{
			if (x.sock != _sock) continue;

			/* handshake未実施の場合は実施 */
			if (x.handshake == 0)
			{
				// handshake実施
				if (!response(x, _data, _len))
				{
					log(logid_, L"Error: response() failed.");
					close(_sock);
				}
				return r;
			}

			int offset = 0;
			size_t remain = _len;
			while (remain)
			{
				if (x.packet == nullptr)
				{
					x.packet.reset(new wspacket());
				}
				if (x.packet->parse(_data, _len, offset, remain))
				{

					if (x.packet && x.packet->filled())
					{
						std::unique_ptr<wspacket> packet = std::move(x.packet);

						// パケット情報出力
						log(logid_, L"Info: sock=%d,opcode=%d,fin=%d,len=%d,remain=%d", _sock, packet->opcode, packet->fin ? 1 : 0, packet->payload_length(), remain);

						switch (packet->opcode)
						{
						case 0x0: // 継続フレーム
							if (x.buffer != nullptr)
							{
								x.buffer->reserve(x.buffer->size() + packet->data->size());
								x.buffer->insert(x.buffer->end(), packet->data->begin(), packet->data->end());
								if (packet->fin)
								{
									r.push(std::move(x.buffer));
								}
							}
							break;
						case 0x1: // テキストフレーム
							x.buffer.reset(new std::vector<uint8_t>());
							break;
						case 0x2: // バイナリフレーム
							x.buffer.reset(new std::vector<uint8_t>());
							if (packet->fin)
							{
								/* 単独 */
								r.push(std::move(packet->data));
							}
							else
							{
								/* 継続 */
								x.buffer->reserve(x.buffer->size() + packet->data->size());
								x.buffer->insert(x.buffer->end(), packet->data->begin(), packet->data->end());
							}
							break;
						case 0xa: // pong
							// 何もしない
							break;
						case 0x9: // ping
							pong(x, _data.data() + offset, _len - offset - remain);
							break;
						case 0x8: // close
						{
							if (packet->data->size() >= 2)
							{
								uint16_t close_code = (packet->data->at(0) << 8) | packet->data->at(1);
								log(logid_, L"Info: close_code=%d", close_code);
							}
							::shutdown(_sock, SD_SEND);
						}
						return r;
						default:
							log(logid_, L"Error: invalid opcode.");
							close(_sock);
							return r;
						}
					}
				}
				else
				{
					log(logid_, L"Info: sock=%d,offset=%d,remain=%d", _sock, offset, remain);
					break;
				}
				offset = _len - remain;
			}
			break;
		}
		return r;
	}
}
