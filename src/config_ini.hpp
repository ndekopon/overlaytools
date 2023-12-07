#pragma once

#include "common.hpp"

#include <string>

namespace app
{

	class config_ini
	{
	private:
		std::wstring path_;

		std::string get_ip_address(const std::wstring& _section, const std::wstring& _key, const std::wstring& _default);
		bool set_ip_address(const std::wstring& _section, const std::wstring& _key, const std::string& _ip);
		uint16_t get_uint16(const std::wstring& _section, const std::wstring& _key, uint16_t _num);
		bool set_uint16(const std::wstring& _section, const std::wstring& _key, uint16_t _num);

	public:
		config_ini();
		~config_ini();

		// LiveAPI側の設定
		std::string get_liveapi_ipaddress();
		bool set_liveapi_ipaddress(const std::string& _ip);
		uint16_t get_liveapi_port();
		bool set_liveapi_port(uint16_t _port);

		// WebAPI側の設定
		std::string get_webapi_ipaddress();
		bool set_webapi_ipaddress(const std::string& _ip);
		uint16_t get_webapi_port();
		bool set_webapi_port(uint16_t _port);
		uint16_t get_webapi_maxconnection();
		bool set_webapi_maxconnection(uint16_t _maxcon);

		// 画面キャプチャ設定
		std::wstring get_monitor();
		bool set_monitor(const std::wstring& _monitor);
	};
}
