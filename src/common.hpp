﻿#pragma once

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
	constexpr UINT LOGNUMS = 5;

	constexpr UINT CAPTURE_TOP = 700;
	constexpr UINT CAPTURE_WIDTH = 200;
	constexpr UINT CAPTURE_HEIGHT = 100;
}
