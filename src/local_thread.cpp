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

	std::string load_config_json(uint32_t _slot)
	{
		std::wstring path = ::get_data_directory() + L"\\config" + (_slot > 0 ? L"_" + std::to_wstring(_slot) : L"") + L".json";
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

	bool save_config_json(const std::string& _json, uint32_t _slot)
	{
		std::wstring path = get_data_directory() + L"\\config" + (_slot > 0 ? L"_" + std::to_wstring(_slot) : L"") + L".json";

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

	local_liveapi_config::local_liveapi_config()
		: path_(L"")
	{
		path_ = get_respawn_liveapi_directory();
		if (path_ != L"")
		{
			std::filesystem::create_directories(path_);
			path_ += L"\\config.json";
		}
	}

	local_liveapi_config::~local_liveapi_config()
	{
	}

	bool local_liveapi_config::save(const std::string& _json)
	{
		if (path_ == L"") return false;
		try
		{
			json j = json::parse(_json);
			if (j.type() == json::value_t::object)
			{
				std::ofstream s(path_);
				s << j.dump(2);
				return true;
			}
		}
		catch (...)
		{
		}
		return false;
	}

	std::string local_liveapi_config::load()
	{
		if (path_ == L"") return "{}";
		if (std::filesystem::is_regular_file(path_))
		{
			try
			{
				std::ifstream s(path_);
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

	local_thread::local_thread(DWORD _logid)
		: logid_(_logid)
		, thread_(NULL)
		, event_close_(NULL)
		, event_in_(NULL)
		, event_out_(NULL)
		, mtx_in_()
		, mtx_out_()
		, q_in_()
		, q_out_()
		, path_(get_data_directory())
		, tournament_(path_)
		, liveapi_config_()
	{
	}

	local_thread::~local_thread()
	{
		if (event_close_) ::CloseHandle(event_close_);
		if (event_in_) ::CloseHandle(event_in_);
		if (event_out_) ::CloseHandle(event_out_);
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

		bool alive = true;

		enum : DWORD {
			WAIT_OBJECT_0_CLOSE = WAIT_OBJECT_0,
			WAIT_OBJECT_0_IN = WAIT_OBJECT_0 + 1
		};

		const HANDLE events[] = {
			event_close_,
			event_in_
		};

		while (alive)
		{

			auto id = ::WaitForMultipleObjects(ARRAYSIZE(events), events, FALSE, INFINITE);
			if (id == WAIT_OBJECT_0_CLOSE)
			{
				log(logid_, L"Info: receive close event.");
				alive = false;
			}
			else if (id == WAIT_OBJECT_0_IN)
			{
				auto q = pull_q_in();
				while (q.size() > 0)
				{
					proc_message(std::move(q.front()));
					q.pop();
				}
			}
		}

		log(logid_, L"Info: thread end.");

		return 0;
	}
	//---------------------------------------------------------------------------------
	// PROC_MESSAGE
	//---------------------------------------------------------------------------------
	void local_thread::proc_message(local_message&& _msg)
	{
		std::visit(overloaded{
			[&](local_message_set_config& _b) {
				log(logid_, L"Info: receive set config message.");
				_msg.result = save_config_json(_b.json, _b.slot);
			},
			[&](local_message_get_config& _b) {
				log(logid_, L"Info: receive get config message.");
				_b.json = load_config_json(_b.slot);
			},
			[&](local_message_set_observer& _b) {
				log(logid_, L"Info: receive set observer message.");
				if (_b.hash != "")
				{
					json j = {
						{"hash", _b.hash}
					};

					// データの保存
					try
					{
						std::ofstream s(path_ + L"\\observers\\index.json");
						s << j.dump(2);
					}
					catch (...)
					{
						_msg.result = false;
					}
				}
			},
			[&](local_message_get_observer& _b) {
				log(logid_, L"Info: receive get observer message.");
				try {
					std::ifstream s(path_ + L"\\observers\\index.json");
					json j = json::parse(s);
					if (j.find("hash") != j.end() && j["hash"].type() == json::value_t::string)
					{
						_b.hash = j["hash"];
					}
				}
				catch (...)
				{
					_msg.result = false;
				}
				if (_b.hash == "") _msg.result = false;
			},
			[&](local_message_get_observers& _b) {
				log(logid_, L"Info: receive get observers message.");
				try {
					std::ifstream s(path_ + L"\\observers\\index.json");
					json j = json::parse(s);
					if (j.find("hash") != j.end() && j["hash"].type() == json::value_t::string)
					{
						_b.hash = j["hash"];
					}
				}
				catch (...)
				{
					_msg.result = false;
				}
				if (_b.hash == "") _msg.result = false;
			},
			[&](local_message_save_result& _b) {
				log(logid_, L"Info: receive save result message.");
				const auto& r = _b.result;
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
					{"rings", json::array() },
					{"carepackages", json::array() },
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
							{"character", player.character},
							{"items", player.items}
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

				for (const auto& [packageid, carepackage] : r.carepackages)
				{
					json carepackage_json = {
						{"packageid", packageid},
						{"lanched", carepackage.launched},
						{"landed", carepackage.landed},
						{"opened", carepackage.opened},
						{"contents", carepackage.contents},
						{"x", carepackage.x},
						{"y", carepackage.y},
						{"player", carepackage.player},
					};
					j["carepackages"].push_back(carepackage_json);
				}

				// データの保存
				auto count = tournament_.count_results();
				if (!tournament_.save_result_json(count, j.dump(2)))
				{
					_msg.result = false;
				}
				_b.tournament_id = tournament_.get_current_id();
				_b.game_id = count;
				_b.json = j.dump();
			},
			[&](local_message_get_tournament_ids& _b) {
				log(logid_, L"Info: receive get tournament ids message.");
				_b.json = tournament_.load_ids_json();
			},
			[&](local_message_set_tournament_name& _b) {
				log(logid_, L"Info: receive set tournament name message.");
				_b.id = tournament_.set_tournament_name(_b.name);
			},
			[&](local_message_rename_tournament_name& _b) {
				log(logid_, L"Info: receive rename tournament name message.");
				_msg.result = tournament_.rename(_b.id, _b.name);
			},
			[&](local_message_set_tournament_params& _b) {
				log(logid_, L"Info: receive set tournament params message.");
				_b.id = tournament_.get_current_id();
				_msg.result = tournament_.save_tournament_json(_b.json);
			},
			[&](local_message_get_tournament_params& _b) {
				log(logid_, L"Info: receive get tournament params message.");
				_b.id = tournament_.get_current_id();
				_b.json = tournament_.load_tournament_json();
			},
			[&](local_message_get_tournament_results& _b) {
				log(logid_, L"Info: receive get tournament results message.");
				_b.id = tournament_.get_current_id();
				_b.json = tournament_.load_results_json();
			},
			[&](local_message_set_tournament_result& _b) {
				log(logid_, L"Info: receive set tournament result message.");
				_b.tournament_id = tournament_.get_current_id();
				_msg.result = tournament_.save_result_json(_b.game_id, _b.json);
			},
			[&](local_message_get_tournament_result& _b) {
				log(logid_, L"Info: receive get tournament result message.");
				_b.tournament_id = tournament_.get_current_id();
				_b.json = tournament_.load_result_json(_b.game_id);
			},
			[&](local_message_get_current_tournament& _b) {
				log(logid_, L"Info: receive get current tournament message.");
				_b.id = tournament_.get_current_id();
				_b.name = tournament_.get_current_name();
				_b.result_count = tournament_.count_results();
			},
			[&](local_message_set_team_params& _b) {
				log(logid_, L"Info: receive set team params message.");
				_b.tournament_id = tournament_.get_current_id();
				_msg.result = tournament_.save_team_json(_b.team_id, _b.json);
			},
			[&](local_message_get_team_params& _b) {
				log(logid_, L"Info: receive get team params message.");
				_b.tournament_id = tournament_.get_current_id();
				_b.json = tournament_.load_team_json(_b.team_id);
			},
			[&](local_message_set_player_params& _b) {
				log(logid_, L"Info: receive set player params message.");

				local_players p(path_);
				_msg.result = p.save_player_json(_b.hash, _b.json);
			},
			[&](local_message_get_player_params& _b) {
				log(logid_, L"Info: receive get player params message.");
				local_players p(path_);
				_b.json = p.load_player_json(_b.hash);
			},
			[&](local_message_get_players& _b) {
				log(logid_, L"Info: receive get players message.");
				local_players p(path_);
				_b.json = p.load_players();
			},
			[&](local_message_set_liveapi_config& _b) {
				log(logid_, L"Info: receive save liveapi config message.");
				_msg.result = liveapi_config_.save(_b.json);
			},
			[&](local_message_get_liveapi_config& _b) {
				log(logid_, L"Info: receive load liveapi config message.");
				_b.json = liveapi_config_.load();
			},
			}, _msg.data);

		push_out(std::move(_msg));
	}

	void local_thread::create_directory()
	{
		log(logid_, std::format(L"Info: base path = {}", path_));
		if (!std::filesystem::is_directory(path_))
		{
			log(logid_, L"Info: create base directory.");
			if (!std::filesystem::create_directory(path_))
			{
				log(logid_, L"Error: failed to create base directory.");
			}
		}
		auto observers_path = path_ + L"\\observers";
		log(logid_, std::format(L"Info: observers path = {}", observers_path));
		if (!std::filesystem::is_directory(observers_path))
		{
			log(logid_, L"Info: create observers directory.");
			if (!std::filesystem::create_directory(observers_path))
			{
				log(logid_, L"Error: failed to create observers directory.");
			}
		}
		auto players_path = path_ + L"\\players";
		log(logid_, std::format(L"Info: players path = {}", players_path));
		if (!std::filesystem::is_directory(players_path))
		{
			log(logid_, L"Info: create players directory.");
			if (!std::filesystem::create_directory(players_path))
			{
				log(logid_, L"Error: failed to create players directory.");
			}
		}
	}

	void local_thread::push_in(local_message&& _msg)
	{
		{
			std::lock_guard<std::mutex> lock(mtx_in_);
			q_in_.push(std::move(_msg));
		}
		::SetEvent(event_in_);
	}

	void local_thread::push_out(local_message&& _msg)
	{
		{
			std::lock_guard<std::mutex> lock(mtx_out_);
			q_out_.push(std::move(_msg));
		}
		::SetEvent(event_out_);
	}

	std::queue<local_message> local_thread::pull_q_in()
	{
		std::queue<local_message> q;
		{
			std::lock_guard<std::mutex> lock(mtx_in_);
			q.swap(q_in_);
		}
		return q;
	}

	std::queue<local_message> local_thread::pull_q_out()
	{
		std::queue<local_message> q;
		{
			std::lock_guard<std::mutex> lock(mtx_out_);
			q.swap(q_out_);
		}
		return q;
	}

	bool local_thread::run()
	{
		// イベント作成
		event_close_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_close_ == NULL)
		{
			log(logid_, L"Error: CreateEvent() failed.");
			return false;
		}
		event_in_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_in_ == NULL)
		{
			log(logid_, L"Error: CreateEvent() failed.");
			return false;
		}
		event_out_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_out_ == NULL)
		{
			log(logid_, L"Error: CreateEvent() failed.");
			return false;
		}

		// スレッド起動
		thread_ = ::CreateThread(NULL, 0, proc_common, this, 0, NULL);
		if (thread_ == NULL)
		{
			log(logid_, L"Error: CreateThread() failed.");
			return false;
		}

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

	HANDLE local_thread::get_event_out()
	{
		return event_out_;
	}

	void local_thread::set_config(SOCKET _sock, uint32_t _sequence, const std::string& _json, uint8_t _slot)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_set_config{_slot, _json} });
	}

	void local_thread::get_config(SOCKET _sock, uint32_t _sequence, uint8_t _slot)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_get_config{_slot, ""}});
	}

	void local_thread::set_observer(SOCKET _sock, uint32_t _sequence, const std::string& _hash)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_set_observer{_hash} });
	}

	void local_thread::get_observer(SOCKET _sock, uint32_t _sequence)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_get_observer{""} });
	}

	void local_thread::get_observers(SOCKET _sock, uint32_t _sequence)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_get_observers{""}});
	}

	void local_thread::get_tournament_ids(SOCKET _sock, uint32_t _sequence)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_get_tournament_ids{""}});
	}

	void local_thread::set_tournament_name(SOCKET _sock, uint32_t _sequence, const std::string& _name)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_set_tournament_name{"", _name} });
	}

	void local_thread::rename_tournament_name(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _name)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_rename_tournament_name{_id, _name} });
	}

	void local_thread::set_tournament_params(SOCKET _sock, uint32_t _sequence, const std::string& _json)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_set_tournament_params{"", _json}});
	}

	void local_thread::get_tournament_params(SOCKET _sock, uint32_t _sequence)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_get_tournament_params{"", ""} });
	}

	void local_thread::set_tournament_result(SOCKET _sock, uint32_t _sequence, uint32_t _gameid, const std::string& _json)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_set_tournament_result{"", _gameid, _json}});
	}

	void local_thread::get_tournament_result(SOCKET _sock, uint32_t _sequence, uint32_t _gameid)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_get_tournament_result{"", _gameid, ""}});
	}

	void local_thread::get_tournament_results(SOCKET _sock, uint32_t _sequence)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_get_tournament_results{"", ""} });
	}

	void local_thread::get_current_tournament(SOCKET _sock, uint32_t _sequence)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_get_current_tournament{"", "", 0} });
	}

	void local_thread::set_team_params(SOCKET _sock, uint32_t _sequence, uint32_t _teamid, const std::string& _json)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_set_team_params{"", _teamid, _json}});
	}

	void local_thread::get_team_params(SOCKET _sock, uint32_t _sequence, uint32_t _teamid)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_get_team_params{"", _teamid, ""} });
	}

	void local_thread::set_player_params(SOCKET _sock, uint32_t _sequence, const std::string& _hash, const std::string& _json)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_set_player_params{_hash, _json} });
	}

	void local_thread::get_player_params(SOCKET _sock, uint32_t _sequence, const std::string& _hash)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_get_player_params{_hash, ""}});
	}

	void local_thread::get_players(SOCKET _sock, uint32_t _sequence)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_get_players{""} });
	}

	void local_thread::save_result(livedata::result&& _result)
	{
		push_in(local_message{ INVALID_SOCKET, 0u, true, local_message_save_result{ "", 0u, "", std::move(_result)}});
	}

	void local_thread::set_liveapi_config(SOCKET _sock, uint32_t _sequence, const std::string& _json)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_set_liveapi_config{_json} });
	}

	void local_thread::get_liveapi_config(SOCKET _sock, uint32_t _sequence)
	{
		push_in(local_message{ _sock, _sequence, true, local_message_get_liveapi_config{""} });
	}

}
