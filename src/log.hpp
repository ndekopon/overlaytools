#pragma once

#include "common.hpp"

#include <memory>
#include <string>

namespace app {

	constexpr DWORD LOG_LIVEAPI = 0;
	constexpr DWORD LOG_CORE = 1;
	constexpr DWORD LOG_WEBAPI = 2;
	constexpr DWORD LOG_LOCAL = 3;
	constexpr DWORD LOG_DUPLICATION = 4;
	constexpr DWORD LOG_HTTP_GET = 5;

	void log_set_window(HWND _window);
	void log(DWORD _id, const wchar_t* _str, ...);
	std::unique_ptr<std::wstring> log_read(DWORD _id);
}
