﻿#include "duplication_thread.hpp"

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

	inline bool is_playerframe_gray(uint32_t _c)
	{
		rgba_t d = { .c = _c };
		// r:88-8f g:88-8f b:88-8f
		if (d.r < 0x84 || 0xa9 < d.r) return false;
		if (d.g < 0x84 || 0xa9 < d.g) return false;
		if (d.b < 0x84 || 0xa9 < d.b) return false;
		return true;
	}

	inline bool is_playerframe_red(uint32_t _c)
	{
		rgba_t d = { .c = _c };
		// r:d8-ff g:00-26 b:00-26
		if (d.r < 0xd8) return false;
		if (0x30 < d.g) return false;
		if (0x30 < d.b) return false;
		return true;
	}

	inline bool is_craftpoint_green(uint32_t _c)
	{
		rgba_t d = { .c = _c };
		// r:00-17 g:fa-fe b:ea-ed
		if (0x25 < d.r) return false;
		if (d.g < 0xf0) return false;
		if (d.b < 0xd8 || 0xf8 < d.b) return false;
		return true;
	}

	inline bool is_menu_white(uint32_t _c)
	{
		rgba_t d = { .c = _c };
		// r:ff-ff g:ff-ff b:ff-ff
		if (d.r < 0xf8) return false;
		if (d.g < 0xf8) return false;
		if (d.b < 0xf8) return false;
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

	inline bool is_mapborder_gray(uint32_t _c)
	{
		rgba_t d = { .c = _c };
		// r:88-8f g:88-8f b:88-8f
		if (d.r < 0x60 || 0x90 < d.r) return false;
		if (d.g < 0x60 || 0x90 < d.g) return false;
		if (d.b < 0x60 || 0x90 < d.b) return false;
		return true;
	}
	inline bool is_black(uint32_t _c)
	{
		rgba_t d = { .c = _c };
		if (0x00 < d.r) return false;
		if (0x00 < d.g) return false;
		if (0x00 < d.b) return false;
		return true;
	}
}

namespace app {

	inline bool is_shown_playerframe_gray(const std::vector<uint32_t>& _buffer)
	{
		if      (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 0))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 1))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 4))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 5))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 8))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 9))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 12))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 13))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 15))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 16))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 19))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 20))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 23))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 24))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 27))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 28))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 30))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 31))) return false;
		return true;
	}

	inline bool is_shown_playerframe_red(const std::vector<uint32_t>& _buffer)
	{
		if      (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) +  0))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) +  1))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) +  4))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) +  5))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) +  8))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) +  9))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 12))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 13))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 15))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 16))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 19))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 20))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 23))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 24))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 27))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 28))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 19 - 1) + 30))) return false;
		else if (!is_playerframe_red(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 20 - 1) + 31))) return false;
		return true;
	}

	inline bool is_shown_playerframe(const std::vector<uint32_t>& _buffer)
	{
		return is_shown_playerframe_gray(_buffer) || is_shown_playerframe_red(_buffer);
	}

	inline bool is_shown_healitemframe(const std::vector<uint32_t>& _buffer)
	{
		if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT      - 0 - 1) + 128 + 6))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 128 + 8))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 128 + 10))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 128 + 12))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 128 + 14))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 128 + 16))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 128 + 18))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 128 + 20))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 128 + 22))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 128 + 24))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 128 + 26))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 128 + 28))) return false;
		else if (!is_playerframe_gray(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 128 + 31))) return false;
		return true;
	}

	inline bool is_shown_craftpoint(const std::vector<uint32_t>& _buffer)
	{
		// (37,0) (37,31)
		if (!is_craftpoint_green(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 37))) return false;
		else if (!is_craftpoint_green(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 31 - 1) + 37))) return false;
		return true;
	}

	inline bool is_shown_menu(const std::vector<uint32_t>& _buffer)
	{
		// (72,9) (79,15) (87,21)
		if      (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 9 - 1) + 72))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 9 - 1) + 74))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 9 - 1) + 76))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 9 - 1) + 78))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 9 - 1) + 80))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 9 - 1) + 82))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 9 - 1) + 84))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 9 - 1) + 86))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 15 - 1) + 75))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 15 - 1) + 77))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 15 - 1) + 79))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 15 - 1) + 81))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 15 - 1) + 83))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 15 - 1) + 85))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 15 - 1) + 87))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 21 - 1) + 75))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 21 - 1) + 77))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 21 - 1) + 79))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 21 - 1) + 81))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 21 - 1) + 83))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 21 - 1) + 85))) return false;
		else if (!is_menu_white(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 21 - 1) + 87))) return false;
		return true;
	}

	inline bool is_shown_team1frame(const std::vector<uint32_t>& _buffer)
	{
		// (112,13) (127, 14) (113, 31)
		if (!is_team1frame_color(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 13 - 1) + 112))) return false;
		else if (!is_team1frame_color(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 14 - 1) + 127))) return false;
		else if (!is_team1frame_color(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 31 - 1) + 113))) return false;
		return true;
	}

	inline bool is_shown_alivesicon(const std::vector<uint32_t>& _buffer)
	{
		// LEFT=32*5=160
		if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 24 - 1) + 160 + 8))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 24 - 1) + 160 + 10))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 24 - 1) + 160 + 12))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 24 - 1) + 160 + 14))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 24 - 1) + 160 + 16))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 24 - 1) + 160 + 18))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 24 - 1) + 160 + 20))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 24 - 1) + 160 + 22))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 10 - 1) + 160 + 13))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 10 - 1) + 160 + 15))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 10 - 1) + 160 + 17))) return false;
		return true;
	}

	inline bool is_shown_map_bottom_border(const std::vector<uint32_t>& _buffer)
	{
		if      (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 192))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 200))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 210))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 220))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 0 - 1) + 223))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 31 - 1) + 192))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 31 - 1) + 200))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 31 - 1) + 210))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 31 - 1) + 220))) return false;
		else if (!is_black(_buffer.at(CAPTURE_WIDTH * (CAPTURE_HEIGHT - 31 - 1) + 223))) return false;
		return true;
	}

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
			bool playerframe;
			bool healitemframe;
			bool craftpoint;
			bool menu;
			bool team1frame;
			bool map;
			bool alivesicon;
		} screen_state_prev = {
				false,
				false,
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

						bool playerframe = is_shown_playerframe(buffer);
						bool healitemframe = is_shown_healitemframe(buffer);
						bool craftpoint = is_shown_craftpoint(buffer);
						bool menu = is_shown_menu(buffer);
						bool team1frame = is_shown_team1frame(buffer);
						bool map = is_shown_map_bottom_border(buffer);
						bool alivesicon = is_shown_alivesicon(buffer);
						bool teambanner_show = screen_state_prev.teambanner_show;

						// 差分表示
						if (playerframe != screen_state_prev.playerframe) log(LOG_DUPLICATION, L"Info: playerframe=%s.", playerframe ? L"true" : L"false");
						if (healitemframe != screen_state_prev.healitemframe) log(LOG_DUPLICATION, L"Info: healitemframe=%s.", healitemframe ? L"true" : L"false");
						if (craftpoint != screen_state_prev.craftpoint) log(LOG_DUPLICATION, L"Info: craftpoint=%s.", craftpoint ? L"true" : L"false");
						if (menu != screen_state_prev.menu) log(LOG_DUPLICATION, L"Info: menu=%s.", menu ? L"true" : L"false");
						if (team1frame != screen_state_prev.team1frame) log(LOG_DUPLICATION, L"Info: team1frame=%s.", team1frame ? L"true" : L"false");
						if (alivesicon != screen_state_prev.alivesicon) log(LOG_DUPLICATION, L"Info: alivesicon=%s.", alivesicon ? L"true" : L"false");
						if (map != screen_state_prev.map)
						{
							log(LOG_DUPLICATION, L"Info: map=%s.", map ? L"true" : L"false");
							if (map)
							{
								::PostMessageW(window_, CWM_MONITOR_MAP_STATE, 1, 0);
							}
							else
							{
								::PostMessageW(window_, CWM_MONITOR_MAP_STATE, 0, 0);
							}
						}
						screen_state_prev.playerframe = playerframe;
						screen_state_prev.healitemframe = healitemframe;
						screen_state_prev.craftpoint = craftpoint;
						screen_state_prev.menu = menu;
						screen_state_prev.team1frame = team1frame;
						screen_state_prev.map = map;
						screen_state_prev.alivesicon = alivesicon;

						if ((playerframe || healitemframe) && (craftpoint || alivesicon) && menu) teambanner_show = true;
						else if (alivesicon && menu) teambanner_show = false;
						else if (map && menu) teambanner_show = false;
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
