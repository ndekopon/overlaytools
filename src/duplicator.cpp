#include "duplicator.hpp"

#include "log.hpp"

#include <algorithm>
#include <iostream>
#include <iterator>

#pragma comment(lib, "D3D11.lib")
#pragma comment(lib, "DXGI.lib")

namespace {

	constexpr UINT REQUIRED_WIDTH = 1920;
	constexpr UINT REQUIRED_HEIGHT = 1080;


	std::wstring get_monitor_name(HMONITOR _monitor)
	{

		MONITORINFOEXW info;
		info.cbSize = sizeof(info);
		::GetMonitorInfoW(_monitor, &info);

		UINT32 required_paths, required_modes;
		::GetDisplayConfigBufferSizes(QDC_ONLY_ACTIVE_PATHS, &required_paths, &required_modes);
		std::vector<DISPLAYCONFIG_PATH_INFO> paths(required_paths);
		std::vector<DISPLAYCONFIG_MODE_INFO> modes(required_modes);
		::QueryDisplayConfig(QDC_ONLY_ACTIVE_PATHS, &required_paths, paths.data(), &required_modes, modes.data(), nullptr);

		for (auto& p : paths)
		{
			DISPLAYCONFIG_SOURCE_DEVICE_NAME source_name;
			source_name.header.type = DISPLAYCONFIG_DEVICE_INFO_GET_SOURCE_NAME;
			source_name.header.size = sizeof(source_name);
			source_name.header.adapterId = p.sourceInfo.adapterId;
			source_name.header.id = p.sourceInfo.id;
			::DisplayConfigGetDeviceInfo(&source_name.header);
			if (::wcscmp(info.szDevice, source_name.viewGdiDeviceName) == 0)
			{
				DISPLAYCONFIG_TARGET_DEVICE_NAME name;
				name.header.type = DISPLAYCONFIG_DEVICE_INFO_GET_TARGET_NAME;
				name.header.size = sizeof(name);
				name.header.adapterId = p.sourceInfo.adapterId;
				name.header.id = p.targetInfo.id;
				::DisplayConfigGetDeviceInfo(&name.header);
				return std::wstring(name.monitorFriendlyDeviceName);
			}
		}

		return L"";
	}

	inline std::wstring trim(const std::wstring& s)
	{
		auto a = s.find_first_not_of(L" \t\r\n");
		if (a == std::wstring::npos) return L"";
		auto b = s.find_last_not_of(L" \t\r\n");
		return s.substr(a, b - a + 1);
	}

	bool contains_value(const std::vector<std::wstring>& _t, const std::wstring& _v)
	{
		for (const auto& s : _t)
		{
			if (s == _v) return true;
		}
		return false;
	}
}

namespace app {

	// Feature levels supported
	const D3D_FEATURE_LEVEL feature_levels[] =
	{
		D3D_FEATURE_LEVEL_11_1,
		D3D_FEATURE_LEVEL_11_0,
		D3D_FEATURE_LEVEL_10_1,
		D3D_FEATURE_LEVEL_10_0,
		D3D_FEATURE_LEVEL_9_3
	};

	// DXGI_SUPPORT_FORMAT;
	const DXGI_FORMAT formats[] =
	{
		DXGI_FORMAT_B8G8R8A8_UNORM
	};

	duplicator::duplicator()
		: device_(nullptr)
		, device_context_(nullptr)
		, output_duplication_(nullptr)
		, cpu_texture_(nullptr)
		, recreate_output_duplication_(true)
		, feature_level_(D3D_FEATURE_LEVEL_11_1)
		, width_(0)
		, height_(0)
		, monitor_(L"")
	{
	}

	bool duplicator::create()
	{
		HRESULT hr = ::D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr, 0, feature_levels, ARRAYSIZE(feature_levels), D3D11_SDK_VERSION, &device_, &feature_level_, &device_context_);
		if (FAILED(hr))
		{
			log(LOG_DUPLICATION, L"Info: D3D11CreateDevice fallback to D3D_DRIVER_TYPE_WARP.");
			HRESULT hr = ::D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_WARP, nullptr, 0, feature_levels, ARRAYSIZE(feature_levels), D3D11_SDK_VERSION, &device_, &feature_level_, &device_context_);
			if (FAILED(hr))
			{
				log(LOG_DUPLICATION, L"Error: D3D11CreateDevice() failed.");
				return false;
			}
		}
		device_->GetImmediateContext(&device_context_);

		return true;
	}

	bool duplicator::select_monitor(const std::wstring& _monitor)
	{
		auto monitors = get_monitors();
		if (monitors.size() == 0) return false;

		if (contains_value(monitors, _monitor))
		{
			monitor_ = _monitor;
			recreate_output_duplication_ = true;
			return true;
		}

		return false;
	}

	std::vector<std::wstring> duplicator::get_monitors()
	{
		std::vector<std::wstring> monitors;

		CComPtr<IDXGIFactory7> factory;
		HRESULT hr = ::CreateDXGIFactory(IID_PPV_ARGS(&factory));
		if (FAILED(hr)) return monitors;

		CComPtr<IDXGIAdapter2> adapter;

		for (UINT i = 0; factory->EnumAdapterByGpuPreference(i, DXGI_GPU_PREFERENCE_HIGH_PERFORMANCE, IID_PPV_ARGS(&adapter)) != DXGI_ERROR_NOT_FOUND; ++i)
		{
			DXGI_ADAPTER_DESC2 desc2;
			adapter->GetDesc2(&desc2);
			std::wstring adapter_desc = desc2.Description;
			
			CComPtr<IDXGIOutput> output;
			for (UINT j = 0; adapter->EnumOutputs(j, &output) != DXGI_ERROR_NOT_FOUND; ++j)
			{	
				DXGI_OUTPUT_DESC odesc;
				output->GetDesc(&odesc);

				std::wstring monitor = odesc.DeviceName;
				monitor += L"[";
				monitor += ::trim(::get_monitor_name(odesc.Monitor));
				monitor += L"]";
				
				// 実際にAPIを使えるか試してみる
				CComPtr<IDXGIOutput1> output1;
				CComPtr<IDXGIOutputDuplication> output_duplication;

				auto hr = output->QueryInterface(IID_PPV_ARGS(&output1));
				if (FAILED(hr)) continue;

				hr = output1->DuplicateOutput(device_, &output_duplication);
				if (FAILED(hr)) continue;

				// サイズの確認
				DXGI_OUTDUPL_DESC dupl_desc;
				output_duplication->GetDesc(&dupl_desc);

				if (dupl_desc.ModeDesc.Width != REQUIRED_WIDTH) continue;
				if (dupl_desc.ModeDesc.Height != REQUIRED_HEIGHT) continue;

				// 使える場合はリストに追加
				monitors.push_back(adapter_desc + L" - " + monitor);
			}
		}

		if (monitor_ != L"" && !contains_value(monitors, monitor_))
		{
			monitors.push_back(monitor_);
		}

		// ソート
		std::sort(monitors.begin(), monitors.end());

		return monitors;
	}


	HRESULT duplicator::init_output_duplication()
	{
		HRESULT hr;
		output_duplication_ = nullptr;

		CComPtr<IDXGIFactory7> factory;
		hr = ::CreateDXGIFactory(IID_PPV_ARGS(&factory));
		if (FAILED(hr)) return hr;

		CComPtr<IDXGIAdapter2> adapter;

		for (UINT i = 0; factory->EnumAdapterByGpuPreference(i, DXGI_GPU_PREFERENCE_HIGH_PERFORMANCE, IID_PPV_ARGS(&adapter)) != DXGI_ERROR_NOT_FOUND; ++i)
		{
			DXGI_ADAPTER_DESC2 desc2;
			adapter->GetDesc2(&desc2);
			std::wstring adapter_desc = desc2.Description;

			CComPtr<IDXGIOutput> output;
			for (UINT j = 0; adapter->EnumOutputs(j, &output) != DXGI_ERROR_NOT_FOUND; ++j)
			{
				DXGI_OUTPUT_DESC odesc;
				output->GetDesc(&odesc);

				std::wstring monitor = odesc.DeviceName;
				monitor += L"[";
				monitor += ::trim(::get_monitor_name(odesc.Monitor));
				monitor += L"]";

				if (monitor != L"") {
					std::wstring name = adapter_desc + L" - " + monitor;

					if (name == monitor_)
					{
						// 対象のモニターと一致
						CComPtr<IDXGIOutput1> output1;

						hr = output->QueryInterface(IID_PPV_ARGS(&output1));
						if (FAILED(hr)) return hr;

						hr = output1->DuplicateOutput(device_, &output_duplication_);
						if (FAILED(hr)) return hr;

						// サイズの確認
						DXGI_OUTDUPL_DESC dupl_desc;
						output_duplication_->GetDesc(&dupl_desc);

						if (dupl_desc.ModeDesc.Width != REQUIRED_WIDTH) continue;
						if (dupl_desc.ModeDesc.Height != REQUIRED_HEIGHT) continue;

						return hr;
					}
				}
			}
		}

		// 対象のモニタが見つからない場合は失敗
		return HRESULT_FROM_WIN32(ERROR_NOT_FOUND);
	}

	bool duplicator::init_texture()
	{
		HRESULT hr;
		DXGI_OUTDUPL_DESC dupl_desc;
		D3D11_TEXTURE2D_DESC desc;

		output_duplication_->GetDesc(&dupl_desc);

		desc.Width = dupl_desc.ModeDesc.Width;
		desc.Height = dupl_desc.ModeDesc.Height;
		desc.Format = dupl_desc.ModeDesc.Format;
		desc.ArraySize = 1;
		desc.BindFlags = 0;
		desc.MiscFlags = 0;
		desc.SampleDesc.Count = 1;
		desc.SampleDesc.Quality = 0;
		desc.MipLevels = 1;
		desc.CPUAccessFlags = D3D11_CPU_ACCESS_READ | D3D11_CPU_ACCESS_WRITE;
		desc.Usage = D3D11_USAGE_STAGING;

		hr = device_->CreateTexture2D(&desc, NULL, &cpu_texture_);

		width_ = desc.Width;
		height_ = desc.Height;

		if (FAILED(hr)) return false;

		return true;
	}

	HRESULT duplicator::get_desktop_as_texture()
	{
		HRESULT hr = HRESULT_FROM_WIN32(ERROR_NOT_FOUND);

		if (output_duplication_)
		{
			CComPtr<IDXGIResource> resource;
			CComPtr<ID3D11Texture2D> gpu_texture;
			DXGI_OUTDUPL_FRAME_INFO frame_info;
			hr = output_duplication_->AcquireNextFrame(250, &frame_info, &resource);
			if (FAILED(hr)) return hr;

			hr = resource->QueryInterface(IID_PPV_ARGS(&gpu_texture));
			if (FAILED(hr)) return hr;

			device_context_->CopyResource(cpu_texture_, gpu_texture);

			hr = output_duplication_->ReleaseFrame();
			if (FAILED(hr)) return hr;
		}

		return hr;
	}

	bool duplicator::copy_to_buffer(std::vector<uint32_t>& _buffer)
	{
		D3D11_MAPPED_SUBRESOURCE resource;
		UINT subresource = D3D11CalcSubresource(0, 0, 0);
		device_context_->Map(cpu_texture_, subresource, D3D11_MAP_READ_WRITE, 0, &resource);


		if (_buffer.size() < CAPTURE_WIDTH * CAPTURE_HEIGHT)
		{
			_buffer.resize(CAPTURE_WIDTH * CAPTURE_HEIGHT);
		}

		rsize_t copybytes = std::min<rsize_t>(CAPTURE_SQUARE_WIDTH * 4, resource.RowPitch);

		// ポインタの準備(teambanner,craftpoint,menu,team1frame)
		const auto points = std::array<std::pair<size_t, size_t>, 4>({ { 42, 734 }, { 1616, 50 }, { 1872, 1030 }, { 86, 98 } });
		for (size_t i = 0; i < points.size(); ++i)
		{
			const auto x = points.at(i).first;
			const auto y = points.at(i).second;

			BYTE* sptr = reinterpret_cast<BYTE*>(resource.pData) + y * resource.RowPitch + x * 4;
			uint32_t* dptr = _buffer.data() + CAPTURE_WIDTH * (CAPTURE_HEIGHT - 1) + i * CAPTURE_SQUARE_WIDTH;

			// BMPの順序でコピーする
			for (size_t tmp_y = y; tmp_y < y + CAPTURE_HEIGHT && tmp_y < height_; ++tmp_y)
			{
				std::memcpy(dptr, sptr, copybytes);

				sptr += resource.RowPitch;
				dptr -= CAPTURE_WIDTH;
			}

			device_context_->Unmap(cpu_texture_, subresource);
		}

		return true;
	}

	duplicator::GetFrameError duplicator::get_frame(std::vector<uint32_t>& _buffer)
	{
		HRESULT hr;

		if (recreate_output_duplication_)
		{
			hr = init_output_duplication();
			if (FAILED(hr))
			{
				switch (hr)
				{
				case E_ACCESSDENIED:
					// 管理者権限のメッセージボックス表示中等
					return GetFrameError::Error_Action_Skip;
				}
				return GetFrameError::Error_Action_Exit;
			}

			if (!init_texture()) return GetFrameError::Error_Action_Exit;

			recreate_output_duplication_ = false;
		}

		hr = get_desktop_as_texture();
		if (FAILED(hr))
		{
			switch (hr)
			{
			case DXGI_ERROR_ACCESS_LOST:
				recreate_output_duplication_ = true;
				return GetFrameError::Error_Action_Skip;
			case DXGI_ERROR_WAIT_TIMEOUT:
				return GetFrameError::Error_Action_Skip;
			case DXGI_ERROR_INVALID_CALL:
				return GetFrameError::Error_Action_Exit;
			case E_INVALIDARG:
				return GetFrameError::Error_Action_Exit;
			}

			return GetFrameError::Error_Action_Exit;
		}

		if (!copy_to_buffer(_buffer)) return GetFrameError::Error_Action_Exit;

		return GetFrameError::No_Error;
	}
}
