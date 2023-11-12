#include "local_thread.hpp"

#include "log.hpp"

#include "utils.hpp"

#include <filesystem>
#include <fstream>
#include <regex>

#include <bcrypt.h>

#include <nlohmann/json.hpp>

#pragma comment(lib, "Bcrypt.lib")

namespace {
	std::string generate_id()
	{
		std::string result = "";
		NTSTATUS status = 0;
		BCRYPT_ALG_HANDLE handle;
		std::array<std::uint8_t, 16> a;
		static char hextable[] = "0123456789abcdef";
		status = ::BCryptOpenAlgorithmProvider(&handle, BCRYPT_RNG_ALGORITHM, NULL, 0);
		if (BCRYPT_SUCCESS(status))
		{
			status = ::BCryptGenRandom(handle, a.data(), a.size(), 0);
			if (BCRYPT_SUCCESS(status))
			{
				for (auto c : a)
				{
					for (int i = 0; i < 2; ++i)
					{
						result += hextable[c & 0xF];
						c >>= 4;
					}
				}
			}
			status = ::BCryptCloseAlgorithmProvider(handle, 0);
		}
		return result;
	}

	std::wstring get_data_directory()
	{
		auto path = app::get_exe_directory() + L"\\data";
		::CreateDirectoryW(path.c_str(), NULL);
		return path;
	}
}

namespace app {

	using json = nlohmann::json;

	bool local_tournament_data::create_base_directory()
	{
		if (std::filesystem::is_directory(base_)) return true;
		if (std::filesystem::create_directory(base_)) return true;
		return false;
	}

	std::wstring local_tournament_data::get_current_directory()
	{
		std::wstring dir = base_ + L"\\";
		if (current_ == "")
		{
			dir += L"noname";
		}
		else
		{
			dir += s_to_ws(current_);
		}
		return dir;
	}

	std::wstring local_tournament_data::get_current_teams_directory()
	{
		return get_current_directory() + L"\\teams";
	}

	std::wstring local_tournament_data::get_current_results_directory()
	{
		return get_current_directory() + L"\\results";
	}

	bool local_tournament_data::create_current_directory()
	{
		std::wstring dir = get_current_directory();

		bool result = true;
		if (!std::filesystem::is_directory(dir))
		{
			if (!std::filesystem::create_directory(dir))
			{
				result = false;
			}
		}
		std::wstring teamsdir = get_current_teams_directory();
		if (!std::filesystem::is_directory(teamsdir))
		{
			if (!std::filesystem::create_directory(teamsdir))
			{
				result = false;
			}
		}
		std::wstring resultsdir = get_current_results_directory();
		if (!std::filesystem::is_directory(resultsdir))
		{
			if (!std::filesystem::create_directory(resultsdir))
			{
				result = false;
			}
		}
		return result;
	}

	bool local_tournament_data::load_ids()
	{
		std::string s = load_ids_json();
		try {
			json j = json::parse(s);
			if (j.type() == json::value_t::object)
			{
				for (auto& [key, value] : j.items())
				{
					if (value.type() == json::value_t::string)
					{
						ids_[key] = value;
					}
				}
			}
		}
		catch (...)
		{
			return false;
		}
		return true;
	}

	local_tournament_data::local_tournament_data(const std::wstring &_path)
		: ids_()
		, base_(_path + L"\\tournaments")
		, current_("")
	{
		create_base_directory();
		create_current_directory();
		load_ids();
	}

	local_tournament_data::~local_tournament_data()
	{
	}

	std::string local_tournament_data::load_ids_json()
	{
		try
		{
			std::ifstream s(base_ + L"\\index.json");
			json j = json::parse(s);
			if (j.type() == json::value_t::object)
			{
				return j.dump();
			}
		}
		catch (...)
		{
		}
		return "{}";
	}

	bool local_tournament_data::save_ids_json()
	{
		try
		{
			json j = json::object();
			for (const auto& [k, v] : ids_)
			{
				j.emplace(k, v);
			}

			std::ofstream s(base_ + L"\\index.json");
			s << j.dump(2);
		}
		catch (...)
		{
			return false;
		}
		return true;
	}
	
	std::string local_tournament_data::get_current_id()
	{
		return current_;
	}

	std::string local_tournament_data::get_current_name()
	{
		if (current_ == "") return "noname";
		if (ids_.contains(current_)) return ids_.at(current_);
		return "";
	}

	std::string local_tournament_data::load_tournament_json()
	{
		std::wstring path = get_current_directory() + L"\\index.json";
		if (std::filesystem::is_regular_file(path))
		{
			try
			{
				std::ifstream s(path);
				json j = json::parse(s);
				if (j.type() == json::value_t::object)
				{
					return j.dump();
				}
			}
			catch (...)
			{
			}
		}
		return "{}";
	}

	bool local_tournament_data::save_tournament_json(const std::string &_json)
	{
		std::wstring path = get_current_directory() + L"\\index.json";

		try
		{
			json j = json::parse(_json);
			if (j.type() == json::value_t::object)
			{
				std::ofstream s(path);
				s << j.dump(2);
				return true;
			}
		}
		catch (...)
		{
		}
		return false;
	}


	std::string local_tournament_data::load_team_json(uint32_t _teamid)
	{
		std::wstring path = get_current_teams_directory() + L"\\" + std::to_wstring(_teamid) + L".json";
		if (std::filesystem::is_regular_file(path))
		{
			try
			{
				std::ifstream s(path);
				json j = json::parse(s);
				if (j.type() == json::value_t::object)
				{
					return j.dump();
				}
			}
			catch (...)
			{
			}
		}
		return "{}";
	}

	bool local_tournament_data::save_team_json(uint32_t _teamid, const std::string& _json)
	{
		std::wstring path = get_current_teams_directory() + L"\\" + std::to_wstring(_teamid) + L".json";
		try
		{
			json j = json::parse(_json);
			if (j.type() == json::value_t::object)
			{
				std::ofstream s(path);
				s << j.dump(2);
				return true;
			}
		}
		catch (...)
		{
		}
		return false;
	}


	std::string local_tournament_data::load_result_json(uint32_t _resultid)
	{
		std::wstring path = get_current_results_directory() + L"\\" + std::to_wstring(_resultid) + L".json";
		if (std::filesystem::is_regular_file(path))
		{
			try
			{
				std::ifstream s(path);
				json j = json::parse(s);
				if (j.type() == json::value_t::object)
				{
					return j.dump();
				}
			}
			catch (...)
			{
			}
		}
		return "{}";
	}

	std::string local_tournament_data::load_results_json()
	{
		json results = json::array();
		for (uint32_t i = 0; i < count_results(); ++i)
		{
			bool pushed = false;
			std::wstring path = get_current_results_directory() + L"\\" + std::to_wstring(i) + L".json";
			if (std::filesystem::is_regular_file(path))
			{
				try
				{
					std::ifstream s(path);
					json j = json::parse(s);
					if (j.type() == json::value_t::object)
					{
						results.push_back(j);
						pushed = true;
					}
				}
				catch (...)
				{
				}
			}
			if (!pushed) break;
		}
		return results.dump();
	}

	bool local_tournament_data::save_result_json(uint32_t _resultid, const std::string& _json)
	{
		std::wstring path = get_current_results_directory() + L"\\" + std::to_wstring(_resultid) + L".json";
		try
		{
			json j = json::parse(_json);
			if (j.type() == json::value_t::object)
			{
				std::ofstream s(path);
				s << j.dump(2);
				return true;
			}
		}
		catch (...)
		{
		}
		return false;
	}

	std::string local_tournament_data::set_tournament_name(const std::string& _name)
	{
		for (const auto& [key, value] : ids_)
		{
			if (value == _name)
			{
				current_ = key;
				create_current_directory();
				return key;
			}
		}

		// 一致するものがなかった場合、新規作成
		std::string newid;
		do
		{
			newid = generate_id();
		}
		while (ids_.contains(newid));

		ids_.emplace(newid, _name);
		current_ = newid;
		create_current_directory();
		save_ids_json();

		return newid;
	}

	bool local_tournament_data::rename(const std::string& _id, const std::string& _name)
	{
		if (!ids_.contains(_id)) return false;
		if (_name == "") return false;
		if (ids_.at(_id) == _name) return false;
		for (const auto& [k, v] : ids_)
		{
			if (v == _name) return false;
		}

		ids_.at(_id) = _name;
		return save_ids_json();
	}

	uint32_t local_tournament_data::count_results()
	{
		uint32_t count = 0;
		std::wstring path = get_current_results_directory();
		for (uint32_t i = 0; i < UINT32_MAX; ++i)
		{
			if (std::filesystem::is_regular_file(path + L"\\" + std::to_wstring(i) + L".json"))
			{
				count++;
			}
			else
			{
				break;
			}
		}
		return count;
	}

	uint32_t local_tournament_data::count_teams()
	{
		uint32_t count = 0;
		std::wstring path = get_current_teams_directory();
		for (uint32_t i = 0; i < UINT32_MAX; ++i)
		{
			if (std::filesystem::is_regular_file(path + L"\\" + std::to_wstring(i) + L".json"))
			{
				count++;
			}
			else
			{
				break;
			}
		}
		return count;
	}

	local_players::local_players(const std::wstring& _path)
		: path_(_path + L"\\players")
	{
	}

	local_players::~local_players()
	{
	}

	bool local_players::save_player_json(const std::string& _hash, const std::string& _json)
	{
		std::wstring path = path_ + L"\\" + s_to_ws(_hash) + L".json";
		try
		{
			json j = json::parse(_json);
			if (j.type() == json::value_t::object)
			{
				std::ofstream s(path);
				s << j.dump(2);
				return true;
			}
		}
		catch (...)
		{
		}
		return false;
	}

	std::string local_players::load_player_json(const std::string& _hash)
	{
		std::wstring path = path_ + L"\\" + s_to_ws(_hash) + L".json";
		if (std::filesystem::is_regular_file(path))
		{
			try
			{
				std::ifstream s(path);
				json j = json::parse(s);
				if (j.type() == json::value_t::object)
				{
					return j.dump();
				}
			}
			catch (...)
			{
			}
		}
		return "{}";
	}

	std::string local_players::load_players()
	{
		json players = json::object();
		std::wregex re(L"^[0-9a-fA-F]{32}\\.json$");
		for (const auto& entry : std::filesystem::directory_iterator(path_))
		{
			if (!std::filesystem::is_regular_file(entry)) continue;
			std::wstring filename = entry.path().filename().c_str();
			if (!std::regex_match(filename, re)) continue;
			auto hash = ws_to_s(filename.substr(0, 32));

			// jsonの中身があったら取得
			try
			{
				std::ifstream s(entry.path());
				json j = json::parse(s);
				if (j.type() == json::value_t::object)
				{
					players.emplace(hash, j);
				}
			}
			catch (...)
			{
			}
		}
		return players.dump();
	}

	local_thread::local_thread(DWORD _logid)
		: logid_(_logid)
		, window_(NULL)
		, thread_(NULL)
		, event_close_(NULL)
		, path_(get_data_directory())
		, wqmtx_()
		, rqmtx_()
		, event_wq_(NULL)
		, event_rq_(NULL)
		, wq_()
		, rq_()
		, tournament_(path_)
	{
	}

	local_thread::~local_thread()
	{
		if (event_rq_) ::CloseHandle(event_rq_);
		if (event_wq_) ::CloseHandle(event_wq_);
		if (event_close_) ::CloseHandle(event_close_);
	}


	DWORD WINAPI local_thread::proc_common(LPVOID _p)
	{
		auto p = reinterpret_cast<local_thread*>(_p);
		return p->proc();
	}

	DWORD local_thread::proc()
	{
		log(logid_, L"Info: thread start.");

		create_directory();

		const HANDLE events[] = {
			event_close_,
			event_rq_
		};

		while (true)
		{

			auto id = ::WaitForMultipleObjects(ARRAYSIZE(events), events, FALSE, INFINITE);
			if (id == WAIT_OBJECT_0)
			{
				// 終了
				log(logid_, L"Info: receive close event.");
				break;
			}
			else if (id == WAIT_OBJECT_0 + 1)
			{
				// rq
				auto q = pull_rq();
				while (true)
				{
					if (q.empty()) break;

					// データ取り出し
					auto data = std::move(q.front());
					q.pop();

					if (data != nullptr)
					{
						proc_rq(std::move(data));
					}
				}
			}
		}

		log(logid_, L"Info: thread end.");

		return 0;
	}

	//---------------------------------------------------------------------------------
	// PROC_RQ
	//---------------------------------------------------------------------------------
	void local_thread::proc_rq(local_queue_data_t&& _data)
	{
		local_queue_data_t d(new local_queue_data());
		if (_data->data_type == LOCAL_DATA_TYPE_NONE) return;

		// 基本情報
		d->data_type = _data->data_type;
		d->sock = _data->sock;
		d->sequence = _data->sequence;


		log(logid_, L"Info: proc rq sock=%d sequence=%d", d->sock, d->sequence);

		switch (_data->data_type)
		{
		case LOCAL_DATA_TYPE_SET_OBSERVER:
			if (_data->hash != "")
			{
				d->hash = _data->hash;

				json j = {
					{"hash", d->hash}
				};

				// データの保存
				try
				{
					std::ofstream s(path_ + L"\\observers\\index.json");
					s << j.dump(2);
				}
				catch (...)
				{
					d->result = false;
				}
			}
			break;
		case LOCAL_DATA_TYPE_GET_OBSERVER:
		case LOCAL_DATA_TYPE_GET_OBSERVERS:
		{
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_GET_OBSERVER/LOCAL_DATA_TYPE_GET_OBSERVERS event.");
			try {
				std::ifstream s(path_ + L"\\observers\\index.json");
				json j = json::parse(s);
				if (j.find("hash") != j.end() && j["hash"].type() == json::value_t::string)
				{
					d->hash = j["hash"];
				}
			}
			catch (...)
			{
				d->result = false;
			}
			if (d->hash == "") d->result = false;
			break;
		}
		case LOCAL_DATA_TYPE_SAVE_RESULT:
		{
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_SAVE_RESULT event.");
			if (_data->game_result != nullptr)
			{
				const auto& r = *_data->game_result;
				json j = {
					{"start", r.start},
					{"end", r.end},
					{"serverid", r.serverid},
					{"map", r.map},
					{"playlistname", r.playlistname},
					{"playlistdesc", r.playlistdesc},
					{"datacenter", r.datacenter},
					{"aimassiston", r.aimassiston},
					{"anonymousmode", r.anonymousmode},
					{"teams", json::object() },
					{"rings", json::array() }
				};

				for (const auto& [teamid, team] : r.teams)
				{
					json team_result_json = {
						{"kills", team.kills},
						{"placement", team.placement},
						{"id", team.id},
						{"name", team.name},
						{"players", json::array()}
					};

					for (const auto& player : team.players)
					{
						json player_result_json = {
							{"kills", player.kills},
							{"damage_dealt", player.damage_dealt},
							{"damage_taken", player.damage_taken},
							{"assists", player.assists},
							{"id", player.id},
							{"name", player.name},
							{"character", player.character}
						};
						team_result_json["players"].push_back(player_result_json);
					}

					j["teams"].emplace(std::to_string(teamid), team_result_json);
				}

				for (const auto& ring : r.rings)
				{
					json ring_json = {
						{"timestamp", ring.timestamp},
						{"stage", ring.stage},
						{"x", ring.x},
						{"y", ring.y},
						{"current", ring.current},
						{"end", ring.end},
						{"shrinkduration", ring.shrinkduration}
					};
					j["rings"].push_back(ring_json);
				}

				// データの保存
				auto count = tournament_.count_results();
				if (!tournament_.save_result_json(count, j.dump(2)))
				{
					d->result = false;
				}
				d->tournament_id = tournament_.get_current_id();
				d->game_id = count;
				d->json.reset(new std::string(j.dump()));
			}
			break;
		}
		case LOCAL_DATA_TYPE_GET_TOURNAMENT_IDS:
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_GET_TOURNAMENT_IDS event.");
			d->tournament_id = tournament_.get_current_id();
			d->json.reset(new std::string(tournament_.load_ids_json()));
			break;
		case LOCAL_DATA_TYPE_SET_TOURNAMENT_NAME:
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_SET_TOURNAMENT_NAME event.");
			d->tournament_id = tournament_.set_tournament_name(_data->tournament_name);
			d->tournament_name = _data->tournament_name;
			break;
		case LOCAL_DATA_TYPE_RENAME_TOURNAMENT_NAME:
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_SET_TOURNAMENT_NAME event.");
			d->result = tournament_.rename(_data->tournament_id, _data->tournament_name);
			d->tournament_id = _data->tournament_id;
			d->tournament_name = _data->tournament_name;
			break;
		case LOCAL_DATA_TYPE_SET_TOURNAMENT_PARAMS:
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_SET_TOURNAMENT_PARAMS event.");
			d->tournament_id = tournament_.get_current_id();
			if (_data->json != nullptr)
			{
				d->json = std::move(_data->json);
				d->result = tournament_.save_tournament_json(*d->json);
			}
			else
			{
				d->json.reset(new std::string("{}"));
				d->result = false;
			}
			break;
		case LOCAL_DATA_TYPE_GET_TOURNAMENT_PARAMS:
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_GET_TOURNAMENT_PARAMS event.");
			d->tournament_id = tournament_.get_current_id();
			d->json.reset(new std::string(tournament_.load_tournament_json()));
			break;
		case LOCAL_DATA_TYPE_GET_TOURNAMENT_RESULTS:
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_GET_TOURNAMENT_RESULTS event.");
			d->tournament_id = tournament_.get_current_id();
			d->json.reset(new std::string(tournament_.load_results_json()));
			break;
		case LOCAL_DATA_TYPE_GET_TOURNAMENT_RESULT:
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_GET_TOURNAMENT_RESULT event.");
			d->tournament_id = tournament_.get_current_id();
			d->game_id = _data->game_id;
			d->json.reset(new std::string(tournament_.load_result_json(_data->game_id)));
			break;
		case LOCAL_DATA_TYPE_GET_CURRENT_TOURNAMENT:
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_GET_CURRENT_TOURNAMENT event.");
			d->tournament_id = tournament_.get_current_id();
			d->tournament_name = tournament_.get_current_name();
			d->result_count = tournament_.count_results();
			break;
		case LOCAL_DATA_TYPE_SET_TEAM_PARAMS:
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_SET_TEAM_PARAMS event.");
			d->tournament_id = tournament_.get_current_id();
			d->team_id = _data->team_id;
			if (_data->json != nullptr)
			{
				d->json = std::move(_data->json);
				d->result = tournament_.save_team_json(_data->team_id, *d->json);
			}
			else
			{
				d->json.reset(new std::string("{}"));
				d->result = false;
			}
			break;
		case LOCAL_DATA_TYPE_GET_TEAM_PARAMS:
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_GET_TEAM_PARAMS event.");
			d->tournament_id = tournament_.get_current_id();
			d->team_id = _data->team_id;
			d->json.reset(new std::string(tournament_.load_team_json(_data->team_id)));
			break;
		case LOCAL_DATA_TYPE_SET_PLAYER_PARAMS:
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_SET_PLAYER_PARAMS event.");
			d->hash = _data->hash;
			if (_data->json != nullptr)
			{
				local_players p(path_);
				d->json = std::move(_data->json);
				d->result = p.save_player_json(_data->hash, *d->json);
			}
			else
			{
				d->json.reset(new std::string("{}"));
				d->result = false;
			}
			break;
		case LOCAL_DATA_TYPE_GET_PLAYER_PARAMS:
		{
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_GET_PLAYER_PARAMS event.");
			local_players p(path_);
			d->hash = _data->hash;
			d->json.reset(new std::string(p.load_player_json(_data->hash)));
			break;
		}
		case LOCAL_DATA_TYPE_GET_PLAYERS:
		{
			log(logid_, L"Info: proc LOCAL_DATA_TYPE_GET_PLAYERS event.");
			local_players p(path_);
			d->json.reset(new std::string(p.load_players()));
			break;
		}
		}

		// wqに返す
		push_wq(std::move(d));
	}

	void local_thread::create_directory()
	{
		log(logid_, L"Info: base path = %s", path_.c_str());
		if (!std::filesystem::is_directory(path_))
		{
			log(logid_, L"Info: create base directory.");
			if (!std::filesystem::create_directory(path_))
			{
				log(logid_, L"Error: failed to create base directory.");
			}
		}
		auto observers_path = path_ + L"\\observers";
		log(logid_, L"Info: observers path = %s", observers_path.c_str());
		if (!std::filesystem::is_directory(observers_path))
		{
			log(logid_, L"Info: create observers directory.");
			if (!std::filesystem::create_directory(observers_path))
			{
				log(logid_, L"Error: failed to create observers directory.");
			}
		}
		auto players_path = path_ + L"\\players";
		log(logid_, L"Info: players path = %s", players_path.c_str());
		if (!std::filesystem::is_directory(players_path))
		{
			log(logid_, L"Info: create players directory.");
			if (!std::filesystem::create_directory(players_path))
			{
				log(logid_, L"Error: failed to create players directory.");
			}
		}
	}

	void local_thread::push_rq(std::unique_ptr<local_queue_data>&& _data)
	{
		if (!_data) return;
		if (_data->data_type == LOCAL_DATA_TYPE_NONE) return;

		{
			std::lock_guard<std::mutex> lock(rqmtx_);
			rq_.push(std::move(_data));
		}
		::SetEvent(event_rq_);
	}

	std::queue<local_queue_data_t> local_thread::pull_rq()
	{
		std::queue<local_queue_data_t> q;
		{
			std::lock_guard<std::mutex> lock(rqmtx_);
			while (rq_.size() > 0)
			{
				auto data = std::move(rq_.front());
				rq_.pop();

				if (!data) continue;
				q.push(std::move(data));
			}
		}
		return q;
	}

	void local_thread::push_wq(std::unique_ptr<local_queue_data>&& _data)
	{
		if (!_data) return;
		if (_data->data_type == LOCAL_DATA_TYPE_NONE) return;

		{
			std::lock_guard<std::mutex> lock(wqmtx_);
			wq_.push(std::move(_data));
		}
		::SetEvent(event_wq_);
	}

	std::queue<local_queue_data_t> local_thread::pull_wq()
	{
		std::queue<local_queue_data_t> q;
		{
			std::lock_guard<std::mutex> lock(wqmtx_);
			while (wq_.size() > 0)
			{
				auto data = std::move(wq_.front());
				wq_.pop();

				if (!data) continue;
				q.push(std::move(data));
			}
		}
		return q;
	}

	bool local_thread::run(HWND _window)
	{
		// Window設定
		window_ = _window;

		// イベント作成
		event_close_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_close_ == NULL)
		{
			log(logid_, L"Error: CreateEvent() failed.");
			return false;
		}
		event_wq_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_wq_ == NULL)
		{
			log(logid_, L"Error: CreateEvent() failed.");
			return false;
		}
		event_rq_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_rq_ == NULL)
		{
			log(logid_, L"Error: CreateEvent() failed.");
			return false;
		}

		// スレッド起動
		thread_ = ::CreateThread(NULL, 0, proc_common, this, 0, NULL);
		return thread_ != NULL;

		return true;
	}

	void local_thread::stop()
	{
		// スレッドの停止
		if (thread_ != NULL)
		{
			::SetEvent(event_close_);
			::WaitForSingleObject(thread_, INFINITE);
			thread_ = NULL;
		}
	}

	HANDLE local_thread::get_event_wq()
	{
		return event_wq_;
	}

	void local_thread::set_observer(SOCKET _sock, uint32_t _sequence, const std::string& _hash)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_SET_OBSERVER;
		d->sock = _sock;
		d->sequence = _sequence;
		d->hash = _hash;
		push_rq(std::move(d));
	}

	void local_thread::get_observer(SOCKET _sock, uint32_t _sequence)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_GET_OBSERVER;
		d->sock = _sock;
		d->sequence = _sequence;
		push_rq(std::move(d));
	}

	void local_thread::get_observers(SOCKET _sock, uint32_t _sequence)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_GET_OBSERVERS;
		d->sock = _sock;
		d->sequence = _sequence;
		push_rq(std::move(d));
	}

	void local_thread::get_tournament_ids(SOCKET _sock, uint32_t _sequence)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_GET_TOURNAMENT_IDS;
		d->sock = _sock;
		d->sequence = _sequence;
		push_rq(std::move(d));
	}

	void local_thread::set_tournament_name(SOCKET _sock, uint32_t _sequence, const std::string& _name)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_SET_TOURNAMENT_NAME;
		d->sock = _sock;
		d->sequence = _sequence;
		d->tournament_name = _name;
		push_rq(std::move(d));
	}

	void local_thread::rename_tournament_name(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _name)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_RENAME_TOURNAMENT_NAME;
		d->sock = _sock;
		d->sequence = _sequence;
		d->tournament_id = _id;
		d->tournament_name = _name;
		push_rq(std::move(d));
	}

	void local_thread::set_tournament_params(SOCKET _sock, uint32_t _sequence, const std::string& _json)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_SET_TOURNAMENT_PARAMS;
		d->sock = _sock;
		d->sequence = _sequence;
		d->json.reset(new std::string(_json));
		push_rq(std::move(d));
	}

	void local_thread::get_tournament_params(SOCKET _sock, uint32_t _sequence)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_GET_TOURNAMENT_PARAMS;
		d->sock = _sock;
		d->sequence = _sequence;
		push_rq(std::move(d));
	}

	void local_thread::get_tournament_result(SOCKET _sock, uint32_t _sequence, uint32_t _resultid)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_GET_TOURNAMENT_RESULT;
		d->sock = _sock;
		d->sequence = _sequence;
		d->result_id = _resultid;
		push_rq(std::move(d));
	}

	void local_thread::get_tournament_results(SOCKET _sock, uint32_t _sequence)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_GET_TOURNAMENT_RESULTS;
		d->sock = _sock;
		d->sequence = _sequence;
		push_rq(std::move(d));
	}

	void local_thread::get_current_tournament(SOCKET _sock, uint32_t _sequence)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_GET_CURRENT_TOURNAMENT;
		d->sock = _sock;
		d->sequence = _sequence;
		push_rq(std::move(d));
	}

	void local_thread::set_team_params(SOCKET _sock, uint32_t _sequence, uint32_t _teamid, const std::string& _json)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_SET_TEAM_PARAMS;
		d->sock = _sock;
		d->sequence = _sequence;
		d->team_id = _teamid;
		d->json.reset(new std::string(_json));
		push_rq(std::move(d));
	}

	void local_thread::get_team_params(SOCKET _sock, uint32_t _sequence, uint32_t _teamid)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_GET_TEAM_PARAMS;
		d->sock = _sock;
		d->sequence = _sequence;
		d->team_id = _teamid;
		push_rq(std::move(d));
	}

	void local_thread::set_player_params(SOCKET _sock, uint32_t _sequence, const std::string& _hash, const std::string& _json)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_SET_PLAYER_PARAMS;
		d->sock = _sock;
		d->sequence = _sequence;
		d->hash = _hash;
		d->json.reset(new std::string(_json));
		push_rq(std::move(d));
	}

	void local_thread::get_player_params(SOCKET _sock, uint32_t _sequence, const std::string& _hash)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_GET_PLAYER_PARAMS;
		d->sock = _sock;
		d->sequence = _sequence;
		d->hash = _hash;
		push_rq(std::move(d));
	}

	void local_thread::get_players(SOCKET _sock, uint32_t _sequence)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_GET_PLAYERS;
		d->sock = _sock;
		d->sequence = _sequence;
		push_rq(std::move(d));
	}

	void local_thread::save_result(std::unique_ptr<livedata::result>&& _result)
	{
		local_queue_data_t d(new local_queue_data());
		d->data_type = LOCAL_DATA_TYPE_SAVE_RESULT;
		d->game_result = std::move(_result);
		push_rq(std::move(d));
	}
}
