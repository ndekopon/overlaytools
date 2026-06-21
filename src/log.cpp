#include "log.hpp"

#include "utils.hpp"

#include <mutex>
#include <string>
#include <iomanip>
#include <queue>
#include <tuple>
#include <fstream>
#include <chrono>
#include <format>

namespace {

	std::mutex mtx;
	std::queue<std::tuple<DWORD, std::chrono::system_clock::time_point, std::wstring>> log_queue;
	HANDLE event_log = nullptr;
	bool logdir_exists = false;

	std::wstring get_current_timestring(std::chrono::system_clock::time_point _timepoint)
	{
		auto local_time = std::chrono::zoned_time{ std::chrono::current_zone(), _timepoint };
		return std::format(L"{:%Y/%m/%d %H:%M:%S}", local_time);
	}

	std::wstring get_file_timestring()
	{
		auto now = std::chrono::system_clock::now();
		auto sec_time = std::chrono::floor<std::chrono::seconds>(now);
		auto local_time = std::chrono::zoned_time{ std::chrono::current_zone(), sec_time };
		return std::format(L"{:%Y%m%d_%H%M%S}", local_time);
	}

	std::wstring get_log_directory()
	{
		return app::get_exe_directory() + L"\\logs";
	}

	bool log_directory_exists()
	{
		auto path = get_log_directory();
		auto attrib = ::GetFileAttributesW(path.c_str());
		return (attrib != INVALID_FILE_ATTRIBUTES && (attrib & FILE_ATTRIBUTE_DIRECTORY) != 0);
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

	void log(DWORD _id, const std::wstring& _str)
	{
		if (logdir_exists)
		{
			{
				std::lock_guard<std::mutex> lock(mtx);
				log_queue.emplace(_id, std::chrono::system_clock::now(), _str);
			}

			if (event_log != nullptr)
			{
				::SetEvent(event_log);
			}
		}
	}

	log_thread::log_thread()
		: thread_(NULL)
		, event_close_(NULL)
		, dir_exists_(false)
	{
		if (log_directory_exists())
		{
			dir_exists_ = true;
			logdir_exists = true;
		}
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

		std::wofstream ws;

		if (dir_exists_)
		{
			// ログファイルのオープン
			auto log_filename = get_logname();
			ws = std::wofstream(log_filename, std::ios::out | std::ios::binary);
		}

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
					std::queue<std::tuple<DWORD, std::chrono::system_clock::time_point, std::wstring>> lq;
					{
						std::lock_guard<std::mutex> lock(mtx);
						lq.swap(log_queue);
					}

					while (lq.size() > 0)
					{
						if (dir_exists_)
						{
							auto& item = lq.front();
							auto id = std::get<0>(item);
							auto timepoint = std::get<1>(item);
							auto& str = std::get<2>(item);

							ws << get_current_timestring(timepoint) << L" " << get_id_string(id) << L" " << str << L"\r\n";
						}

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
