#include "main_window.hpp"

using namespace Microsoft::WRL;

namespace {
	std::wstring get_htdocs()
	{
		std::vector<WCHAR> buf(32767, L'\0');
		std::wstring r = L"";

		// モジュールインスタンスからDLLパスを取得
		auto loaded = ::GetModuleFileNameW(::GetModuleHandleW(nullptr), buf.data(), buf.size());

		for (DWORD i = loaded - 1; i != 0; --i)
		{
			if (buf.at(i) == L'\\')
			{
				buf.at(i) = L'\0';
				break;
			}
		}

		r.reserve(loaded + 10);

		// パスの合成
		r += buf.data();
		r += L"\\htdocs";

		return r;
	}
}

namespace app
{
	const wchar_t* main_window::window_class_ = L"webapi-config-mainwindow";
	const wchar_t* main_window::window_title_ = L"webapi-config";
	const LONG main_window::window_min_width_ = 640;
	const LONG main_window::window_min_height_ = 480;

	main_window::main_window(HINSTANCE _instance)
		: instance_(_instance)
		, window_(nullptr)
		, webview_env_()
		, webview_ctrl_()
		, webview_()
		, webview3_()
		, token_newwindowrequested_()
	{
	}

	main_window::~main_window()
	{
	}

	bool main_window::init()
	{
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

		::CreateCoreWebView2EnvironmentWithOptions(nullptr, nullptr, nullptr,
			Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
				[this](HRESULT _result, ICoreWebView2Environment* _env) -> HRESULT
				{
					webview_env_ = _env;
					webview_env_->CreateCoreWebView2Controller(this->window_, Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
						[this](HRESULT _result, ICoreWebView2Controller* _controller) -> HRESULT {
							webview_ctrl_ = _controller;
							wil::com_ptr<ICoreWebView2> corewebview;
							if (_controller != nullptr)
							{
								_controller->get_CoreWebView2(&corewebview);
								corewebview.query_to(&webview_);
							}

							// WebViewの基本設定
							wil::com_ptr<ICoreWebView2Settings> settings;
							webview_->get_Settings(&settings);
							settings->put_IsScriptEnabled(TRUE);
							settings->put_AreDefaultScriptDialogsEnabled(TRUE);
							settings->put_IsWebMessageEnabled(TRUE);
							settings->put_AreDevToolsEnabled(FALSE);
							
							// 特定のホスト名をディレクトリにマッピングする
							webview3_ = corewebview.try_query<ICoreWebView2_3>();
							if (webview3_)
							{
								webview3_->SetVirtualHostNameToFolderMapping(
									L"webapi-config.example", get_htdocs().c_str(),
									COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_DENY_CORS);
							}

							// 新しいウィンドウを開かない
							webview_->add_NewWindowRequested(
								Callback<ICoreWebView2NewWindowRequestedEventHandler>(
									[this](ICoreWebView2* sender, ICoreWebView2NewWindowRequestedEventArgs* args)
									{
										args->put_Handled(TRUE);
										return S_OK;
									}).Get(), &token_newwindowrequested_
							);

							// サイズを合わせる
							RECT bounds;
							::GetClientRect(window_, &bounds);
							webview_ctrl_->put_Bounds(bounds);

							// 管理画面を開く
							webview_->Navigate(L"http://webapi-config.example/index.html");

							return S_OK;
						}).Get());
					return S_OK;
				}).Get());

		return true;
	}

	LRESULT main_window::window_proc(UINT _message, WPARAM _wparam, LPARAM _lparam)
	{
		switch (_message)
		{
		case WM_CREATE:
		{
			return 0;
		}

		case WM_DESTROY:
			::PostQuitMessage(0);
			return 0;

		case WM_SIZE:
		{
			if (_lparam != 0 && webview_ctrl_)
			{
				RECT bounds;
				::GetClientRect(window_, &bounds);
				webview_ctrl_->put_Bounds(bounds);
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

			// USERDATAにポインタ格納
			::SetWindowLongPtrW(_window, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(instance));
		}
		else if(_message == WM_GETMINMAXINFO)
		{
			MINMAXINFO* mminfo = (MINMAXINFO*)_lparam;
			mminfo->ptMinTrackSize.x = window_min_width_;
			mminfo->ptMinTrackSize.y = window_min_height_;
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
