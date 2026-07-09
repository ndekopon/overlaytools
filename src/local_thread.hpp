#pragma once

#include "common.hpp"

#include "livedata.hpp"

#include <mutex>
#include <string>
#include <queue>
#include <variant>

namespace app
{
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

	class local_liveapi_config {
	private:
		std::wstring path_;
	public:
		local_liveapi_config();
		~local_liveapi_config();
		bool save(const std::string& _json);
		std::string load();
	};

	struct local_message_set_config
	{
		uint8_t slot = 0;
		std::string json = "";
	};

	struct local_message_get_config
	{
		uint8_t slot = 0;
		std::string json = "";
	};

	struct local_message_set_observer
	{
		std::string hash = "";
	};

	struct local_message_get_observer
	{
		std::string hash = "";
	};

	struct local_message_get_observers
	{
		std::string hash = "";
	};

	struct local_message_save_result
	{
		std::string tournament_id = "";
		uint32_t game_id = 0;
		std::string json = "";
		livedata::result result{};
	};

	struct local_message_get_tournament_ids
	{
		std::string json = "";
	};

	struct local_message_set_tournament_name
	{
		std::string id = "";
		std::string name = "";
	};

	struct local_message_rename_tournament_name
	{
		std::string id = "";
		std::string name = "";
	};

	struct local_message_set_tournament_params
	{
		std::string id = "";
		std::string json = "";
	};

	struct local_message_get_tournament_params
	{
		std::string id = "";
		std::string json = "";
	};

	struct local_message_set_tournament_result
	{
		std::string tournament_id = "";
		uint32_t game_id = 0;
		std::string json = "";
	};

	struct local_message_get_tournament_result
	{
		std::string tournament_id = "";
		uint32_t game_id = 0;
		std::string json = "";
	};

	struct local_message_get_tournament_results
	{
		std::string id = "";
		std::string json = "";
	};

	struct local_message_get_current_tournament
	{
		std::string id = "";
		std::string name = "";
		uint32_t result_count = 0;
	};

	struct local_message_set_team_params
	{
		std::string tournament_id = "";
		uint32_t team_id = 0;
		std::string json = "";
	};

	struct local_message_get_team_params
	{
		std::string tournament_id = "";
		uint32_t team_id = 0;
		std::string json = "";
	};

	struct local_message_set_player_params
	{
		std::string hash = "";
		std::string json = "";
	};

	struct local_message_get_player_params
	{
		std::string hash = "";
		std::string json = "";
	};

	struct local_message_get_players
	{
		std::string json = "";
	};

	struct local_message_set_liveapi_config
	{
		std::string json = "";
	};

	struct local_message_get_liveapi_config
	{
		std::string json = "";
	};

	using local_message_body = std::variant<
		local_message_set_config,
		local_message_get_config,
		local_message_set_observer,
		local_message_get_observer,
		local_message_get_observers,
		local_message_save_result,
		local_message_get_tournament_ids,
		local_message_set_tournament_name,
		local_message_rename_tournament_name,
		local_message_set_tournament_params,
		local_message_get_tournament_params,
		local_message_set_tournament_result,
		local_message_get_tournament_result,
		local_message_get_tournament_results,
		local_message_get_current_tournament,
		local_message_set_team_params,
		local_message_get_team_params,
		local_message_set_player_params,
		local_message_get_player_params,
		local_message_get_players,
		local_message_set_liveapi_config,
		local_message_get_liveapi_config
	>;

	struct local_message
	{
		SOCKET sock = INVALID_SOCKET;
		uint32_t sequence = 0u;
		bool result = true;
		local_message_body data;
	};

	class local_thread
	{
	private:
		DWORD logid_;
		HANDLE thread_;
		HANDLE event_close_;
		HANDLE event_in_;
		HANDLE event_out_;
		std::mutex mtx_in_;
		std::mutex mtx_out_;
		std::queue<local_message> q_in_;
		std::queue<local_message> q_out_;
		std::wstring path_;
		local_tournament_data tournament_;
		local_liveapi_config liveapi_config_;

		static DWORD WINAPI proc_common(LPVOID);
		DWORD proc();
		void proc_message(local_message&& _msg);

		void create_directory();

		void push_in(local_message&& _msg);
		void push_out(local_message&& _msg);
		std::queue<local_message> pull_q_in();

	public:
		local_thread(DWORD _logid);
		~local_thread();

		// コピー不可
		local_thread(const local_thread&) = delete;
		local_thread& operator = (const local_thread&) = delete;
		// ムーブ不可
		local_thread(local_thread&&) = delete;
		local_thread& operator = (local_thread&&) = delete;

		bool run();
		void stop();

		HANDLE get_event_out();
		std::queue<local_message> pull_q_out();

		void set_config(SOCKET _sock, uint32_t _sequence, const std::string& _json, uint8_t _slot);
		void get_config(SOCKET _sock, uint32_t _sequence, uint8_t _slot);

		void set_observer(SOCKET _sock, uint32_t _sequence, const std::string& _hash);
		void get_observer(SOCKET _sock, uint32_t _sequence);
		void get_observers(SOCKET _sock, uint32_t _sequence);

		void get_tournament_ids(SOCKET _sock, uint32_t _sequence);
		void set_tournament_name(SOCKET _sock, uint32_t _sequence, const std::string& _name);
		void rename_tournament_name(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _name);
		void set_tournament_params(SOCKET _sock, uint32_t _sequence, const std::string& _json);
		void get_tournament_params(SOCKET _sock, uint32_t _sequence);
		void set_tournament_result(SOCKET _sock, uint32_t _sequence, uint32_t _gameid, const std::string& _json);
		void get_tournament_result(SOCKET _sock, uint32_t _sequence, uint32_t _gameid);
		void get_tournament_results(SOCKET _sock, uint32_t _sequence);
		void get_current_tournament(SOCKET _sock, uint32_t _sequence);
		
		void set_team_params(SOCKET _sock, uint32_t _sequence, uint32_t _teamid, const std::string& _json);
		void get_team_params(SOCKET _sock, uint32_t _sequence, uint32_t _teamid);

		void set_player_params(SOCKET _sock, uint32_t _sequence, const std::string& _hash, const std::string& _json);
		void get_player_params(SOCKET _sock, uint32_t _sequence, const std::string& _hash);
		void get_players(SOCKET _sock, uint32_t _sequence);

		void save_result(livedata::result&& _result);

		void set_liveapi_config(SOCKET _sock, uint32_t _sequence, const std::string& _json);
		void get_liveapi_config(SOCKET _sock, uint32_t _sequence);
	};
}
