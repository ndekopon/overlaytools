#include "sha1.hpp"

#include <wincrypt.h>

#pragma comment(lib, "crypt32.lib")

namespace app {

	bool get_sha1(const std::string& _in, sha1_t& _out)
	{
		HCRYPTPROV prov = NULL;
		HCRYPTHASH hash = 0;

		if (!::CryptAcquireContextW(&prov, NULL, NULL, PROV_RSA_FULL, CRYPT_VERIFYCONTEXT))
		{
			return false;
		}

		bool r = false;
		if (::CryptCreateHash(prov, CALG_SHA1, 0, 0, &hash))
		{
			if (::CryptHashData(hash, reinterpret_cast<const BYTE*>(_in.c_str()), _in.size(), 0))
			{
				DWORD datalen = _out.size();
				if (::CryptGetHashParam(hash, HP_HASHVAL, _out.data(), &datalen, 0))
				{
					r = true;
				}
			}
			::CryptDestroyHash(hash);
		}
		::CryptReleaseContext(prov, 0);

		return r;
	}

	/* SHA1 -> base64 */
	std::string base64encode_from_sha1(const sha1_t& _sha1)
	{
		constexpr auto table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		std::string o;
		uint16_t a = 0;
		int16_t b = -6;
		for (auto c : _sha1)
		{
			a = (a << 8) + c;
			b += 8;
			while (b >= 0)
			{
				o.push_back(table[(a >> b) & 0x3f]);
				b -= 6;
			}
		}
		if (b > -6) o.push_back(table[((a << 8) >> (b + 8)) & 0x3f]);
		while (o.size() % 4) o.push_back('=');
		return o;
	}
}
