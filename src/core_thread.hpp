#pragma once

#include "common.hpp"

#include "shared_context.hpp"
#include "websocket_thread.hpp"
#include "local_thread.hpp"
#include "http_get_thread.hpp"
#include "filedump.hpp"
#include "livedata.hpp"
#include "webapi.hpp"

#include "events/events.pb.h"

namespace app {

	enum : UINT {
		CORE_MESSAGE_TEAMBANNER_STATE_SHOW,
		CORE_MESSAGE_TEAMBANNER_STATE_HIDE,
		CORE_MESSAGE_MAP_STATE_SHOW,
		CORE_MESSAGE_MAP_STATE_HIDE,
		CORE_MESSAGE_GET_STATS
	};

	class core_thread {
		HWND window_;
		HANDLE thread_;
		HANDLE event_close_;
		HANDLE event_message_;
		HANDLE event_queuecheck_;
		shared_context ctx_;
		websocket_thread liveapi_;
		websocket_thread webapi_;
		local_thread local_;
		http_get_thread http_get_;
		filedump filedump_;
		livedata::game game_;
		std::string observer_hash_;
		std::mutex mtx_;
		std::queue<UINT> messages_;
		std::queue<ctx_buffer_t> liveapi_queue_;
		bool liveapi_available_;
		uint64_t liveapi_lastsend_;
		uint64_t liveapi_lastresponse_;

		static DWORD WINAPI proc_common(LPVOID);
		DWORD proc();
		void proc_liveapi_data(ctx_data_t&& _data);
		void proc_webapi_data(ctx_data_t&& _data);
		void proc_local_data(local_queue_data_t&& _data);
		void proc_http_get_data(http_get_queue_data_t&& _data);
		void proc_message(UINT _message);

		void proc_liveapi_any(const google::protobuf::Any& _any);

		// getter squadindex
		uint8_t get_squadindex(const rtech::liveapi::Player& _player);

		// player
		void proc_player(const rtech::liveapi::Player& _player);
		void proc_connected(uint8_t _teamid, uint8_t _squadindex);
		void proc_disconnected(uint8_t _teamid, uint8_t _squadindex, bool _canreconnect, bool _alive);
		void proc_player_stats(uint8_t _teamid, uint8_t _squadindex, const std::string& _stat, uint32_t _v);
		void proc_item(uint8_t _teamid, uint8_t _squadindex, uint8_t _item, int _quantity);
		void proc_respawn(uint8_t _teamid, uint8_t _squadindex);
		void proc_revive(uint8_t _teamid, uint8_t _squadindex);
		void proc_down(uint8_t _teamid, uint8_t _squadindex);
		void proc_killed(uint8_t _teamid, uint8_t _squadindex);
		void proc_banner_collected(uint8_t _teamid, uint8_t _squadindex);
		void proc_damage_dealt(uint8_t _teamid, uint8_t _squadindex, uint32_t _damage);
		void proc_damage_taken(uint8_t _teamid, uint8_t _squadindex, uint32_t _damage);

		// team
		void proc_squad_eliminated(uint8_t _teamid);

		void sendto_liveapi(ctx_buffer_t&& _data);
		void sendto_webapi(ctx_buffer_t&& _data);
		void sendto_webapi(SOCKET _sock, ctx_buffer_t&& _data);
		void sendto_liveapi_queuecheck();

		void send_webapi_gamestatechanged(SOCKET _sock, const std::string& _state);
		void send_webapi_matchstateend_winnerdetermined(SOCKET _sock, uint8_t _teamid);
		void send_webapi_matchsetup_map(SOCKET _sock, const std::string& _map);
		void send_webapi_matchsetup_playlist(SOCKET _sock, const std::string& _name, const std::string& _desc);
		void send_webapi_matchsetup_datacenter(SOCKET _sock, const std::string& _datacenter);
		void send_webapi_matchsetup_aimassiston(SOCKET _sock, bool _aimassiston);
		void send_webapi_matchsetup_anonymousmode(SOCKET _sock, bool _anonymousmode);
		void send_webapi_matchsetup_serverid(SOCKET _sock, const std::string &_serverid);
		void send_webapi_observerswitched(SOCKET _sock, uint8_t _observer_teamid, uint8_t _observer_squadindex, uint8_t _teamid, uint8_t _playerid, bool _owned);
		void send_webapi_init_camera(SOCKET _sock, uint8_t _teamid, uint8_t _playerid);
		void send_webapi_ringinfo(SOCKET _sock, uint64_t _timestamp, uint32_t _stage, float _x, float _y, float _current, float _end, float _duration);

		void send_webapi_player_string(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint8_t _type, const std::string& _string);
		void send_webapi_player_connected(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex);
		void send_webapi_player_disconnected(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, bool _canreconnect);
		void send_webapi_player_killed(SOCKET _sock, uint8_t _victim_teamid, uint8_t _victim_squadindex, uint8_t _attacker_teamid, uint8_t _attacker_squadindex);
		void send_webapi_player_killed_count(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint32_t _killed);
		void send_webapi_player_id(SOCKET _sock, uint8_t, uint8_t, const std::string &_id);
		void send_webapi_player_name(SOCKET _sock, uint8_t, uint8_t, const std::string &_name);
		void send_webapi_player_character(SOCKET _sock, uint8_t, uint8_t, const std::string &_character);
		void send_webapi_player_items(SOCKET _sock, uint8_t, uint8_t, uint8_t _itemid, uint32_t _quantity);

		void send_webapi_player_u32u32(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint8_t _type, uint32_t _v1, uint32_t _v2);
		void send_webapi_player_hp(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint32_t _current, uint32_t _max);
		void send_webapi_player_shield(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint32_t _current, uint32_t _max);
		void send_webapi_player_damage(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint32_t _dealt, uint32_t _taken);
		void send_webapi_player_pos(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, float _x, float _y, float _angle);
		void send_webapi_player_state(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint8_t _state);
		void send_webapi_player_stats(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint32_t _kills, uint32_t _assists, uint32_t _knockdowns, uint32_t _revives, uint32_t _respawns);

		void send_webapi_squad_eliminated(SOCKET _sock, uint8_t _teamid, uint32_t _placement);
		void send_webapi_team_name(SOCKET _sock, uint8_t _teamid, const std::string &_teamname);
		void send_webapi_team_placement(SOCKET _sock, uint8_t _teamid, uint32_t _placement);

		void send_webapi_lobbyplayer(uint8_t _teamid, const std::string& _hash, const std::string& _name, const std::string& _hardware);

		void send_webapi_clear_livedata();
		void send_webapi_save_result(const std::string &_tournament_id, uint8_t _gameid, std::unique_ptr<std::string> &&_json);

		void send_webapi_teambanner_state(uint8_t _state);
		void send_webapi_map_state(uint8_t _state);

		void send_webapi_liveapi_socket_stats(uint64_t _conn_count, uint64_t _recv_count, uint64_t _send_count);

		// reply
		void reply_webapi_send_custommatch_createlobby(SOCKET _sock, uint32_t _sequence);
		void reply_webapi_send_custommatch_sendchat(SOCKET _sock, uint32_t _sequence);
		void reply_webapi_send_custommatch_setsettings(SOCKET _sock, uint32_t _sequence);
		void reply_webapi_send_custommatch_getlobbyplayers(SOCKET _sock, uint32_t _sequence);
		void reply_webapi_send_changecamera(SOCKET _sock, uint32_t _sequence);
		void reply_webapi_send_custommatch_setteamname(SOCKET _sock, uint32_t _sequence);
		void reply_webapi_send_pausetoggle(SOCKET _sock, uint32_t _sequence);
		void reply_livedata_get_game(SOCKET _sock, uint32_t _sequence);
		void reply_livedata_get_teams(SOCKET _sock, uint32_t _sequence);
		void reply_livedata_get_team_players(SOCKET _sock, uint32_t _sequence, uint8_t _teamid);
		void reply_webapi_set_observer(SOCKET _sock, uint32_t _sequence, const std::string& _hash);
		void reply_webapi_get_observer(SOCKET _sock, uint32_t _sequence, const std::string& _hash);
		void reply_webapi_get_observers(SOCKET _sock, uint32_t _sequence, const std::string& _hash);
		void reply_webapi_get_tournament_ids(SOCKET _sock, uint32_t _sequence, const std::string& _json);
		void reply_webapi_set_tournament_name(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _name);
		void reply_webapi_rename_tournament_name(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _name, bool _result);
		void reply_webapi_set_tournament_params(SOCKET _sock, uint32_t _sequence, const std::string& _id, bool _result, const std::string& _json);
		void reply_webapi_get_tournament_params(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _json);
		void reply_webapi_set_tournament_result(SOCKET _sock, uint32_t _sequence, const std::string& _id, uint32_t _gameid, bool _result, const std::string& _json);
		void reply_webapi_get_tournament_result(SOCKET _sock, uint32_t _sequence, const std::string& _id, uint32_t _gameid, const std::string& _json);
		void reply_webapi_get_tournament_results(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _json);
		void reply_webapi_get_current_tournament(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _name, uint32_t _gameid);
		void reply_webapi_set_team_params(SOCKET _sock, uint32_t _sequence, const std::string& _id, uint8_t team_id, bool _result, const std::string& _json);
		void reply_webapi_get_team_params(SOCKET _sock, uint32_t _sequence, const std::string& _id, uint8_t team_id, const std::string& _json);
		void reply_webapi_set_player_params(SOCKET _sock, uint32_t _sequence, const std::string& _hash, bool _result, const std::string& _json);
		void reply_webapi_get_player_params(SOCKET _sock, uint32_t _sequence, const std::string& _hash, const std::string& _json);
		void reply_webapi_get_players(SOCKET _sock, uint32_t _sequence, const std::string& _json);
		void reply_webapi_set_liveapi_config(SOCKET _sock, uint32_t _sequence, bool _result, const std::string& _json);
		void reply_webapi_get_liveapi_config(SOCKET _sock, uint32_t _sequence, const std::string& _json);
		void reply_webapi_get_stats_from_code(SOCKET _sock, uint32_t _sequence, const std::string& _stats_code, uint32_t _status_code, const std::string& _json);
		void broadcast_object(uint32_t _sequence, const std::string& _json);

		void livedata_get_game(SOCKET _sock, uint32_t _sequence);
		void livedata_get_teams(SOCKET _sock, uint32_t _sequence);
		void livedata_get_team_players(SOCKET _sock, uint32_t _sequence, uint8_t _teamid);

		void check_game_start();

		// save/clear
		void clear_livedata();
		void save_result();
		std::queue<UINT> pull_messages();

	public:
		core_thread(const std::string& _lip, uint16_t _lport, const std::string& _wip, uint16_t _wport, uint16_t _wmaxconn);
		~core_thread();

		// コピー不可
		core_thread(const core_thread&) = delete;
		core_thread& operator = (const core_thread&) = delete;
		// ムーブ不可
		core_thread(core_thread&&) = delete;
		core_thread& operator = (core_thread&&) = delete;

		bool run(HWND);
		void stop();
		void ping();
		void push_message(UINT _message);
		void liveapi_queuecheck();
	};
}
