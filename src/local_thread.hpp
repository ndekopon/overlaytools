#pragma once

#include "common.hpp"

#include "shared_context.hpp"
#include "livedata.hpp"

#include <array>
#include <mutex>
#include <string>
#include <vector>
#include <queue>

namespace app
{
	enum : uint32_t {
		LOCAL_DATA_TYPE_NONE,
		LOCAL_DATA_TYPE_SET_OBSERVER,
		LOCAL_DATA_TYPE_GET_OBSERVER,
		LOCAL_DATA_TYPE_GET_OBSERVERS,
		LOCAL_DATA_TYPE_SAVE_RESULT,
		LOCAL_DATA_TYPE_GET_TOURNAMENT_IDS,
		LOCAL_DATA_TYPE_SET_TOURNAMENT_NAME,
		LOCAL_DATA_TYPE_RENAME_TOURNAMENT_NAME,
		LOCAL_DATA_TYPE_SET_TOURNAMENT_PARAMS,
		LOCAL_DATA_TYPE_GET_TOURNAMENT_PARAMS,
		LOCAL_DATA_TYPE_GET_TOURNAMENT_RESULT,
		LOCAL_DATA_TYPE_GET_TOURNAMENT_RESULTS,
		LOCAL_DATA_TYPE_SET_TEAM_PARAMS,
		LOCAL_DATA_TYPE_GET_TEAM_PARAMS,
		LOCAL_DATA_TYPE_SET_PLAYER_PARAMS,
		LOCAL_DATA_TYPE_GET_PLAYER_PARAMS,
		LOCAL_DATA_TYPE_GET_PLAYERS,
		LOCAL_DATA_TYPE_GET_CURRENT_TOURNAMENT,
	};

	class local_tournament_data {
	private:
		std::map<std::string, std::string> ids_;
		std::wstring base_;
		std::string current_;

		bool create_base_directory();
		std::wstring get_current_directory();
		std::wstring get_current_teams_directory();
		std::wstring get_current_results_directory();
		bool create_current_directory();
		bool load_ids();

	public:
		local_tournament_data(const std::wstring& _path);
		~local_tournament_data();

		std::string load_ids_json();
		bool save_ids_json();
		std::string get_current_id();
		std::string get_current_name();

		std::string load_tournament_json();
		bool save_tournament_json(const std::string& _json);
		
		std::string load_team_json(uint32_t _teamid);
		bool save_team_json(uint32_t _teamid, const std::string& _json);
		
		std::string load_result_json(uint32_t _resultid);
		std::string load_results_json();
		bool save_result_json(uint32_t _resultid, const std::string& _json);

		std::string set_tournament_name(const std::string& _name);
		bool rename(const std::string& _id, const std::string& _name);

		uint32_t count_results();
		uint32_t count_teams();
	};

	class local_players {
	private:
		std::wstring path_;
	public:
		local_players(const std::wstring& _path);
		~local_players();

		bool save_player_json(const std::string& _hash, const std::string& _json);
		std::string load_player_json(const std::string& _hash);

		std::string load_players();
	};

	struct local_queue_data
	{
		uint32_t data_type = LOCAL_DATA_TYPE_NONE;
		SOCKET sock = INVALID_SOCKET;
		uint32_t sequence = 0u;
		bool result = true;
		std::unique_ptr<std::string> json = nullptr;
		std::string hash = "";
		uint32_t team_id = 0;
		std::string tournament_id = "";
		std::string tournament_name = "";
		uint32_t game_id = 0;
		uint32_t result_id = 0;
		uint32_t result_count = 0;
		std::unique_ptr<livedata::result> game_result = nullptr;
	};

	using local_queue_data_t = std::unique_ptr<local_queue_data>;
	using local_queue_t = std::unique_ptr<std::queue<local_queue_data_t>>;

	class local_thread
	{
	private:
		DWORD logid_;
		HWND window_;
		HANDLE thread_;
		HANDLE event_close_;
		std::wstring path_;
		std::mutex wqmtx_;
		std::mutex rqmtx_;
		HANDLE event_wq_;
		HANDLE event_rq_;
		std::queue<local_queue_data_t> wq_;
		std::queue<local_queue_data_t> rq_;
		local_tournament_data tournament_;

		static DWORD WINAPI proc_common(LPVOID);
		DWORD proc();
		void proc_rq(local_queue_data_t && _data);

		void create_directory();

		void push_rq(std::unique_ptr<local_queue_data>&& _data);
		void push_wq(std::unique_ptr<local_queue_data>&& _data);
		std::queue<local_queue_data_t> pull_rq();

	public:
		local_thread(DWORD _logid);
		~local_thread();

		// コピー不可
		local_thread(const local_thread&) = delete;
		local_thread& operator = (const local_thread&) = delete;
		// ムーブ不可
		local_thread(local_thread&&) = delete;
		local_thread& operator = (local_thread&&) = delete;

		bool run(HWND);
		void stop();

		HANDLE get_event_wq();

		std::queue<local_queue_data_t> pull_wq();

		void set_observer(SOCKET _sock, uint32_t _sequence, const std::string& _hash);
		void get_observer(SOCKET _sock, uint32_t _sequence);
		void get_observers(SOCKET _sock, uint32_t _sequence);

		void get_tournament_ids(SOCKET _sock, uint32_t _sequence);
		void set_tournament_name(SOCKET _sock, uint32_t _sequence, const std::string& _name);
		void rename_tournament_name(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _name);
		void set_tournament_params(SOCKET _sock, uint32_t _sequence, const std::string& _json);
		void get_tournament_params(SOCKET _sock, uint32_t _sequence);
		void get_tournament_result(SOCKET _sock, uint32_t _sequence, uint32_t _gameid);
		void get_tournament_results(SOCKET _sock, uint32_t _sequence);
		void get_current_tournament(SOCKET _sock, uint32_t _sequence);
		
		void set_team_params(SOCKET _sock, uint32_t _sequence, uint32_t _teamid, const std::string& _json);
		void get_team_params(SOCKET _sock, uint32_t _sequence, uint32_t _teamid);

		void set_player_params(SOCKET _sock, uint32_t _sequence, const std::string& _hash, const std::string& _json);
		void get_player_params(SOCKET _sock, uint32_t _sequence, const std::string& _hash);
		void get_players(SOCKET _sock, uint32_t _sequence);

		void save_result(std::unique_ptr<livedata::result>&& _result);
	};
}
