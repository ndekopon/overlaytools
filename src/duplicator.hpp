#pragma once

#include "common.hpp"

#include <dxgi1_6.h>
#include <d3d11.h>

#include <string>
#include <vector>
#include <utility>

#include <atlbase.h>

namespace app {
	class duplicator {
	private:
		CComPtr<ID3D11Device> device_;
		CComPtr<ID3D11DeviceContext> device_context_;
		CComPtr<IDXGIOutputDuplication> output_duplication_;
		CComPtr<ID3D11Texture2D> cpu_texture_;

		D3D_FEATURE_LEVEL feature_level_;

		UINT width_;
		UINT height_;

		std::wstring monitor_;

		bool recreate_output_duplication_;

		HRESULT init_output_duplication();
		bool init_texture();

		HRESULT get_desktop_as_texture();
		bool copy_to_buffer(std::vector<uint32_t>& _buffer, uint16_t _top, uint16_t _width, uint16_t _height);

	public:

		enum GetFrameError {
			No_Error,
			Error_Action_Skip,
			Error_Action_Exit
		};

		duplicator();

		bool create();

		bool select_monitor(const std::wstring &_monitor);

		std::vector<std::wstring> get_monitors();

		GetFrameError get_frame(std::vector<uint32_t>& _buffer, uint16_t _top, uint16_t _width, uint16_t _height);

		std::pair<size_t, size_t> get_size();

		std::wstring get_monitor();
	};
}