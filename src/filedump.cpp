#include "filedump.hpp"

#include "utils.hpp"

#include <chrono>
#include <format>

namespace {

	std::wstring get_timestring()
	{
		auto now = std::chrono::system_clock::now();
		auto sec_time = std::chrono::floor<std::chrono::seconds>(now);
		auto local_time = std::chrono::zoned_time{ std::chrono::current_zone(), sec_time };
		return std::format(L"{:%Y%m%d_%H%M%S}", local_time);
	}

	std::wstring get_dump_directory()
	{
		return app::get_exe_directory() + L"\\dump";
	}
	
	bool create_dump_directory()
	{
		auto path = get_dump_directory();
		if (::CreateDirectoryW(path.c_str(), NULL))
		{
			return true;
		}
		auto error = ::GetLastError();
		if (error == ERROR_ALREADY_EXISTS)
		{
			return true;
		}
		return false;
	}

	std::wstring get_dumpname()
	{
		return get_dump_directory() + L"\\dump_" + get_timestring();
	}
}


namespace app {

	filedump::filedump()
		: thread_(NULL)
		, event_in_(NULL)
		, mtx_in_()
		, q_in_()
	{
	}

	filedump::~filedump()
	{
		stop();
		if (event_in_) ::CloseHandle(event_in_);
	}


	DWORD WINAPI filedump::proc_common(LPVOID _p)
	{
		auto p = reinterpret_cast<filedump*>(_p);
		return p->proc();
	}

	DWORD filedump::proc()
	{
		bool alive = true;
		uint64_t count = 0;
		uint64_t total = 0;
		HANDLE file = INVALID_HANDLE_VALUE;

		HANDLE events[] = {
			event_in_,
		};

		if (!create_dump_directory())
		{
			return 0;
		}

		while (alive)
		{
			auto id = ::WaitForMultipleObjects(ARRAYSIZE(events), events, FALSE, INFINITE);
			if (id == WAIT_OBJECT_0)
			{
				auto q = pull_q_in();
				while (q.size() > 0)
				{
					bool fileclose = false;

					std::visit(overloaded{
						[&](filedump_message_in_close&) {
							alive = false;
							fileclose = true;
						},
						[&](filedump_message_in_reset&) {
							fileclose = true;
						},
						[&](filedump_message_in_append& _m) {
							auto& data = _m.data;
							if (data.size() == 0)
							{
								return;
							}

							// ファイルが開かれていない場合は新規作成
							if (file == INVALID_HANDLE_VALUE)
							{
								file = ::CreateFileW(get_dumpname().c_str(), GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
								if (file == INVALID_HANDLE_VALUE)
								{
									return;
								}

								count = 0;
								total = sizeof(count) + sizeof(total);
								DWORD wsize = 0;
								if (!::WriteFile(file, &count, sizeof(count), &wsize, NULL)) return;
								if (!::WriteFile(file, &total, sizeof(total), &wsize, NULL)) return;
							}

							DWORD wsize = 0;

							// データのサイズとタイムスタンプを書き込む
							DWORD dsize = data.size();
							if (!::WriteFile(file, &dsize, sizeof(dsize), &wsize, NULL))
							{
								fileclose = true;
								return;
							}
							total += sizeof(dsize);

							// タイムスタンプを書き込む
							uint64_t ms = ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
							if (!::WriteFile(file, &ms, sizeof(ms), &wsize, NULL))
							{
								fileclose = true;
								return;
							}
							total += sizeof(ms);

							// データを書き込む
							if (!::WriteFile(file, data.data(), data.size(), &wsize, NULL))
							{
								fileclose = true;
								return;
							}
							total += data.size();

							// カウントアップ
							++count;
						}
					}, q.front());
					q.pop();

					// ファイルのクローズ処理
					if (fileclose)
					{
						// 先頭にシーク
						if (::SetFilePointer(file, 0, NULL, FILE_BEGIN) == INVALID_SET_FILE_POINTER) break;

						// データを書き込み
						DWORD wsize = 0;
						if (!::WriteFile(file, &count, sizeof(count), &wsize, NULL)) break;
						if (!::WriteFile(file, &total, sizeof(total), &wsize, NULL)) break;

						::CloseHandle(file);
						file = INVALID_HANDLE_VALUE;
					}

					if (!alive)
					{
						break;
					}
				}
			}
		}

		if (file != INVALID_HANDLE_VALUE)
			::CloseHandle(file);

		return 0;
	}

	bool filedump::run()
	{
		// イベント作成
		event_in_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_in_ == NULL)
		{
			return false;
		}

		// スレッド起動
		thread_ = ::CreateThread(NULL, 0, proc_common, this, 0, NULL);
		return thread_ != NULL;
	}

	void filedump::stop()
	{
		// スレッドの停止
		if (thread_ != NULL)
		{
			push_in(filedump_message_in_close{});
			::WaitForSingleObject(thread_, INFINITE);
			thread_ = NULL;
		}
	}

	void filedump::push_in(filedump_message_in&& _msg)
	{
		{
			std::lock_guard<std::mutex> lock(mtx_in_);
			q_in_.push(std::move(_msg));
		}
		if (event_in_)
		{
			::SetEvent(event_in_);
		}
	}

	std::queue<filedump_message_in> filedump::pull_q_in()
	{
		std::queue<filedump_message_in> q;
		{
			std::lock_guard<std::mutex> lock(mtx_in_);
			q.swap(q_in_);
		}
		return q;
	}

	void filedump::append(std::vector<uint8_t>&& _data)
	{
		push_in(filedump_message_in_append{ std::move(_data) });
	}

	void filedump::reset()
	{
		push_in(filedump_message_in_reset{});
	}
}
