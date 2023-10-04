#include "filedump.hpp"

#include "utils.hpp"

#include <sstream>
#include <chrono>

namespace {

	std::wstring get_timestring()
	{
		// 日付・時刻を取得する
		std::time_t t = std::time(nullptr);
		std::tm tm;
		errno_t error;
		error = localtime_s(&tm, &t);
		return (std::wostringstream() << std::put_time(&tm, L"%Y%m%d_%H%M%S")).str();
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
		, event_close_(NULL)
		, event_reset_(NULL)
		, event_push_(NULL)
		, mtx_()
		, q_()
	{
	}

	filedump::~filedump()
	{
		stop();
		if (event_close_) ::CloseHandle(event_close_);
		if (event_reset_) ::CloseHandle(event_reset_);
		if (event_push_) ::CloseHandle(event_push_);
	}


	DWORD WINAPI filedump::proc_common(LPVOID _p)
	{
		auto p = reinterpret_cast<filedump*>(_p);
		return p->proc();
	}

	DWORD filedump::proc()
	{
		uint64_t count = 0;
		uint64_t total = 0;
		HANDLE file = INVALID_HANDLE_VALUE;
		std::queue<std::unique_ptr<std::vector<uint8_t>>> q;

		HANDLE events[] = {
			event_close_,
			event_reset_,
			event_push_
		};

		if (!create_dump_directory()) return 0;

		while (true)
		{
			if (file == INVALID_HANDLE_VALUE)
			{
				file = ::CreateFileW(get_dumpname().c_str(), GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
				if (file == INVALID_HANDLE_VALUE) break;

				count = 0;
				total = sizeof(count) + sizeof(total);
				DWORD wsize = 0;
				if (!::WriteFile(file, &count, sizeof(count), &wsize, NULL)) break;
				if (!::WriteFile(file, &total, sizeof(total), &wsize, NULL)) break;
			}

			bool close = false;
			bool reset = false;

			auto id = ::WaitForMultipleObjects(ARRAYSIZE(events), events, FALSE, INFINITE);
			if (id == WAIT_OBJECT_0)
			{
				close = true;
			}
			else if (id == WAIT_OBJECT_0 + 1)
			{
				reset = true;
			}
			else if (id == WAIT_OBJECT_0 + 2)
			{
				{
					std::lock_guard<std::mutex> lock(mtx_);
					while (q_.size() > 0)
					{
						q.push(std::move(q_.front()));
						q_.pop();
					}
				}
				// 書き込み
				while (q.size() > 0)
				{
					auto data = std::move(q.front());
					q.pop();

					if (!data) continue;
					if (data->size() == 0) continue;

					DWORD wsize = 0;

					// データのサイズとタイムスタンプを書き込む
					DWORD dsize = data->size();
					if (!::WriteFile(file, &dsize, sizeof(dsize), &wsize, NULL))
					{
						close = true;
						break;
					}
					total += sizeof(dsize);

					// タイムスタンプを書き込む
					uint64_t ms = ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
					if (!::WriteFile(file, &ms, sizeof(ms), &wsize, NULL))
					{
						close = true;
						break;
					}
					total += sizeof(ms);

					// データを書き込む
					if (!::WriteFile(file, data->data(), data->size(), &wsize, NULL))
					{
						close = true;
						break;
					}
					total += data->size();

					// カウントアップ
					++count;
				}
			}

			// ファイルのクローズ処理
			if (close || reset)
			{
				// 先頭にシーク
				if(::SetFilePointer(file, 0, NULL, FILE_BEGIN) == INVALID_SET_FILE_POINTER) break;

				// データを書き込み
				DWORD wsize = 0;
				if (!::WriteFile(file, &count, sizeof(count), &wsize, NULL)) break;
				if (!::WriteFile(file, &total, sizeof(total), &wsize, NULL)) break;

				::CloseHandle(file);
				file = INVALID_HANDLE_VALUE;
			}
			if (close) break;

			if (file != INVALID_HANDLE_VALUE)
				::FlushFileBuffers(file);
		}

		if (file != INVALID_HANDLE_VALUE)
			::CloseHandle(file);

		return 0;
	}

	bool filedump::run()
	{
		// イベント作成
		event_close_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_close_ == NULL) return false;
		event_reset_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_reset_ == NULL) return false;
		event_push_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_push_ == NULL) return false;

		// スレッド起動
		thread_ = ::CreateThread(NULL, 0, proc_common, this, 0, NULL);
		return thread_ != NULL;
	}

	void filedump::push(std::unique_ptr<std::vector<uint8_t>> &&_data)
	{
		if (!event_push_) return;

		{
			std::lock_guard<std::mutex> lock(mtx_);
			q_.push(std::move(_data));
		}
		::SetEvent(event_push_);
	}

	void filedump::reset()
	{
		if (event_reset_)
		{
			::SetEvent(event_reset_);
		}
	}

	void filedump::stop()
	{
		// スレッドの停止
		if (thread_ != NULL)
		{
			::SetEvent(event_close_);
			::WaitForSingleObject(thread_, INFINITE);
			thread_ = NULL;
		}
	}
}
