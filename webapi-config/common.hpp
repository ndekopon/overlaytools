#pragma once

#define WINVER       0x0A00 // windows10
#define _WIN32_WINNT 0x0A00 // windows10

#include <WinSDKVer.h>

#define WIN32_LEAN_AND_MEAN

#include <windows.h>

#include <wil/com.h>
#include <wil/resource.h>
#include <wil/result.h>
#include <winrt/base.h>
#include <winrt/Windows.Foundation.h>
#include <wrl.h>

#include <WebView2.h>
#include <WebView2EnvironmentOptions.h>
