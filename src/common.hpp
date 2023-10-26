#pragma once

#define WINVER       0x0A00 // windows10
#define _WIN32_WINNT 0x0A00 // windows10

#include <WinSDKVer.h>

#include <winsock2.h>
#include <windows.h>

#if defined _M_IX86
#pragma comment(linker,"/manifestdependency:\"type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='x86' publicKeyToken='6595b64144ccf1df' language='*'\"")
#elif defined _M_AMD64
#pragma comment(linker,"/manifestdependency:\"type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='amd64' publicKeyToken='6595b64144ccf1df' language='*'\"")
#elif defined _M_ARM
#pragma comment(linker,"/manifestdependency:\"type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='arm' publicKeyToken='6595b64144ccf1df' language='*'\"")
#elif defined _M_ARM64
#pragma comment(linker,"/manifestdependency:\"type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='arm64' publicKeyToken='6595b64144ccf1df' language='*'\"")
#else
#pragma comment(linker,"/manifestdependency:\"type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'\"")
#endif

namespace app {
	constexpr UINT CWM_LOG_UPDATE = WM_APP + 1;
	constexpr UINT CWM_MONITORS_UPDATE = WM_APP + 2;
	constexpr UINT CWM_FRAME_ARRIVED = WM_APP + 3;
	constexpr UINT CWM_DUPLICATION_STATS_UPDATE = WM_APP + 4;
	constexpr UINT CWM_MENUBANNER_STATE = WM_APP + 5;
	constexpr UINT CWM_WEBSOCKET_STATS_CONNECTION_COUNT = WM_APP + 6;
	constexpr UINT CWM_WEBSOCKET_STATS_RECV_COUNT = WM_APP + 7;
	constexpr UINT CWM_WEBSOCKET_STATS_SEND_COUNT = WM_APP + 8;
	constexpr UINT LOGNUMS = 5;

	constexpr UINT CAPTURE_SQUARE_WIDTH = 32;
	constexpr UINT CAPTURE_WIDTH = CAPTURE_SQUARE_WIDTH * 4;
	constexpr UINT CAPTURE_HEIGHT = CAPTURE_SQUARE_WIDTH;
}
