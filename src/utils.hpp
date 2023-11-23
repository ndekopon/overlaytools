#pragma once

#include "common.hpp"

#include <string>

namespace app {
	std::wstring get_exe_directory();
	std::wstring get_respawn_liveapi_directory();
	std::wstring s_to_ws(const std::string& _s);
	std::string ws_to_s(const std::wstring& _ws);
}