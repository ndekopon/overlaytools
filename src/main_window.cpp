#include "main_window.hpp"

#include "log.hpp"

#include <imm.h>
#include <commctrl.h>

#pragma comment(lib, "imm32.lib")
#pragma comment(lib, "Ws2_32.lib")
#pragma comment(lib, "Comctl32.lib")

namespace
{
}

namespace app
{
	constexpr UINT MID_TAB = 1;
	constexpr UINT MID_RADIO_LIVEAPI = 1;
	constexpr UINT MID_RADIO_CORE = 2;
	constexpr UINT MID_RADIO_WEBAPI = 3;
	constexpr UINT MID_RADIO_LOCAL = 4;
	constexpr UINT MID_EDIT_LOG_LIVEAPI = 5;
	constexpr UINT MID_EDIT_LOG_CORE = 6;
	constexpr UINT MID_EDIT_LOG_WEBAPI = 7;
	constexpr UINT MID_EDIT_LOG_LOCAL = 7;

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

	HWND main_window::create_radiobutton(const WCHAR *_title, HMENU _id, DWORD _x, DWORD _y, SIZE &_size, HFONT _font)
	{
		HWND radio = nullptr;

		radio = ::CreateWindowExW(0, WC_BUTTONW, _title, WS_CHILD | WS_VISIBLE | BS_AUTORADIOBUTTON, _x, _y, 100, 20, window_, (HMENU)_id, instance_, NULL);
		if (radio)
		{
			::SendMessageW(radio, WM_SETFONT, (WPARAM)_font, MAKELPARAM(1, 0));
			::SendMessageW(radio, BCM_GETIDEALSIZE, 0, (LPARAM)&_size);
			::SetWindowPos(radio, NULL, 0, 0, _size.cx, _size.cy, SWP_NOMOVE | SWP_NOZORDER);
		}
		return radio;
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


	HWND main_window::create_edit(HMENU _id, DWORD _x, DWORD _y, DWORD _w, DWORD _h, HFONT _font)
	{
		HWND edit = ::CreateWindowExW(
			0, WC_EDITW, L"",
			WS_CHILD | WS_VISIBLE | WS_BORDER | ES_MULTILINE | WS_VSCROLL | WS_HSCROLL | ES_AUTOHSCROLL | ES_AUTOVSCROLL | ES_READONLY,
			_x, _y, _w, _h, window_, (HMENU)_id, instance_, NULL);
		if (edit)
		{
			::SendMessageW(edit, WM_SETFONT, (WPARAM)_font, MAKELPARAM(1, 0));
			// 文字数制限を取っ払う
			::SendMessageW(edit, EM_SETLIMITTEXT, 0, 0);
		}
		return edit;
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

			// タブの中身作成
			{
				RECT rect;
				RECT tabrect;
				SIZE radiosize;
				LONG left = 10;
				::GetClientRect(window_, &rect);
				::SendMessageW(tab_, TCM_GETITEMRECT, 0, (LPARAM)&tabrect);

				// エディトボックス
				edit_log_.at(0) = create_edit((HMENU)MID_EDIT_LOG_LIVEAPI, 10, tabrect.bottom + 10, rect.right - 20, rect.bottom - (20 + tabrect.bottom), font_);
				edit_log_.at(1) = create_edit((HMENU)MID_EDIT_LOG_CORE, 10, tabrect.bottom + 10, rect.right - 20, rect.bottom - (20 + tabrect.bottom), font_);
				edit_log_.at(2) = create_edit((HMENU)MID_EDIT_LOG_WEBAPI, 10,  tabrect.bottom + 10, rect.right - 20, rect.bottom - (20 + tabrect.bottom), font_);
				edit_log_.at(3) = create_edit((HMENU)MID_EDIT_LOG_LOCAL, 10, tabrect.bottom + 10, rect.right - 20, rect.bottom - (20 + tabrect.bottom), font_);
				::ShowWindow(edit_log_.at(0), SW_HIDE);
				::ShowWindow(edit_log_.at(1), SW_HIDE);
				::ShowWindow(edit_log_.at(2), SW_HIDE);
				::ShowWindow(edit_log_.at(3), SW_HIDE);
				items_.at(1).push_back(edit_log_.at(0));
				items_.at(2).push_back(edit_log_.at(1));
				items_.at(3).push_back(edit_log_.at(2));
				items_.at(4).push_back(edit_log_.at(3));
			}
			select_tab_item(SendMessageW(tab_, TCM_GETCURSEL, 0, 0));

			// スレッド開始
			if (!core_thread_.run(window_)) return -1;

			// タイマー設定
			::SetTimer(window_, 1, 20000, nullptr);

			return 0;
		}

		case WM_DESTROY:
			// スレッド停止
			core_thread_.stop();

			::DeleteObject(font_);
			::PostQuitMessage(0);
			return 0;

		case WM_COMMAND:
			{
				WORD id = LOWORD(_wparam);
				if (id == MID_RADIO_LIVEAPI)
				{
					::ShowWindow(edit_log_.at(0), SW_SHOW);
					::ShowWindow(edit_log_.at(1), SW_HIDE);
					::ShowWindow(edit_log_.at(2), SW_HIDE);
					::ShowWindow(edit_log_.at(3), SW_HIDE);
					auto len = ::SendMessageW(edit_log_.at(0), WM_GETTEXTLENGTH, 0, 0);
					::SendMessageW(edit_log_.at(0), EM_SETSEL, (WPARAM)len, (LPARAM)len);
				}
				else if (id == MID_RADIO_CORE)
				{
					::ShowWindow(edit_log_.at(0), SW_HIDE);
					::ShowWindow(edit_log_.at(1), SW_SHOW);
					::ShowWindow(edit_log_.at(2), SW_HIDE);
					::ShowWindow(edit_log_.at(3), SW_HIDE);
					auto len = ::SendMessageW(edit_log_.at(1), WM_GETTEXTLENGTH, 0, 0);
					::SendMessageW(edit_log_.at(1), EM_SETSEL, (WPARAM)len, (LPARAM)len);
				}
				else if (id == MID_RADIO_WEBAPI)
				{
					::ShowWindow(edit_log_.at(0), SW_HIDE);
					::ShowWindow(edit_log_.at(1), SW_HIDE);
					::ShowWindow(edit_log_.at(2), SW_SHOW);
					::ShowWindow(edit_log_.at(3), SW_HIDE);
					auto len = ::SendMessageW(edit_log_.at(2), WM_GETTEXTLENGTH, 0, 0);
					::SendMessageW(edit_log_.at(2), EM_SETSEL, (WPARAM)len, (LPARAM)len);
				}
				else if (id == MID_RADIO_LOCAL)
				{
					::ShowWindow(edit_log_.at(0), SW_HIDE);
					::ShowWindow(edit_log_.at(1), SW_HIDE);
					::ShowWindow(edit_log_.at(2), SW_HIDE);
					::ShowWindow(edit_log_.at(3), SW_SHOW);
					auto len = ::SendMessageW(edit_log_.at(3), WM_GETTEXTLENGTH, 0, 0);
					::SendMessageW(edit_log_.at(3), EM_SETSEL, (WPARAM)len, (LPARAM)len);
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
				auto id = SendMessageW(tab_, TCM_GETCURSEL, 0, 0);
				if (id >= 0)
				{
					select_tab_item(id);
				}
				break;
			}
			}
			break;
		}

		case WM_TIMER:
		{
			if (_wparam == 1)
			{
				core_thread_.ping();
				return 0;
			}
		}
			break;

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
