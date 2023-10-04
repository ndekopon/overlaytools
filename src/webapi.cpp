#include "webapi.hpp"

#include <stdexcept>

namespace {
}

namespace app {
	//

	received_webapi_data::received_webapi_data()
		: buffer_(nullptr)
		, offsets_()
	{
	}

	received_webapi_data::~received_webapi_data()
	{
	}

	uint8_t received_webapi_data::event_type()
	{
		if (buffer_ == nullptr) return 0;
		if (buffer_->size() < 2) return 0;
		return buffer_->at(0);
	}

	uint8_t received_webapi_data::size()
	{
		if (buffer_ == nullptr) return 0;
		if (buffer_->size() < 2) return 0;
		return buffer_->at(1);
	}

	bool received_webapi_data::set(std::unique_ptr<std::vector<uint8_t>>&& _data)
	{
		buffer_ = std::move(_data);
		if (buffer_->size() < 2) return false;
		size_t offset = 2;
		auto count = size();
		for (size_t i = 0; i < count; ++i)
		{
			if (buffer_->size() <= offset) return false;
			auto data_type = buffer_->at(offset);
			offsets_.push_back(offset);
			offset++;

			switch (data_type)
			{
			case WEBAPI_DATA_BOOL:
				offset += 1;
				break;
			case WEBAPI_DATA_UINT8:
				offset += 1;
				break;
			case WEBAPI_DATA_UINT16:
				offset += 2;
				break;
			case WEBAPI_DATA_UINT32:
				offset += 4;
				break;
			case WEBAPI_DATA_UINT64:
				offset += 8;
				break;
			case WEBAPI_DATA_FLOAT32:
				offset += 4;
				break;
			case WEBAPI_DATA_FLOAT64:
				offset += 8;
				break;
			case WEBAPI_DATA_STRING:
			{
				if (buffer_->size() <= offset) return false;
				const auto len = buffer_->at(offset);
				offset += 1 + len;
				break;
			}
			case WEBAPI_DATA_JSON:
			{
				if (buffer_->size() <= offset + 3) return false;
				uint32_t len = 0;
				std::memcpy(&len, &buffer_->at(offset), 4);
				offset += 4 + len;
				break;
			}
			}
			if (buffer_->size() < offset) return false;
		}
		return true;
	}

	bool received_webapi_data::get_bool(uint8_t _index)
	{
		if (_index >= size()) throw std::out_of_range("defined size");
		if (_index >= offsets_.size()) throw std::out_of_range("offsets size");
		auto offset = offsets_.at(_index);
		auto data_type = buffer_->at(offset);
		if (data_type != WEBAPI_DATA_BOOL) throw std::runtime_error("data type is not match");
		offset++;
		uint8_t r = buffer_->at(offset);
		return r > 0;
	}

	uint8_t received_webapi_data::get_uint8(uint8_t _index)
	{
		if (_index >= size()) throw std::out_of_range("defined size");
		if (_index >= offsets_.size()) throw std::out_of_range("offsets size");
		auto offset = offsets_.at(_index);
		auto data_type = buffer_->at(offset);
		if (data_type != WEBAPI_DATA_UINT8) throw std::runtime_error("data type is not match");
		offset++;
		return buffer_->at(offset);
	}

	uint16_t received_webapi_data::get_uint16(uint8_t _index)
	{
		if (_index >= size()) throw std::out_of_range("defined size");
		if (_index >= offsets_.size()) throw std::out_of_range("offsets size");
		auto offset = offsets_.at(_index);
		auto data_type = buffer_->at(offset);
		if (data_type != WEBAPI_DATA_UINT16) throw std::runtime_error("data type is not match");
		offset++;
		uint16_t r = 0;
		std::memcpy(&r, &buffer_->at(offset), sizeof(uint16_t));
		return r;
	}

	uint32_t received_webapi_data::get_uint32(uint8_t _index)
	{
		if (_index >= size()) throw std::out_of_range("defined size");
		if (_index >= offsets_.size()) throw std::out_of_range("offsets size");
		auto offset = offsets_.at(_index);
		auto data_type = buffer_->at(offset);
		if (data_type != WEBAPI_DATA_UINT32) throw std::runtime_error("data type is not match");
		offset++;
		uint32_t r = 0;
		std::memcpy(&r, &buffer_->at(offset), sizeof(uint32_t));
		return r;
	}

	uint64_t received_webapi_data::get_uint64(uint8_t _index)
	{
		if (_index >= size()) throw std::out_of_range("defined size");
		if (_index >= offsets_.size()) throw std::out_of_range("offsets size");
		auto offset = offsets_.at(_index);
		auto data_type = buffer_->at(offset);
		if (data_type != WEBAPI_DATA_UINT64) throw std::runtime_error("data type is not match");
		offset++;
		uint64_t r = 0;
		std::memcpy(&r, &buffer_->at(offset), sizeof(uint64_t));
		return r;
	}

	float received_webapi_data::get_float32(uint8_t _index)
	{
		if (_index >= size()) throw std::out_of_range("defined size");
		if (_index >= offsets_.size()) throw std::out_of_range("offsets size");
		auto offset = offsets_.at(_index);
		auto data_type = buffer_->at(offset);
		if (data_type != WEBAPI_DATA_FLOAT32) throw std::runtime_error("data type is not match");
		offset++;
		float r = 0;
		std::memcpy(&r, &buffer_->at(offset), sizeof(float));
		return r;
	}

	double received_webapi_data::get_float64(uint8_t _index)
	{
		if (_index >= size()) throw std::out_of_range("defined size");
		if (_index >= offsets_.size()) throw std::out_of_range("offsets size");
		auto offset = offsets_.at(_index);
		auto data_type = buffer_->at(offset);
		if (data_type != WEBAPI_DATA_FLOAT64) throw std::runtime_error("data type is not match");
		offset++;
		double r = 0;
		std::memcpy(&r, &buffer_->at(offset), sizeof(double));
		return r;
	}

	std::string received_webapi_data::get_string(uint8_t _index)
	{
		if (_index >= size()) throw std::out_of_range("defined size");
		if (_index >= offsets_.size()) throw std::out_of_range("offsets size");
		auto offset = offsets_.at(_index);
		auto data_type = buffer_->at(offset);
		if (data_type != WEBAPI_DATA_STRING) throw std::runtime_error("data type is not match");
		offset++;
		auto len = buffer_->at(offset);
		offset++;
		return std::string(buffer_->begin() + offset, buffer_->begin() + offset + len);
	}

	std::string received_webapi_data::get_json(uint8_t _index)
	{
		if (_index >= size()) throw std::out_of_range("defined size");
		if (_index >= offsets_.size()) throw std::out_of_range("offsets size");
		auto offset = offsets_.at(_index);
		auto data_type = buffer_->at(offset);
		if (data_type != WEBAPI_DATA_JSON) throw std::runtime_error("data type is not match");
		offset++;
		uint32_t len = 0;
		std::memcpy(&len, &buffer_->at(offset), 4);
		offset += 4;
		uint32_t capped_len = (len & 0x000fffffu);
		if (len != capped_len) throw std::out_of_range("over size");
		return std::string(buffer_->begin() + offset, buffer_->begin() + offset + len);
	}


	send_webapi_data::send_webapi_data(uint8_t _type)
		: buffer_(new std::vector<uint8_t>({_type, 0}))
	{
	}

	send_webapi_data::~send_webapi_data()
	{
	}

	bool send_webapi_data::append(const std::string& _v)
	{
		if (_v.size() > 0xffu) return false;
		buffer_->at(1)++;
		buffer_->push_back(WEBAPI_DATA_STRING);
		buffer_->push_back(_v.size() & 0xff);
		buffer_->reserve(buffer_->size() + _v.size());
		buffer_->insert(buffer_->end(), _v.begin(), _v.end());
		return true;
	}

	bool send_webapi_data::append_json(const std::string& _v)
	{
		if (_v.size() > 0x000fffffu) return false; // 2^20 = 1048576(1MB)
		buffer_->at(1)++;
		buffer_->push_back(WEBAPI_DATA_JSON);
		uint32_t u = _v.size() & 0xffffffffu;
		for (auto i = 0u; i < 4; ++i)
		{
			buffer_->push_back(u & 0xff);
			u >>= 8;
		}
		buffer_->reserve(buffer_->size() + _v.size());
		buffer_->insert(buffer_->end(), _v.begin(), _v.end());
		return true;
	}

	bool send_webapi_data::append(bool _v)
	{
		buffer_->at(1)++;
		buffer_->push_back(WEBAPI_DATA_BOOL);
		buffer_->push_back(_v ? 1u : 0u);
		return true;
	}

	bool send_webapi_data::append(uint8_t _v)
	{
		buffer_->at(1)++;
		buffer_->push_back(WEBAPI_DATA_UINT8);
		buffer_->push_back(_v);
		return true;
	}

	bool send_webapi_data::append(uint16_t _v)
	{
		buffer_->at(1)++;
		buffer_->push_back(WEBAPI_DATA_UINT16);
		for (auto i = 0u; i < 2; ++i)
		{
			buffer_->push_back(_v & 0xff);
			_v >>= 8;
		}
		return true;
	}

	bool send_webapi_data::append(uint32_t _v)
	{
		buffer_->at(1)++;
		buffer_->push_back(WEBAPI_DATA_UINT32);
		for (auto i = 0u; i < 4; ++i)
		{
			buffer_->push_back(_v & 0xff);
			_v >>= 8;
		}
		return true;
	}

	bool send_webapi_data::append(uint64_t _v)
	{
		buffer_->at(1)++;
		buffer_->push_back(WEBAPI_DATA_UINT64);
		for (auto i = 0u; i < 8; ++i)
		{
			buffer_->push_back(_v & 0xff);
			_v >>= 8;
		}
		return true;
	}

	bool send_webapi_data::append(float _v)
	{
		uint32_t u;
		buffer_->at(1)++;
		std::memcpy(&u, &_v, 4);
		buffer_->push_back(WEBAPI_DATA_FLOAT32);
		for (auto i = 0u; i < 4; ++i)
		{
			buffer_->push_back(u & 0xff);
			u >>= 8;
		}
		return true;
	}

	bool send_webapi_data::append(double _v)
	{
		uint64_t u;
		buffer_->at(1)++;
		std::memcpy(&u, &_v, 8);
		buffer_->push_back(WEBAPI_DATA_FLOAT64);
		for (auto i = 0u; i < 8; ++i)
		{
			buffer_->push_back(u & 0xff);
			u >>= 8;
		}
		return true;
	}

}
