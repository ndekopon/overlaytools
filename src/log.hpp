#pragma once

#include "common.hpp"

#include <array>
#include <mutex>
#include <memory>
#include <string>
#include <vector>
#include <cstdarg>

namespace app {

	constexpr DWORD LOG_LIVEAPI = 0;
	constexpr DWORD LOG_CORE = 1;
	constexpr DWORD LOG_WEBAPI = 2;
	constexpr DWORD LOG_LOCAL = 3;
	constexpr DWORD LOG_DUPLICATION = 4;

	void log_set_window(HWND _window);
	void log(DWORD _id, const wchar_t* _str, ...);
	std::unique_ptr<std::wstring> log_read(DWORD _id);
}
