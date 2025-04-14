#include "duplication_thread.hpp"

#include "log.hpp"

#include "duplicator.hpp"

#include <chrono>
#include <mmsystem.h>

#pragma comment(lib, "winmm.lib")

namespace {

	union rgba_t {
		uint32_t c;
		struct { // little-endian 0xAARRGGBB
			uint8_t b;
			uint8_t g;
			uint8_t r;
			uint8_t a;
		};
	};

	inline bool is_grayframe(uint32_t _c)
	{
		rgba_t d = { .c = _c };
		// r:92-98 g:92-98 b:92-98
		if (d.r < 0x92 || 0x98 < d.r) return false;
		if (d.g < 0x92 || 0x98 < d.g) return false;
		if (d.b < 0x92 || 0x98 < d.b) return false;
		return true;
	}

	inline bool is_teamnameframe_white(uint32_t _c)
	{
		rgba_t d = { .c = _c };
		// r:f0-ff g:f0-ff b:f0-ff
		if (d.r < 0xef) return false;
		if (d.g < 0xef) return false;
		if (d.b < 0xef) return false;
		return true;
	}

	inline bool is_teamnameframe_gray(uint32_t _c)
	{
		rgba_t d = { .c = _c };
		// r:00-7f g:00-7f b:00-7f
		if (0x80 < d.r) return false;
		if (0x80 < d.g) return false;
		if (0x80 < d.b) return false;
		return true;
	}
	
	inline bool is_team1frame_color(uint32_t _c)
	{
		rgba_t d = { .c = _c };
		// r:05-05 g:78-78 b:8b-8b
		if (0x10 < d.r) return false;
		if (d.g < 0x70 || 0x8f < d.g) return false;
		if (d.b < 0x80 || 0x9f < d.b) return false;
		return true;
	}

	inline bool is_black(uint32_t _c)
	{
		rgba_t d = { .c = _c };
		// r:00-00 g:00-00 b:00-00
		if (0x00 < d.r) return false;
		if (0x00 < d.g) return false;
		if (0x00 < d.b) return false;
		return true;
	}
}

namespace app {

#define BUFFERPOS(x, y) _buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - y - 1) + base +  x)

	inline bool is_shown_teamnameframe(const std::vector<uint32_t>& _buffer)
	{
		const UINT base = 0;
		if      (!is_teamnameframe_white(BUFFERPOS(11,  0))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS(10,  2))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS( 9,  4))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS( 8,  6))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS( 7,  8))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS( 6, 10))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS( 7, 12))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS( 8, 14))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS(10, 17))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS(11, 19))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS(12, 21))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS(13, 23))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS(15, 26))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS(16, 28))) return false;
		else if (!is_teamnameframe_white(BUFFERPOS(18, 31))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(14,  0))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(13,  2))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(12,  4))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(11,  6))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(10,  8))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS( 9, 10))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(10, 12))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(11, 14))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(13, 17))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(14, 19))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(15, 21))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(16, 23))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(18, 26))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(19, 28))) return false;
		else if (!is_teamnameframe_gray(BUFFERPOS(21, 31))) return false;
		return true;
	}

	inline bool is_shown_team1frame(const std::vector<uint32_t>& _buffer)
	{
		const UINT base = 32;
		if      (!is_team1frame_color(BUFFERPOS(16, 13))) return false;
		else if (!is_team1frame_color(BUFFERPOS(31, 14))) return false;
		else if (!is_team1frame_color(BUFFERPOS(17, 31))) return false;
		return true;
	}

	inline bool is_shown_grenadeframe(const std::vector<uint32_t>& _buffer)
	{
		const UINT base = 64;
		if      (!is_grayframe(BUFFERPOS( 0,  0))) return false;
		else if (!is_grayframe(BUFFERPOS( 2,  0))) return false;
		else if (!is_grayframe(BUFFERPOS( 4,  0))) return false;
		else if (!is_grayframe(BUFFERPOS( 6,  0))) return false;
		else if (!is_grayframe(BUFFERPOS( 8,  0))) return false;
		else if (!is_grayframe(BUFFERPOS(10,  0))) return false;
		else if (!is_grayframe(BUFFERPOS(12,  0))) return false;
		else if (!is_grayframe(BUFFERPOS(14,  0))) return false;
		else if (!is_grayframe(BUFFERPOS(16,  0))) return false;
		else if (!is_grayframe(BUFFERPOS(18,  0))) return false;
		else if (!is_grayframe(BUFFERPOS(20,  0))) return false;
		else if (!is_grayframe(BUFFERPOS(22,  0))) return false;
		else if (!is_grayframe(BUFFERPOS(24,  0))) return false;
		else if (!is_grayframe(BUFFERPOS(24,  2))) return false;
		else if (!is_grayframe(BUFFERPOS(26,  4))) return false;
		else if (!is_grayframe(BUFFERPOS(27,  6))) return false;
		else if (!is_grayframe(BUFFERPOS(28,  8))) return false;
		else if (!is_grayframe(BUFFERPOS(28, 10))) return false;
		else if (!is_grayframe(BUFFERPOS(27, 12))) return false;
		else if (!is_grayframe(BUFFERPOS(25, 14))) return false;
		else if (!is_grayframe(BUFFERPOS(24, 16))) return false;
		else if (!is_grayframe(BUFFERPOS(23, 18))) return false;
		else if (!is_grayframe(BUFFERPOS(22, 20))) return false;
		else if (!is_grayframe(BUFFERPOS(21, 22))) return false;
		else if (!is_grayframe(BUFFERPOS(20, 24))) return false;
		else if (!is_grayframe(BUFFERPOS(19, 26))) return false;
		else if (!is_grayframe(BUFFERPOS(18, 28))) return false;
		else if (!is_grayframe(BUFFERPOS(16, 30))) return false;
		return true;
	}

	inline bool is_shown_alivesicon(const std::vector<uint32_t>& _buffer)
	{
		const UINT base = 96;
		if      (!is_black(BUFFERPOS( 8, 24))) return false;
		else if (!is_black(BUFFERPOS(10, 24))) return false;
		else if (!is_black(BUFFERPOS(12, 24))) return false;
		else if (!is_black(BUFFERPOS(14, 24))) return false;
		else if (!is_black(BUFFERPOS(16, 24))) return false;
		else if (!is_black(BUFFERPOS(18, 24))) return false;
		else if (!is_black(BUFFERPOS(20, 24))) return false;
		else if (!is_black(BUFFERPOS(22, 24))) return false;
		else if (!is_black(BUFFERPOS(13, 10))) return false;
		else if (!is_black(BUFFERPOS(15, 10))) return false;
		else if (!is_black(BUFFERPOS(17, 10))) return false;
		return true;
	}

	inline bool is_shown_map_bottom_border(const std::vector<uint32_t>& _buffer)
	{
		const UINT base = 128;
		if      (!is_black(BUFFERPOS( 0,  0))) return false;
		else if (!is_black(BUFFERPOS( 8,  0))) return false;
		else if (!is_black(BUFFERPOS(18,  0))) return false;
		else if (!is_black(BUFFERPOS(28,  0))) return false;
		else if (!is_black(BUFFERPOS(31,  0))) return false;
		else if (!is_black(BUFFERPOS( 0, 31))) return false;
		else if (!is_black(BUFFERPOS( 8, 31))) return false;
		else if (!is_black(BUFFERPOS(18, 31))) return false;
		else if (!is_black(BUFFERPOS(28, 31))) return false;
		else if (!is_black(BUFFERPOS(31, 31))) return false;
		return true;
	}
#undef BUFFERPOS

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
		struct {
			bool teambanner_show;
			bool teamnameframe;
			bool team1frame;
			bool grenadeframe;
			bool alivesicon;
			bool mapbottomborder;
		} screen_state_prev = {
				false,
				false,
				false,
				false,
				false,
				false
		};

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
					auto result = dup.get_frame(buffer);
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

						bool teamnameframe = is_shown_teamnameframe(buffer);
						bool grenadeframe = is_shown_grenadeframe(buffer);
						bool team1frame = is_shown_team1frame(buffer);
						bool mapbottomborder = is_shown_map_bottom_border(buffer);
						bool alivesicon = is_shown_alivesicon(buffer);
						bool teambanner_show = screen_state_prev.teambanner_show;

						// 差分表示
						if (teamnameframe != screen_state_prev.teamnameframe) log(LOG_DUPLICATION, L"Info: teamnameframe=%s.", teamnameframe ? L"true" : L"false");
						if (grenadeframe != screen_state_prev.grenadeframe) log(LOG_DUPLICATION, L"Info: grenadeframe=%s.", grenadeframe ? L"true" : L"false");
						if (team1frame != screen_state_prev.team1frame) log(LOG_DUPLICATION, L"Info: team1frame=%s.", team1frame ? L"true" : L"false");
						if (alivesicon != screen_state_prev.alivesicon) log(LOG_DUPLICATION, L"Info: alivesicon=%s.", alivesicon ? L"true" : L"false");
						if (mapbottomborder != screen_state_prev.mapbottomborder)
						{
							log(LOG_DUPLICATION, L"Info: mapbottomborder=%s.", mapbottomborder ? L"true" : L"false");
							if (mapbottomborder)
							{
								::PostMessageW(window_, CWM_MONITOR_MAP_STATE, 1, 0);
							}
							else
							{
								::PostMessageW(window_, CWM_MONITOR_MAP_STATE, 0, 0);
							}
						}
						screen_state_prev.teamnameframe = teamnameframe;
						screen_state_prev.grenadeframe = grenadeframe;
						screen_state_prev.team1frame = team1frame;
						screen_state_prev.mapbottomborder = mapbottomborder;
						screen_state_prev.alivesicon = alivesicon;

						if ((teamnameframe || grenadeframe) && alivesicon) teambanner_show = true;
						else if (alivesicon) teambanner_show = false;
						else if (mapbottomborder) teambanner_show = false;
						else if (team1frame) teambanner_show = false;

						if (teambanner_show != screen_state_prev.teambanner_show)
						{
							log(LOG_DUPLICATION, L"Info: teambanner_show=%s.", teambanner_show ? L"true" : L"false");
							if (teambanner_show)
							{
								::PostMessageW(window_, CWM_MONITOR_BANNER_STATE, 1, 0);
							}
							else
							{
								::PostMessageW(window_, CWM_MONITOR_BANNER_STATE, 0, 0);
							}
							screen_state_prev.teambanner_show = teambanner_show;
						}

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
