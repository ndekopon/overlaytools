#include "events\events.pb.h"

#include <google/protobuf/util/json_util.h>

#include <iostream>
#include <vector>
#include <fstream>
#include <string>
#include <cstdint>


void convert(const std::wstring& _filepath)
{
	std::ifstream instream(_filepath, std::ios::in | std::ios::binary);
	std::vector<uint8_t> buf((std::istreambuf_iterator<char>(instream)), std::istreambuf_iterator<char>());

	std::wstring filepath_json = _filepath;
	filepath_json += L".json";

	std::ofstream outstream(filepath_json, std::ios::out | std::ios::binary);

	size_t count = 0;

	outstream << "[" << std::endl;
	for (size_t i = sizeof(uint64_t) + sizeof(uint64_t); i < buf.size(); )
	{
		uint32_t size = 0;
		std::memcpy(&size, buf.data() + i, sizeof(size));
		i += sizeof(size);
		i += sizeof(uint64_t); // タイムスタンプは無視

		rtech::liveapi::LiveAPIEvent ev;
		if (ev.ParseFromArray(buf.data() + i, size))
		{
			if (count > 0)
			{
				outstream << "," << std::endl;
			}
			std::string out;
			google::protobuf::util::MessageToJsonString(ev, &out);
			outstream << out;
			++count;
		}
		i += size;
	}
	outstream << std::endl << "]";

}

int wmain(int _argc, wchar_t *_argv[])
{
	if (_argc < 2)
	{
		std::cerr << "usage: dump2json.exe <filename> [<filename> ...]\r\n";
		return 1;
	}

	for (int i = 1; i < _argc; ++i)
	{
		convert(_argv[i]);
	}

	return 0;
}
