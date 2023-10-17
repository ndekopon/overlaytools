#include "duplication_thread.hpp"

#include "log.hpp"

#include "duplicator.hpp"

#include <chrono>
#include <mmsystem.h>

#pragma comment(lib, "winmm.lib")

namespace {
	/* 現在のミリ秒を取得する */
	uint64_t get_milliseconds()
	{
		return std::chrono::duration_cast<std::chrono::milliseconds>(
			std::chrono::system_clock::now().time_since_epoch())
			.count();
	};
}

namespace app {

	duplication_thread::duplication_thread()
		: window_(nullptr)
		, thread_(NULL)
		, event_close_(NULL)
		, event_capture_(NULL)
		, event_stats_(NULL)
		, event_get_monitors_(NULL)
		, event_set_monitor_(NULL)
	{
	}

	duplication_thread::~duplication_thread()
	{
		if (event_set_monitor_) ::CloseHandle(event_set_monitor_);
		if (event_get_monitors_) ::CloseHandle(event_get_monitors_);
		if (event_stats_) ::CloseHandle(event_stats_);
		if (event_capture_) ::CloseHandle(event_capture_);
		if (event_close_) ::CloseHandle(event_close_);
	}

	DWORD WINAPI duplication_thread::proc_common(LPVOID _p)
	{
		auto p = reinterpret_cast<duplication_thread*>(_p);
		return p->proc();
	}

	DWORD duplication_thread::proc()
	{
		log(LOG_DUPLICATION, L"Info: thread start.");

		const HANDLE events[] = {
			event_close_,
			event_capture_,
			event_stats_,
			event_get_monitors_,
			event_set_monitor_
		};

		bool alive = true;
		uint64_t frame_captured = 0;
		uint64_t frame_captured_prev = 0;
		uint64_t frame_skipped = 0;
		uint64_t frame_exited = 0;
		bool teambanner_show_prev = false;
		std::vector<uint32_t> buffer;


		while (alive)
		{
			duplicator dup;
			std::wstring monitor;
			bool monitor_available = false;

			if (!dup.create())
			{
				log(LOG_DUPLICATION, L"Error: duplicator::create() failed.");
				alive = false;
				continue;
			}

			monitor = get_monitor();
			monitor_available = dup.select_monitor(monitor);
			if (monitor_available)
			{
				log(LOG_DUPLICATION, L"Error: monitor '%s' is not available.", monitor.c_str());
			}

			while (true)
			{
				auto id = ::WaitForMultipleObjects(ARRAYSIZE(events), events, FALSE, INFINITE);
				if (id == WAIT_OBJECT_0)
				{
					log(LOG_DUPLICATION, L"Info: event close received.");
					alive = false;
					break;
				}
				else if (id == WAIT_OBJECT_0 + 1)
				{
					// capture
					if (!monitor_available) continue;
					auto result = dup.get_frame(buffer, CAPTURE_TOP, CAPTURE_WIDTH, CAPTURE_HEIGHT);
					if (result == duplicator::Error_Action_Skip)
					{
						frame_skipped++;
					}
					else if (result == duplicator::Error_Action_Exit)
					{
						frame_exited++;
						break;
					}
					else
					{
						frame_captured++;

						// 0xAARRGGBB
						// 49,41 50,41 -> FFFFFF
						// 48,46 49,46 -> FFFFFF
						bool teambanner_show = true;
						if (buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 41 - 1) + 49) != 0xffffffff) teambanner_show = false;
						if (buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 41 - 1) + 50) != 0xffffffff) teambanner_show = false;
						if (buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 46 - 1) + 48) != 0xffffffff) teambanner_show = false;
						if (buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 46 - 1) + 49) != 0xffffffff) teambanner_show = false;
						if (teambanner_show != teambanner_show_prev)
						{
							if (teambanner_show)
							{
								::PostMessageW(window_, CWM_MENUBANNER_STATE, 1, 0);
							}
							else
							{
								::PostMessageW(window_, CWM_MENUBANNER_STATE, 0, 0);
							}
							teambanner_show_prev = teambanner_show;
						}

						// TODO: gray color check

						// main_window用バッファへコピー
						{
							std::lock_guard<std::mutex> lock(mtx_buffer_);
							buffer_ = buffer;
						}
						::PostMessageW(window_, CWM_FRAME_ARRIVED, 200, 100);
					}
				}
				else if (id == WAIT_OBJECT_0 + 2)
				{
					// stats
					auto fps = frame_captured - frame_captured_prev;
					{
						std::lock_guard<std::mutex> lock(mtx_stats_);
						stats_.fps = fps;
						stats_.total = frame_captured;
						stats_.skipped = frame_skipped;
						stats_.exited = frame_exited;
					}
					frame_captured_prev = frame_captured;
					::PostMessageW(window_, CWM_DUPLICATION_STATS_UPDATE, 0, 0);
				}
				else if (id == WAIT_OBJECT_0 + 3)
				{
					// get_monitors
					auto monitors = dup.get_monitors();
					{
						std::lock_guard<std::mutex> lock(mtx_monitor_);
						monitors_ = monitors;
					}
					// 通知
					if (window_)
					{
						::PostMessageW(window_, CWM_MONITORS_UPDATE, 0, 0);
					}
				}
				else if (id == WAIT_OBJECT_0 + 4)
				{
					// set_monitor
					monitor = get_monitor();
					monitor_available = dup.select_monitor(monitor);
					log(LOG_DUPLICATION, L"Info: set monitor '%s' result=%s.", monitor.c_str(), monitor_available ? L"true" : L"false");
				}
			}
		}

		log(LOG_DUPLICATION, L"Info: thread close.");

		return 0;
	}

	bool duplication_thread::run(HWND _window)
	{
		window_ = _window;

		// イベント作成
		event_close_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_close_ == NULL)
		{
			log(LOG_DUPLICATION, L"Error: CreateEvent() failed.");
			return false;
		}
		event_capture_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_capture_ == NULL)
		{
			log(LOG_DUPLICATION, L"Error: CreateEvent() failed.");
			return false;
		}
		event_stats_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_stats_ == NULL)
		{
			log(LOG_DUPLICATION, L"Error: CreateEvent() failed.");
			return false;
		}
		event_get_monitors_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_get_monitors_ == NULL)
		{
			log(LOG_DUPLICATION, L"Error: CreateEvent() failed.");
			return false;
		}
		event_set_monitor_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_set_monitor_ == NULL)
		{
			log(LOG_DUPLICATION, L"Error: CreateEvent() failed.");
			return false;
		}

		// スレッド起動
		thread_ = ::CreateThread(NULL, 0, proc_common, this, 0, NULL);
		return thread_ != NULL;
	}

	void duplication_thread::stop()
	{
		// スレッドの停止
		if (thread_ != NULL)
		{
			::SetEvent(event_close_);
			::WaitForSingleObject(thread_, INFINITE);
			thread_ = NULL;
		}
	}

	std::wstring duplication_thread::get_monitor()
	{
		std::lock_guard<std::mutex> lock(mtx_monitor_);
		return monitor_;
	}

	std::vector<std::wstring> duplication_thread::get_monitors()
	{
		std::lock_guard<std::mutex> lock(mtx_monitor_);
		return monitors_;
	}

	std::vector<std::uint32_t> duplication_thread::get_buffer()
	{
		std::lock_guard<std::mutex> lock(mtx_buffer_);
		return buffer_;
	}
	
	duplication_stats duplication_thread::get_stats()
	{
		std::lock_guard<std::mutex> lock(mtx_stats_);
		return stats_;
	}

	void duplication_thread::request_set_monitor(const std::wstring& _monitor)
	{
		if (event_set_monitor_)
		{
			{
				std::lock_guard<std::mutex> lock(mtx_monitor_);
				monitor_ = _monitor;
			}
			::SetEvent(event_set_monitor_);
		}
	}

	void duplication_thread::request_get_monitors()
	{
		if (event_get_monitors_)
		{
			::SetEvent(event_get_monitors_);
		}
	}

	void duplication_thread::request_capture()
	{
		if (event_capture_)
		{
			::SetEvent(event_capture_);
		}
	}

	void duplication_thread::request_stats()
	{
		if (event_stats_)
		{
			::SetEvent(event_stats_);
		}
	}
}
