#include "shared_context.hpp"


namespace app {
	shared_context::shared_context()
		: rmtx_()
		, rq_()
		, wmtx_()
		, wq_()
		, revent_({ NULL })
	{
	}
	shared_context::~shared_context()
	{
		for (const auto& e : revent_)
		{
			::CloseHandle(e);
		}
	}

	bool shared_context::init()
	{
		for (auto &e : revent_)
		{
			e = ::CreateEventW(NULL, FALSE, FALSE, NULL);
			if (e == NULL) return false;
		}
		return true;
	}

	void shared_context::push_rq(DWORD _id, ctx_data_t &&_data)
	{
		if (!_data) return;
		if (_data->second->size() == 0) return;
		
		{
			std::lock_guard<std::mutex> lock(rmtx_.at(_id));
			rq_.at(_id).push(std::move(_data));
		}
		::SetEvent(revent_.at(_id));
	}

	std::unique_ptr<ctx_queue_t> shared_context::pull_wq(DWORD _id)
	{
		auto q = std::make_unique<ctx_queue_t>(ctx_queue_t());
		{
			std::lock_guard<std::mutex> lock(wmtx_.at(_id));
			while (wq_.at(_id).size() > 0)
			{
				auto data = std::move(wq_.at(_id).front());
				wq_.at(_id).pop();

				if (!data) continue;
				if (data->second->size() == 0) continue;
				q->push(std::move(data));
			}
		}
		return q;
	}

	void shared_context::push_wq(DWORD _id, ctx_data_t &&_data)
	{
		if (!_data) return;
		if (_data->second->size() == 0) return;
		{
			std::lock_guard<std::mutex> lock(wmtx_.at(_id));
			wq_.at(_id).push(std::move(_data));
		}
	}

	std::unique_ptr<ctx_queue_t> shared_context::pull_rq(DWORD _id)
	{
		auto q = std::make_unique<ctx_queue_t>(ctx_queue_t());
		{
			std::lock_guard<std::mutex> lock(rmtx_.at(_id));
			while (rq_.at(_id).size() > 0)
			{
				auto data = std::move(rq_.at(_id).front());
				rq_.at(_id).pop();

				if (!data) continue;
				if (data->second->size() == 0) continue;
				q->push(std::move(data));
			}
		}
		return std::move(q);
	}
}
