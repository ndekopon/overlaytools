#include "config_ini.hpp"

#include "utils.hpp"

#include <vector>

#include <ws2tcpip.h>

#pragma comment(lib, "Ws2_32.lib")

namespace {
	const WCHAR ini_name[] = L"apexliveapi_proxy.ini";

	bool check_ip_address(const std::wstring& _ip)
	{
		IN_ADDR addr;
		auto rc = ::InetPtonW(AF_INET, _ip.c_str(), &addr);
		if (rc == 1) return true;
		return false;
	}
}


namespace app {

	const WCHAR liveapi_section_name[] = L"LIVEAPI";
	const WCHAR webapi_section_name[] = L"WEBAPI";

	config_ini::config_ini()
		: path_(get_exe_directory() + L"\\" + ini_name)
	{
	}

	config_ini::~config_ini()
	{
	}

	std::string config_ini::get_ip_address(const std::wstring& _section, const std::wstring& _key, const std::wstring& _default)
	{
		std::vector<WCHAR> buffer(32767, L'\0');
		auto readed = ::GetPrivateProfileStringW(_section.c_str(), _key.c_str(), _default.c_str(), buffer.data(), buffer.size(), path_.c_str());
		if (readed > 15) return ws_to_s(_default);
		if (check_ip_address(buffer.data()))
		{
			return ws_to_s(buffer.data());
		}
		return ws_to_s(_default);
	}

	std::uint16_t config_ini::get_uint16(const std::wstring& _section, const std::wstring& _key, uint16_t _default)
	{
		auto value = ::GetPrivateProfileIntW(_section.c_str(), _key.c_str(), _default, path_.c_str());
		if (value <= 1024) return _default;
		if (value > UINT16_MAX) return _default;
		return (value & 0xFFFFui16);
	}


	std::string config_ini::get_liveapi_ipaddress()
	{
		return get_ip_address(liveapi_section_name, L"IP", L"127.0.0.1");
	}

	uint16_t config_ini::get_liveapi_port()
	{
		return get_uint16(liveapi_section_name, L"PORT", 20080);
	}

	std::string config_ini::get_webapi_ipaddress()
	{
		return get_ip_address(webapi_section_name, L"IP", L"127.0.0.1");
	}
	
	uint16_t config_ini::get_webapi_port()
	{
		return get_uint16(webapi_section_name, L"PORT", 20081);
	}

	uint16_t config_ini::get_webapi_maxconnection()
	{
		return get_uint16(webapi_section_name, L"CONNECTIONS", 16);
	}
}
