﻿#pragma once

#include "common.hpp"

#include "core_thread.hpp"
#include "duplication_thread.hpp"
#include "config_ini.hpp"

namespace app
{
	class main_window
	{
	private:
		const HINSTANCE instance_;
		HWND window_;
		HWND tab_;
		std::array<HWND, 6> edit_log_;
		std::array<std::vector<HWND>, 7> items_;
		HFONT font_;
		config_ini ini_;
		core_thread core_thread_;
		duplication_thread duplication_thread_;
		UINT current_tab_;
		std::vector<uint32_t> buffer_;
		RECT frame_rect_;
		std::vector<std::wstring> monitors_;
		std::wstring monitor_;

		static const wchar_t* window_class_;
		static const wchar_t* window_title_;
		static const wchar_t* window_mutex_;
		static const LONG window_width_;
		static const LONG window_height_;

		void disable_ime();
		void set_dpi_awareness();
		ATOM register_window_class();
		bool create_window();
		HWND create_tab();
		void add_tab_item(UINT _id, const WCHAR *_text);
		void select_tab_item(UINT _id);
		HWND create_label(const WCHAR* _text, DWORD _x, DWORD _y, DWORD _width, DWORD _height);
		HWND create_edit(HMENU, DWORD, DWORD, DWORD, DWORD);
		void create_menu(const std::vector<std::wstring>& _monitors);

		LRESULT window_proc(UINT, WPARAM, LPARAM);
		static LRESULT CALLBACK window_proc_common(HWND, UINT, WPARAM, LPARAM);

	public:
		main_window(HINSTANCE);
		~main_window();

		// コピー不可
		main_window(const main_window&) = delete;
		main_window& operator = (const main_window&) = delete;
		// ムーブ不可
		main_window(main_window&&) = delete;
		main_window& operator = (main_window&&) = delete;

		bool init();
		int  loop();
	};
}
