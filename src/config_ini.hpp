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
		uint16_t get_uint16(const std::wstring& _section, const std::wstring& _key, uint16_t _num);

	public:
		config_ini();
		~config_ini();

		// LiveAPI側の設定
		std::string get_liveapi_ipaddress();
		uint16_t get_liveapi_port();

		// WebAPI側の設定
		std::string get_webapi_ipaddress();
		uint16_t get_webapi_port();
		uint16_t get_webapi_maxconnection();
	};
}
