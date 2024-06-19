#pragma once

#include "common.hpp"

#include <array>
#include <string>

namespace app {
	using sha1_t = std::array<unsigned char, 20>;
	bool get_sha1(const std::string& _in, sha1_t& _out);
	std::string base64encode_from_sha1(const sha1_t& _sha1);
}
