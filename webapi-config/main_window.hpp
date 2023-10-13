#pragma once

#include "common.hpp"

namespace app
{
	class main_window
	{
	private:
		const HINSTANCE instance_;
		HWND window_;

		static const wchar_t* window_class_;
		static const wchar_t* window_title_;
		static const LONG window_min_width_;
		static const LONG window_min_height_;
		wil::com_ptr<ICoreWebView2Environment> webview_env_;
		wil::com_ptr<ICoreWebView2Controller> webview_ctrl_;
		wil::com_ptr<ICoreWebView2> webview_;
		wil::com_ptr<ICoreWebView2_3> webview3_;
		EventRegistrationToken token_newwindowrequested_;

		void set_dpi_awareness();
		ATOM register_window_class();
		bool create_window();

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
