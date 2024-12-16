#include "events\events.pb.h"

#include <google/protobuf/util/json_util.h>

#include <nlohmann/json.hpp>

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
		uint64_t timestamp = 0;
		std::memcpy(&size, buf.data() + i, sizeof(size));
		i += sizeof(size);
		std::memcpy(&timestamp, buf.data() + i, sizeof(timestamp));
		i += sizeof(timestamp);

		rtech::liveapi::LiveAPIEvent ev;
		if (ev.ParseFromArray(buf.data() + i, size))
		{
			if (count > 0)
			{
				outstream << "," << std::endl;
			}
			std::string out;
			auto status = google::protobuf::util::MessageToJsonString(ev, &out);
			if (status.ok())
			{
				try
				{
					auto j = nlohmann::json::parse(out);
					if (j.contains("gameMessage"))
					{
						if (j["gameMessage"].contains("receivedTimestamp"))
						{
							j["gameMessage"].at("receivedTimestamp") = timestamp;
						}
						else
						{
							j["gameMessage"].emplace("receivedTimestamp", timestamp);
						}
					}
					outstream << j.dump();
				}
				catch (...)
				{

				}
			}
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
