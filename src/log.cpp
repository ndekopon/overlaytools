#include "log.hpp"

#include "utils.hpp"

#include <mutex>
#include <memory>
#include <string>
#include <vector>
#include <iomanip>
#include <sstream>
#include <cstdarg>
#include <queue>
#include <utility>
#include <tuple>
#include <fstream>

namespace {

	std::mutex mtx;
	std::queue<std::tuple<DWORD, uint64_t, std::unique_ptr<std::vector<wchar_t>>>> log_queue;
	HANDLE event_log = nullptr;

	std::wstring get_current_timestring(uint64_t _millis)
	{
		// 日付・時刻を取得する
		std::time_t t = _millis / 1000;
		std::tm tm;
		errno_t error;
		error = ::localtime_s(&tm, &t);
		return (std::wostringstream() << std::put_time(&tm, L"%Y/%m/%d %H:%M:%S")).str();
	}

	std::wstring get_file_timestring()
	{
		// 日付・時刻を取得する
		std::time_t t = std::time(nullptr);
		std::tm tm;
		errno_t error;
		error = localtime_s(&tm, &t);
		return (std::wostringstream() << std::put_time(&tm, L"%Y%m%d_%H%M%S")).str();
	}

	std::unique_ptr<std::vector<wchar_t>> _log_vprintf(DWORD _id, const wchar_t* _str, std::va_list _arg)
	{
		auto buf = std::make_unique<std::vector<wchar_t>>();
		auto size = _vscwprintf(_str, _arg);
		int rc = 0;

		do {
			buf->resize(size + 1, L'\0');
			rc = _vsnwprintf_s(buf->data(), buf->size(), buf->size() - 1, _str, _arg);
			if (rc > 0)
			{
				break;
			}
			buf->resize(size + 128); // 128文字増やす
			size += 128;
			if (buf->size() > 4096) break; // 増やすのは4096文字迄
		} while (true);

		return std::move(buf);
	}

	std::wstring get_log_directory()
	{
		return app::get_exe_directory() + L"\\logs";
	}

	bool create_log_directory()
	{
		auto path = get_log_directory();
		if (::CreateDirectoryW(path.c_str(), NULL))
		{
			return true;
		}
		auto error = ::GetLastError();
		if (error == ERROR_ALREADY_EXISTS)
		{
			return true;
		}
		return false;
	}

	std::wstring get_logname()
	{
		return get_log_directory() + L"\\" + get_file_timestring() + L".log";
	}

	std::wstring get_id_string(DWORD _id)
	{
		switch (_id)
		{
		case app::LOG_LIVEAPI:
			return L"[LIVEAPI]";
		case app::LOG_CORE:
			return L"[CORE]";
		case app::LOG_WEBAPI:
			return L"[WEBAPI]";
		case app::LOG_LOCAL:
			return L"[LOCAL]";
		case app::LOG_DUPLICATION:
			return L"[DUPLICATION]";
		case app::LOG_HTTP_GET:
			return L"[HTTP_GET]";
		default:
			return L"[UNKNOWN]";
		}
	}
}

namespace app {

	void log(DWORD _id, const wchar_t* format, ...)
	{
		std::va_list arg;
		va_start(arg, format);
		auto str = _log_vprintf(_id, format, arg);
		va_end(arg);
		{
			std::lock_guard<std::mutex> lock(mtx);
			log_queue.emplace(_id, get_millis(), std::move(str));
		}

		if (event_log != nullptr)
		{
			::SetEvent(event_log);
		}
	}

	log_thread::log_thread()
		: thread_(NULL)
		, event_close_(NULL)
	{
	}

	log_thread::~log_thread()
	{
		if (event_log)
		{
			::CloseHandle(event_log);
			event_log = nullptr;
		}
		if (event_close_) ::CloseHandle(event_close_);
	}

	DWORD WINAPI log_thread::proc_common(LPVOID _p)
	{
		auto p = reinterpret_cast<log_thread*>(_p);
		return p->proc();
	}

	DWORD log_thread::proc()
	{
		const HANDLE events[] = {
			event_close_,
			event_log
		};

		bool alive = true;

		// ログディレクトリの作成
		create_log_directory();

		// ログファイルのオープン
		auto log_filename = get_logname();
		auto ws = std::wofstream(log_filename, std::ios::out | std::ios::binary);

		while (alive)
		{

			while (true)
			{
				auto id = ::WaitForMultipleObjects(ARRAYSIZE(events), events, FALSE, INFINITE);
				if (id == WAIT_OBJECT_0)
				{
					alive = false;
					break;
				}
				else if (id == WAIT_OBJECT_0 + 1)
				{
					// logキューから取り出し
					std::queue<std::tuple<DWORD, uint64_t, std::unique_ptr<std::vector<wchar_t>>>> lq;
					{
						std::lock_guard<std::mutex> lock(mtx);
						while (log_queue.size() > 0)
						{
							lq.push(std::move(log_queue.front()));
							log_queue.pop();
						}
					}

					while (lq.size() > 0)
					{
						auto& item = lq.front();
						auto id = std::get<0>(item);
						auto timestamp = std::get<1>(item);
						auto& str = std::get<2>(item);

						ws << get_current_timestring(timestamp) << L" " << get_id_string(id) << L" " << str->data() << L"\r\n";

						lq.pop();
					}
				}
			}
		}

		return 0;
	}

	bool log_thread::run()
	{
		// イベント作成
		event_close_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_close_ == NULL)
		{
			return false;
		}
		event_log = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_log == NULL)
		{
			return false;
		}

		// スレッド起動
		thread_ = ::CreateThread(NULL, 0, proc_common, this, 0, NULL);
		return thread_ != NULL;
	}

	void log_thread::stop()
	{
		// スレッドの停止
		if (thread_ != NULL)
		{
			::SetEvent(event_close_);
			::WaitForSingleObject(thread_, INFINITE);
			thread_ = NULL;
		}
	}

}
