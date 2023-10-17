#include "main_window.hpp"

#include "log.hpp"

#include "utils.hpp"

#include <imm.h>
#include <commctrl.h>

#pragma comment(lib, "imm32.lib")
#pragma comment(lib, "Ws2_32.lib")
#pragma comment(lib, "Comctl32.lib")

namespace
{
	void menu_checkeditem_create(HMENU _menu, UINT _id, const std::wstring& _str, bool _checked)
	{
		MENUITEMINFO mi = { 0 };
		std::vector<wchar_t> sz(_str.c_str(), _str.c_str() + _str.size() + 1);

		mi.cbSize = sizeof(MENUITEMINFO);
		mi.fMask = MIIM_ID | MIIM_STATE | MIIM_STRING | MIIM_CHECKMARKS;
		mi.wID = _id;
		mi.dwTypeData = sz.data();
		if (_checked)
			mi.fState = MFS_CHECKED;
		else
			mi.fState = MFS_UNCHECKED;
		::InsertMenuItemW(_menu, -1, TRUE, &mi);
	}
}

namespace app
{
	constexpr UINT MID_TAB = 1;
	constexpr UINT MID_EDIT_LOG_LIVEAPI = 2;
	constexpr UINT MID_EDIT_LOG_CORE = 3;
	constexpr UINT MID_EDIT_LOG_WEBAPI = 4;
	constexpr UINT MID_EDIT_LOG_LOCAL = 5;
	constexpr UINT MID_EDIT_LOG_DUPLICATION = 6;
	constexpr UINT MID_POPUP_CAPTURE_DISABLED = 7;
	constexpr UINT MID_POPUP_CAPTURE_MONITORPREFIX = 100;

	constexpr UINT TIMER_ID_PING = 1;
	constexpr UINT TIMER_ID_CAPTURE = 2;
	constexpr UINT TIMER_ID_STATS = 3;

	const wchar_t* main_window::window_class_ = L"apexliveapi_proxy-mainwindow";
	const wchar_t* main_window::window_title_ = L"apexliveapi_proxy";
	const wchar_t* main_window::window_mutex_ = L"apexliveapi_proxy_mutex";
	const LONG main_window::window_width_ = 640;
	const LONG main_window::window_height_ = 480;


	main_window::main_window(HINSTANCE _instance)
		: instance_(_instance)
		, window_(nullptr)
		, tab_(nullptr)
		, edit_log_({ nullptr })
		, items_({})
		, font_(nullptr)
		, ini_()
		, core_thread_(ini_.get_liveapi_ipaddress(), ini_.get_liveapi_port(), ini_.get_webapi_ipaddress(), ini_.get_webapi_port(), ini_.get_webapi_maxconnection())
		, duplication_thread_()
		, current_tab_(0)
		, frame_rect_({ 0 })
		, buffer_((size_t)(CAPTURE_WIDTH * CAPTURE_HEIGHT), 0)
	{
		WSADATA wsa;
		::WSAStartup(MAKEWORD(2, 2), &wsa);
	}

	main_window::~main_window()
	{
		::WSACleanup();
	}

	bool main_window::init()
	{
		HANDLE mutex = ::CreateMutexW(NULL, TRUE, window_mutex_);
		if (::GetLastError() == ERROR_ALREADY_EXISTS)
		{
			return false;
		}

		disable_ime();

		set_dpi_awareness();

		// create window
		register_window_class();
		if (!create_window())
			return false;

		return true;
	}


	int main_window::loop()
	{
		MSG message;

		while (::GetMessageW(&message, nullptr, 0, 0))
		{
			::TranslateMessage(&message);
			::DispatchMessageW(&message);
		}
		return (int)message.wParam;
	}

	void main_window::disable_ime()
	{
		::ImmDisableIME(-1);
	}

	void main_window::set_dpi_awareness()
	{
		auto desired_context = DPI_AWARENESS_CONTEXT_UNAWARE_GDISCALED;
		if (::IsValidDpiAwarenessContext(desired_context))
		{
			auto hr = ::SetProcessDpiAwarenessContext(desired_context);
			if (hr)
				return;
		}
	}

	ATOM main_window::register_window_class()
	{
		WNDCLASSEXW wcex;

		wcex.cbSize = sizeof(WNDCLASSEXW);

		wcex.style = CS_HREDRAW | CS_VREDRAW;
		wcex.lpfnWndProc = window_proc_common;
		wcex.cbClsExtra = 0;
		wcex.cbWndExtra = 0;
		wcex.hInstance = instance_;
		wcex.hIcon = ::LoadIconW(nullptr, IDI_APPLICATION);
		wcex.hCursor = ::LoadCursorW(nullptr, IDC_ARROW);
		wcex.hbrBackground = (HBRUSH)(COLOR_WINDOW);
		wcex.lpszMenuName = nullptr;
		wcex.lpszClassName = window_class_;
		wcex.hIconSm = ::LoadIconW(nullptr, IDI_APPLICATION);

		return ::RegisterClassExW(&wcex);
	}

	bool main_window::create_window()
	{
		window_ = ::CreateWindowExW(0, window_class_, window_title_, WS_OVERLAPPEDWINDOW,
			CW_USEDEFAULT, 0, CW_USEDEFAULT, 0, nullptr, nullptr, instance_, this);

		if (window_ == nullptr)
		{
			return false;
		}

		::ShowWindow(window_, SW_NORMAL);
		::UpdateWindow(window_);

		return true;
	}

	HWND main_window::create_tab()
	{
		tab_ = ::CreateWindowExW(0, WC_TABCONTROLW, L"", WS_CHILD | WS_CLIPSIBLINGS | WS_VISIBLE,
			0, 0, window_width_, window_height_, window_, (HMENU)MID_TAB, instance_, NULL);
		if (tab_)
		{
			::SendMessageW(tab_, WM_SETFONT, (WPARAM)font_, MAKELPARAM(1, 0));
		}
		return tab_;
	}

	void main_window::select_tab_item(UINT _id)
	{
		for (size_t i = 0; i < items_.size(); ++i)
		{
			for (const HWND item : items_.at(i))
			{
				if (i == _id)
				{
					::ShowWindow(item, SW_SHOW);
					if (std::find(edit_log_.begin(), edit_log_.end(), item) != edit_log_.end())
					{
						auto len = ::SendMessageW(item, WM_GETTEXTLENGTH, 0, 0);
						::SendMessageW(item, EM_SETSEL, (WPARAM)len, (LPARAM)len);
					}
				}
				else
				{
					::ShowWindow(item, SW_HIDE);
				}
			}
		}
	}

	void main_window::add_tab_item(UINT _id, const WCHAR* _text)
	{
		TC_ITEMW item;
		auto text = std::wstring(_text);

		std::memset(&item, 0, sizeof(TC_ITEM));

		item.mask = TCIF_TEXT;
		item.pszText = text.data();
		item.cchTextMax = text.length();
		::SendMessageW(tab_, TCM_INSERTITEMW, _id, (LPARAM)&item);
	}
	HWND main_window::create_label(HMENU _id, const WCHAR* _text, DWORD _x, DWORD _y, DWORD _width, DWORD _height)
	{
		auto label = ::CreateWindowExW(
			0, WC_STATICW, _text, WS_CHILD | WS_VISIBLE,
			_x, _y, _width, _height, window_, _id, instance_, NULL);
		if (label)
		{
			::SendMessageW(label, WM_SETFONT, (WPARAM)font_, MAKELPARAM(1, 0));
		}
		return label;
	}

	HWND main_window::create_edit(HMENU _id, DWORD _x, DWORD _y, DWORD _w, DWORD _h)
	{
		HWND edit = ::CreateWindowExW(
			0, WC_EDITW, L"",
			WS_CHILD | WS_VISIBLE | WS_BORDER | ES_MULTILINE | WS_VSCROLL | WS_HSCROLL | ES_AUTOHSCROLL | ES_AUTOVSCROLL | ES_READONLY,
			_x, _y, _w, _h, window_, (HMENU)_id, instance_, NULL);
		if (edit)
		{
			::SendMessageW(edit, WM_SETFONT, (WPARAM)font_, MAKELPARAM(1, 0));
			// 文字数制限を取っ払う
			::SendMessageW(edit, EM_SETLIMITTEXT, 0, 0);
		}
		return edit;
	}

	void main_window::create_menu(const std::vector<std::wstring>& _monitors)
	{
		HMENU menu;
		POINT pt;

		// TODO: currentにチェックを入れる

		menu = ::CreatePopupMenu();

		// 
		// ディスプレイ一覧を表示
		bool selected = false;
		for (UINT i = 0; i < _monitors.size(); ++i)
		{
			// _monitors.at(i) == monitor_current
			bool match = _monitors.at(i) == monitor_;
			if (match)
			{
				selected = true;
			}
			menu_checkeditem_create(menu, MID_POPUP_CAPTURE_MONITORPREFIX + i, _monitors.at(i), match);
		}
		menu_checkeditem_create(menu, MID_POPUP_CAPTURE_DISABLED, L"Disabled", selected == false);


		::GetCursorPos(&pt);
		::SetForegroundWindow(window_);
		::TrackPopupMenu(menu, 0, pt.x, pt.y, 0, window_, NULL);

		::DestroyMenu(menu);
	}

	LRESULT main_window::window_proc(UINT _message, WPARAM _wparam, LPARAM _lparam)
	{
		switch (_message)
		{
		case WM_CREATE:
		{

			// フォント作成
			font_ = ::CreateFontW(
				12, 0, 0, 0, FW_REGULAR,
				FALSE, FALSE, FALSE, DEFAULT_CHARSET, OUT_DEFAULT_PRECIS,
				CLIP_DEFAULT_PRECIS, DEFAULT_QUALITY, DEFAULT_PITCH | FF_MODERN,
				L"MS Shell Dlg");

			create_tab();
			add_tab_item(0, L"Main");
			add_tab_item(1, L"LiveAPI");
			add_tab_item(2, L"Core");
			add_tab_item(3, L"WebAPI");
			add_tab_item(4, L"Local");
			add_tab_item(5, L"Duplication");

			{
				// タブの中身作成
				RECT rect;
				RECT tabrect;
				DWORD top = 0;
				::GetClientRect(window_, &rect);
				::SendMessageW(tab_, TCM_GETITEMRECT, 0, (LPARAM)&tabrect);

				// IP等の情報
				top = tabrect.bottom + 10;
				items_.at(0).push_back(create_label((HMENU)MID_EDIT_LOG_LIVEAPI, L"LiveAPI Websocket", 10, top, rect.right - 20, 12));
				top += 12 + 5;
				items_.at(0).push_back(create_label((HMENU)MID_EDIT_LOG_LIVEAPI, (L"Listen Address:" + s_to_ws(ini_.get_liveapi_ipaddress() + ":" + std::to_string(ini_.get_liveapi_port()))).c_str(), 20, top, rect.right - 30, 12));
				top += 12 + 5;
				items_.at(0).push_back(create_label((HMENU)MID_EDIT_LOG_LIVEAPI, L"WebAPI Websocket", 10, top, rect.right - 20, 12));
				top += 12 + 5;
				items_.at(0).push_back(create_label((HMENU)MID_EDIT_LOG_LIVEAPI, (L"Listen Address:" + s_to_ws(ini_.get_webapi_ipaddress() + ":" + std::to_string(ini_.get_webapi_port()))).c_str(), 20, top, rect.right - 30, 12));
				top += 12 + 5;
				frame_rect_.left = 10;
				frame_rect_.top = top;
				frame_rect_.right = frame_rect_.left + CAPTURE_WIDTH;
				frame_rect_.bottom = frame_rect_.top + CAPTURE_HEIGHT;
				top += CAPTURE_HEIGHT + 5;
				items_.at(0).push_back(create_label((HMENU)MID_EDIT_LOG_LIVEAPI, L"Capture FPS:0", 20, top, rect.right - 30, 12));
				top += 12 + 5;
				items_.at(0).push_back(create_label((HMENU)MID_EDIT_LOG_LIVEAPI, L"Capture Total:0", 20, top, rect.right - 30, 12));
				top += 12 + 5;
				items_.at(0).push_back(create_label((HMENU)MID_EDIT_LOG_LIVEAPI, L"Capture Skipped:0", 20, top, rect.right - 30, 12));
				top += 12 + 5;
				items_.at(0).push_back(create_label((HMENU)MID_EDIT_LOG_LIVEAPI, L"Capture Exited:0", 20, top, rect.right - 30, 12));
				top += 12 + 5;


				// エディトボックス
				edit_log_.at(0) = create_edit((HMENU)MID_EDIT_LOG_LIVEAPI, 10, tabrect.bottom + 10, rect.right - 20, rect.bottom - (20 + tabrect.bottom));
				edit_log_.at(1) = create_edit((HMENU)MID_EDIT_LOG_CORE, 10, tabrect.bottom + 10, rect.right - 20, rect.bottom - (20 + tabrect.bottom));
				edit_log_.at(2) = create_edit((HMENU)MID_EDIT_LOG_WEBAPI, 10,  tabrect.bottom + 10, rect.right - 20, rect.bottom - (20 + tabrect.bottom));
				edit_log_.at(3) = create_edit((HMENU)MID_EDIT_LOG_LOCAL, 10, tabrect.bottom + 10, rect.right - 20, rect.bottom - (20 + tabrect.bottom));
				edit_log_.at(4) = create_edit((HMENU)MID_EDIT_LOG_DUPLICATION, 10, tabrect.bottom + 10, rect.right - 20, rect.bottom - (20 + tabrect.bottom));
				::ShowWindow(edit_log_.at(0), SW_HIDE);
				::ShowWindow(edit_log_.at(1), SW_HIDE);
				::ShowWindow(edit_log_.at(2), SW_HIDE);
				::ShowWindow(edit_log_.at(3), SW_HIDE);
				::ShowWindow(edit_log_.at(4), SW_HIDE);
				items_.at(1).push_back(edit_log_.at(0));
				items_.at(2).push_back(edit_log_.at(1));
				items_.at(3).push_back(edit_log_.at(2));
				items_.at(4).push_back(edit_log_.at(3));
				items_.at(5).push_back(edit_log_.at(4));
			}
			current_tab_ = SendMessageW(tab_, TCM_GETCURSEL, 0, 0);
			select_tab_item(current_tab_);

			// スレッド開始
			if (!core_thread_.run(window_)) return -1;
			if (!duplication_thread_.run(window_)) return -1;

			// タイマー設定
			::SetTimer(window_, TIMER_ID_PING, 20000, nullptr); // 20s
			::SetTimer(window_, TIMER_ID_CAPTURE, 100, nullptr); // 100ms
			::SetTimer(window_, TIMER_ID_STATS, 1000, nullptr); // 1s

			return 0;
		}

		case WM_PAINT:
		{
			if (buffer_.size() == CAPTURE_WIDTH * CAPTURE_HEIGHT && current_tab_ == 0)
			{
				RECT rect;
				if (::GetUpdateRect(window_, &rect, FALSE))
				{
					RECT intersect;
					if (::IntersectRect(&intersect, &frame_rect_, &rect))
					{
						// 取得した画像を表示
						PAINTSTRUCT ps;
						HDC dc = ::BeginPaint(window_, &ps);
						BITMAPINFO info;
						ZeroMemory(&info, sizeof(BITMAPINFO));
						info.bmiHeader.biBitCount = 32;
						info.bmiHeader.biWidth = CAPTURE_WIDTH;
						info.bmiHeader.biHeight = CAPTURE_HEIGHT;
						info.bmiHeader.biPlanes = 1;
						info.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
						info.bmiHeader.biSizeImage = CAPTURE_WIDTH * CAPTURE_HEIGHT * 4;
						info.bmiHeader.biCompression = BI_RGB;

						::StretchDIBits(dc, frame_rect_.left, frame_rect_.top, CAPTURE_WIDTH, CAPTURE_HEIGHT,
							0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT, buffer_.data(), &info, DIB_RGB_COLORS, SRCCOPY);

						::EndPaint(window_, &ps);
						::ValidateRect(window_, &frame_rect_);
					}
				}
			}
			break;
		}

		case WM_DESTROY:
			// スレッド停止
			duplication_thread_.stop();
			core_thread_.stop();

			::DeleteObject(font_);
			::PostQuitMessage(0);
			return 0;

		case WM_COMMAND:
			{
				WORD id = LOWORD(_wparam);
				if (_lparam == 0)
				{
					if (id == MID_POPUP_CAPTURE_DISABLED)
					{
						monitor_ = L"";
						duplication_thread_.request_set_monitor(monitor_);
						std::fill(buffer_.begin(), buffer_.end(), 0);
						::InvalidateRect(window_, &frame_rect_, FALSE);
					}
					else if (id >= MID_POPUP_CAPTURE_MONITORPREFIX)
					{
						const auto mid = id - MID_POPUP_CAPTURE_MONITORPREFIX;
						if (mid < monitors_.size())
						{
							monitor_ = monitors_.at(mid);
							duplication_thread_.request_set_monitor(monitor_);
						}
					}
				}
			}
			break;

		case WM_NOTIFY:
		{
			auto nmhdr = (LPNMHDR)_lparam;
			switch (nmhdr->code)
			{
			case TCN_SELCHANGE:
			{
				if (nmhdr->idFrom == MID_TAB)
				{
					auto id = SendMessageW(tab_, TCM_GETCURSEL, 0, 0);
					if (id >= 0)
					{
						current_tab_ = id;
						select_tab_item(id);
					}
				}
				break;
			}
			}
			break;
		}

		case WM_RBUTTONUP:
			if (current_tab_ == 0)
			{
				POINTS points = MAKEPOINTS(_lparam);
				POINT point;
				point.x = points.x;
				point.y = points.y;
				if (::PtInRect(&frame_rect_, point))
				{
					duplication_thread_.request_get_monitors();
				}
			}
			break;

		case WM_TIMER:
		{
			UINT id = _wparam;
			switch (id)
			{
			case TIMER_ID_PING:
				core_thread_.ping();
				return 0;
			case TIMER_ID_CAPTURE:
				duplication_thread_.request_capture();
				return 0;
			case TIMER_ID_STATS:
				duplication_thread_.request_stats();
				return 0;
			}
			break;
		}

		case CWM_LOG_UPDATE:
		{
			DWORD id = _wparam;
			auto text = log_read(id);
			if (text)
			{
				HWND edit = edit_log_.at(id);
				auto len = ::SendMessageW(edit, WM_GETTEXTLENGTH, 0, 0);
				::SendMessageW(edit, EM_SETSEL, (WPARAM)len, (LPARAM)len);
				::SendMessageW(edit, EM_REPLACESEL, FALSE, (LPARAM)text->c_str());
			}
		}
			break;

		case CWM_FRAME_ARRIVED:
		{
			buffer_ = duplication_thread_.get_buffer();
			if (current_tab_ == 0)
			{
				::InvalidateRect(window_, &frame_rect_, FALSE);
			}

			break;
		}

		case CWM_MONITORS_UPDATE:
			monitors_ = duplication_thread_.get_monitors();
			create_menu(monitors_);
			break;

		case CWM_DUPLICATION_STATS_UPDATE:
		{
			auto stats = duplication_thread_.get_stats();
			if (7 < items_.at(0).size())
			{
				::SetWindowTextW(items_.at(0).at(4), (L"Capture FPS: " + std::to_wstring(stats.fps)).c_str());
				::SetWindowTextW(items_.at(0).at(5), (L"Capture Total: " + std::to_wstring(stats.total)).c_str());
				::SetWindowTextW(items_.at(0).at(6), (L"Capture Skipped: " + std::to_wstring(stats.skipped)).c_str());
				::SetWindowTextW(items_.at(0).at(7), (L"Capture Exited: " + std::to_wstring(stats.exited)).c_str());
			}
			break;
		}

		case CWM_MENUBANNER_STATE:
		{
			UINT state = _wparam;
			if (state > 0)
			{
				core_thread_.push_message(CORE_MESSAGE_TEAMBANNER_STATE_SHOW);
			}
			else
			{
				core_thread_.push_message(CORE_MESSAGE_TEAMBANNER_STATE_HIDE);
			}
		}

		default:
			break;
		}

		return ::DefWindowProcW(window_, _message, _wparam, _lparam);
	}

	LRESULT CALLBACK main_window::window_proc_common(HWND _window, UINT _message, WPARAM _wparam, LPARAM _lparam)
	{
		if (_message == WM_NCCREATE)
		{
			// createwindowで指定したポイントからインスタンスを取得
			auto cs = reinterpret_cast<CREATESTRUCTW*>(_lparam);
			auto instance = reinterpret_cast<main_window*>(cs->lpCreateParams);

			instance->window_ = _window;

			// ログの設定
			log_set_window(_window);

			// USERDATAにポインタ格納
			::SetWindowLongPtrW(_window, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(instance));
		}
		else if(_message == WM_GETMINMAXINFO)
		{
			MINMAXINFO* mminfo = (MINMAXINFO*)_lparam;
			mminfo->ptMaxSize.x = window_width_;
			mminfo->ptMaxSize.y = window_height_;
			mminfo->ptMaxPosition.x = 0;
			mminfo->ptMaxPosition.y = 0;
			mminfo->ptMinTrackSize.x = window_width_;
			mminfo->ptMinTrackSize.y = window_height_;
			mminfo->ptMaxTrackSize.x = window_width_;
			mminfo->ptMaxTrackSize.y = window_height_;
			return 0;
		}

		// 既にデータが格納されていたらインスタンスのプロシージャを呼び出す
		if (auto ptr = reinterpret_cast<main_window*>(::GetWindowLongPtrW(_window, GWLP_USERDATA)))
		{
			return ptr->window_proc(_message, _wparam, _lparam);
		}

		return ::DefWindowProcW(_window, _message, _wparam, _lparam);
	}
}
