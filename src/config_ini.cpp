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

	const WCHAR main_section_name[] = L"MAIN";
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

	bool config_ini::set_ip_address(const std::wstring& _section, const std::wstring& _key, const std::string& _ip)
	{
		auto wip = s_to_ws(_ip);
		if (!check_ip_address(wip))
		{
			return false;
		}
		return ::WritePrivateProfileStringW(_section.c_str(), _key.c_str(), wip.c_str(), path_.c_str()) == TRUE;
	}

	std::uint16_t config_ini::get_uint16(const std::wstring& _section, const std::wstring& _key, uint16_t _default)
	{
		auto value = ::GetPrivateProfileIntW(_section.c_str(), _key.c_str(), _default, path_.c_str());
		return (value & 0xFFFFui16);
	}

	bool config_ini::set_uint16(const std::wstring& _section, const std::wstring& _key, uint16_t _num)
	{
		return ::WritePrivateProfileStringW(_section.c_str(), _key.c_str(), std::to_wstring(_num).c_str(), path_.c_str()) == TRUE;
	}


	std::string config_ini::get_liveapi_ipaddress()
	{
		auto ip = get_ip_address(liveapi_section_name, L"IP", L"127.0.0.1");
		set_liveapi_ipaddress(ip); // 取得時に書き込み実施
		return ip;
	}

	bool config_ini::set_liveapi_ipaddress(const std::string& _ip)
	{
		return set_ip_address(liveapi_section_name, L"IP", _ip);
	}

	uint16_t config_ini::get_liveapi_port()
	{
		uint16_t port = get_uint16(liveapi_section_name, L"PORT", 20080);
		if (port <= 1024) port = 20080;
		set_liveapi_port(port); // 取得時に書き込み実施
		return port;
	}

	bool config_ini::set_liveapi_port(uint16_t _port)
	{
		if (_port <= 1024) return false;
		return set_uint16(liveapi_section_name, L"PORT", _port);
	}

	std::string config_ini::get_webapi_ipaddress()
	{
		auto ip = get_ip_address(webapi_section_name, L"IP", L"127.0.0.1");
		set_webapi_ipaddress(ip); // 取得時に書き込み実施
		return ip;
	}

	bool config_ini::set_webapi_ipaddress(const std::string& _ip)
	{ 
		return set_ip_address(webapi_section_name, L"IP", _ip);
	}
	
	uint16_t config_ini::get_webapi_port()
	{
		uint16_t port = get_uint16(webapi_section_name, L"PORT", 20081);
		if (port <= 1024) port = 20081;
		set_webapi_port(port); // 取得時に書き込み実施
		return port;
	}

	bool config_ini::set_webapi_port(uint16_t _port)
	{
		if (_port <= 1024) return false;
		return set_uint16(webapi_section_name, L"PORT", _port);
	}

	uint16_t config_ini::get_webapi_maxconnection()
	{
		uint16_t maxcon = get_uint16(webapi_section_name, L"CONNECTIONS", 16);
		if (maxcon == 0 || 64 < maxcon) maxcon = 16;
		set_webapi_maxconnection(maxcon); // 取得時に書き込み実施
		return maxcon;
	}

	bool config_ini::set_webapi_maxconnection(uint16_t _maxcon)
	{
		if (_maxcon == 0 || 64 < _maxcon) return false; // 0～64
		return set_uint16(webapi_section_name, L"CONNECTIONS", _maxcon);
	}

	std::wstring config_ini::get_monitor()
	{
		std::vector<WCHAR> buffer(512, L'\0');
		auto readed = ::GetPrivateProfileStringW(main_section_name, L"MONITOR", L"", buffer.data(), buffer.size(), path_.c_str());
		return buffer.data();
	}

	bool config_ini::set_monitor(const std::wstring& _monitor)
	{
		return ::WritePrivateProfileStringW(main_section_name, L"MONITOR", _monitor.c_str(), path_.c_str()) == TRUE;
	}
}
