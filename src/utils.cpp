#include "utils.hpp"

#include <vector>

namespace app {
	std::wstring get_exe_directory()
	{
		std::vector<WCHAR> buf(32767, L'\0');
		std::wstring r = L"";

		// モジュールインスタンスからDLLパスを取得
		auto loaded = ::GetModuleFileNameW(::GetModuleHandleW(nullptr), buf.data(), buf.size());

		// 直前のバックスラッシュを探す
		for (DWORD i = loaded - 1; i != 0; --i)
		{
			if (buf.at(i) == L'\\')
			{
				buf.at(i) = L'\0';
				break;
			}
		}

		// メモリ確保(念のため)
		r.reserve(loaded + 6);

		// パスの合成
		if (buf.at(0) == L'\\' && buf.at(1) == L'\\')
		{
			r += L"\\\\?\\UN";
			buf.at(0) = L'C';
		}
		else
		{
			r += L"\\\\?\\";
		}
		r += buf.data();

		return r;
	}

	std::wstring s_to_ws(const std::string& _s)
	{
		auto ilen = _s.length();
		auto olen = ::MultiByteToWideChar(CP_UTF8, 0, _s.c_str(), ilen, 0, 0);
		std::vector<wchar_t> r(olen + 1, L'\0');
		if (olen)
			::MultiByteToWideChar(CP_UTF8, 0, _s.c_str(), ilen, r.data(), olen);
		return r.data();
	}

	std::string ws_to_s(const std::wstring& _ws)
	{
		auto ilen = _ws.length();
		auto olen = ::WideCharToMultiByte(CP_UTF8, 0, _ws.c_str(), ilen, NULL, 0, NULL, FALSE);
		std::vector<char> r(olen + 1, L'\0');
		if (olen)
			::WideCharToMultiByte(CP_UTF8, 0, _ws.c_str(), ilen, r.data(), olen, NULL, FALSE);
		return r.data();
	}
}
