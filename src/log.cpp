#include "log.hpp"

#include <array>
#include <mutex>
#include <memory>
#include <string>
#include <vector>
#include <iomanip>
#include <sstream>
#include <cstdarg>

namespace {

	HWND main_window_handle = nullptr;
	std::array<std::mutex, app::LOGNUMS> mtx;
	std::array<std::unique_ptr<std::wstring>, app::LOGNUMS> data({ nullptr });

	std::wstring get_current_timestring()
	{
		// 日付・時刻を取得する
		std::time_t t = std::time(nullptr);
		std::tm tm;
		errno_t error;
		error = localtime_s(&tm, &t);
		return (std::wostringstream() << std::put_time(&tm, L"%Y/%m/%d %H:%M:%S")).str();
	}


	void _log_save_and_post(DWORD _id, const std::vector<wchar_t>& _str)
	{
		if (_id >= mtx.size() || _id >= data.size()) return;

		std::unique_ptr<std::wstring> logstr = std::make_unique<std::wstring>(get_current_timestring() + L" " + _str.data() + L"\r\n");
		{
			std::lock_guard<std::mutex> lock(mtx.at(_id));
			if (data.at(_id))
			{
				*data.at(_id) += *logstr;
			}
			else
			{
				data.at(_id) = std::move(logstr);
			}
		}
		if (main_window_handle)
		{
			::PostMessageW(main_window_handle, app::CWM_LOG_UPDATE, _id, 0);
		}
	}

	std::vector<wchar_t> _log_vprintf(DWORD _id, const wchar_t* _str, std::va_list _arg)
	{
		std::vector<wchar_t> buf;
		auto size = _vscwprintf(_str, _arg);
		int rc = 0;

		do {
			buf.resize(size + 1, L'\0');
			rc = _vsnwprintf_s(buf.data(), buf.size(), buf.size() - 1, _str, _arg);
			if (rc > 0)
			{
				break;
			}
			buf.resize(size + 128); // 128文字増やす
			size += 128;
			if (buf.size() > 4096) break; // 増やすのは4096文字迄
		} while (true);

		return buf;
	}
}

namespace app {

	void log_set_window(HWND _window)
	{
		main_window_handle = _window;
	}

	void log(DWORD _id, const wchar_t* format, ...)
	{
		std::va_list arg;
		va_start(arg, format);
		auto str = _log_vprintf(_id, format, arg);
		_log_save_and_post(_id, str);
		va_end(arg);
	}

	std::unique_ptr<std::wstring> log_read(DWORD _id)
	{
		if (_id < mtx.size() && _id < data.size())
		{
			std::lock_guard<std::mutex> lock(mtx.at(_id));
			return std::move(data.at(_id));
		}
		return nullptr;
	}
}
