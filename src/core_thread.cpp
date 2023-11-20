﻿#include "core_thread.hpp"

#include "log.hpp"

#include "utils.hpp"

#include <regex>
#include <chrono>


namespace {

	bool is_hash(const std::string& _s)
	{
		std::regex re("^[0-9a-fA-F]{32}$");
		if (_s.size() != 32) return false;
		return std::regex_match(_s, re);
	}

	uint64_t get_millis()
	{
		return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
	}
}

namespace app {


	const std::unordered_map<std::string, uint8_t> itemtype_map = {
		/* english */
		{"Syringe", WEBAPI_ITEM_SYRINGE},
		{"Med Kit (Level 2)", WEBAPI_ITEM_MEDKIT},
		{"Shield Cell", WEBAPI_ITEM_SHIELDCELL},
		{"Shield Battery (Level 2)", WEBAPI_ITEM_SHIELDBATTERY},
		{"Phoenix Kit (Level 3)", WEBAPI_ITEM_PHOENIXKIT},
		{"Ultimate Accelerant (Level 2)", WEBAPI_ITEM_ULTIMATEACCELERANT},
		{"Frag Grenade", WEBAPI_ITEM_FRAGGRENADE},
		{"Thermite Grenade", WEBAPI_ITEM_THERMITEGRENADE},
		{"Arc Star", WEBAPI_ITEM_ARCSTAR},
		{"Knockdown Shield", WEBAPI_ITEM_KNOCKDOWNSHIELD_LV1},
		{"Knockdown Shield (Level 2)", WEBAPI_ITEM_KNOCKDOWNSHIELD_LV2},
		{"Knockdown Shield (Level 3)", WEBAPI_ITEM_KNOCKDOWNSHIELD_LV3},
		{"Knockdown Shield (Level 4)", WEBAPI_ITEM_KNOCKDOWNSHIELD_LV4},
		{"Backpack", WEBAPI_ITEM_BACKPACK_LV1},
		{"Backpack (Level 2)", WEBAPI_ITEM_BACKPACK_LV2},
		{"Backpack (Level 3)", WEBAPI_ITEM_BACKPACK_LV3},
		{"Backpack (Level 4)", WEBAPI_ITEM_BACKPACK_LV4},
		{"Mobile Respawn Beacon (Level 2)", WEBAPI_ITEM_MOBILERESPAWNBEACON},
		{"Heat Shield (Level 2)", WEBAPI_ITEM_HEATSHIELD},
		{"Evac Tower (Level 2)", WEBAPI_ITEM_EVACTOWER}, // not confimed yet.
		{"Evo Shield", WEBAPI_ITEM_BODYSHIELD_LV1},
		{"Evo Shield (Level 2)", WEBAPI_ITEM_BODYSHIELD_LV2},
		{"Evo Shield (Level 3)", WEBAPI_ITEM_BODYSHIELD_LV3},
		{"Evo Shield (Level 5)", WEBAPI_ITEM_BODYSHIELD_LV5},
		{"Body Shield", WEBAPI_ITEM_BODYSHIELD_LV1},
		{"Body Shield (Level 2)", WEBAPI_ITEM_BODYSHIELD_LV2},
		{"Body Shield (Level 3)", WEBAPI_ITEM_BODYSHIELD_LV3},
		{"Body Shield (Level 4)", WEBAPI_ITEM_BODYSHIELD_LV4},

		/* 日本語 */
		{(const char*)u8"注射器", WEBAPI_ITEM_SYRINGE},
		{(const char*)u8"医療キット (Level 2)", WEBAPI_ITEM_MEDKIT},
		{(const char*)u8"シールドセル", WEBAPI_ITEM_SHIELDCELL},
		{(const char*)u8"シールドバッテリー (Level 2)", WEBAPI_ITEM_SHIELDBATTERY},
		{(const char*)u8"フェニックスキット (Level 3)", WEBAPI_ITEM_PHOENIXKIT},
		{(const char*)u8"アルティメット促進剤 (Level 2)", WEBAPI_ITEM_ULTIMATEACCELERANT},
		{(const char*)u8"フラググレネード", WEBAPI_ITEM_FRAGGRENADE},
		{(const char*)u8"テルミットグレネード", WEBAPI_ITEM_THERMITEGRENADE},
		{(const char*)u8"アークスター", WEBAPI_ITEM_ARCSTAR},
		{(const char*)u8"ノックダウンシールド", WEBAPI_ITEM_KNOCKDOWNSHIELD_LV1},
		{(const char*)u8"ノックダウンシールド (Level 2)", WEBAPI_ITEM_KNOCKDOWNSHIELD_LV2},
		{(const char*)u8"ノックダウンシールド (Level 3)", WEBAPI_ITEM_KNOCKDOWNSHIELD_LV3},
		{(const char*)u8"ノックダウンシールド (Level 4)", WEBAPI_ITEM_KNOCKDOWNSHIELD_LV4},
		{(const char*)u8"バックパック", WEBAPI_ITEM_BACKPACK_LV1},
		{(const char*)u8"バックパック (Level 2)", WEBAPI_ITEM_BACKPACK_LV2},
		{(const char*)u8"バックパック (Level 3)", WEBAPI_ITEM_BACKPACK_LV3},
		{(const char*)u8"バックパック (Level 4)", WEBAPI_ITEM_BACKPACK_LV4},
		{(const char*)u8"モバイルリスポーンビーコン (Level 2)", WEBAPI_ITEM_MOBILERESPAWNBEACON},
		{(const char*)u8"ヒートシールド (Level 2)", WEBAPI_ITEM_HEATSHIELD},
		{(const char*)u8"脱出タワー (Level 2)", WEBAPI_ITEM_EVACTOWER},
		{(const char*)u8"進化式ボディーシールド", WEBAPI_ITEM_BODYSHIELD_LV1},
		{(const char*)u8"進化式ボディーシールド (Level 2)", WEBAPI_ITEM_BODYSHIELD_LV2},
		{(const char*)u8"進化式ボディーシールド (Level 3)", WEBAPI_ITEM_BODYSHIELD_LV3},
		{(const char*)u8"進化式ボディーシールド (Level 5)", WEBAPI_ITEM_BODYSHIELD_LV5},
		{(const char*)u8"ボディーシールド", WEBAPI_ITEM_BODYSHIELD_LV1},
		{(const char*)u8"ボディーシールド (Level 2)", WEBAPI_ITEM_BODYSHIELD_LV2},
		{(const char*)u8"ボディーシールド (Level 3)", WEBAPI_ITEM_BODYSHIELD_LV3},
		{(const char*)u8"ボディーシールド (Level 4)", WEBAPI_ITEM_BODYSHIELD_LV4},
	};

	uint8_t string_to_itemid(const std::string& _str)
	{
		if (itemtype_map.contains(_str)) {
			return itemtype_map.at(_str);
		}
		return 0;
	}

	void core_thread::sendto_liveapi(ctx_buffer_t&& _data)
	{
		liveapi_queue_.push(std::move(_data));
		sendto_liveapi_queuecheck();
	}

	void core_thread::sendto_liveapi_queuecheck()
	{
		uint64_t current = get_millis();
		if ((!liveapi_available_) && current < liveapi_lastsend_ + 2000) return; // timeout
		liveapi_available_ = true;
		if (current < liveapi_lastresponse_ + 300) return; // 少なくとも300ms待つ
		if (liveapi_queue_.empty()) return;
		ctx_buffer_t data = std::move(liveapi_queue_.front());
		liveapi_queue_.pop();

		ctx_.push_wq(CTX_LIVEAPI, std::make_unique<std::pair<SOCKET, ctx_buffer_t>>(INVALID_SOCKET, std::move(data)));
		liveapi_.tell_wq();
		liveapi_available_ = false;
		liveapi_lastsend_ = current;
	}

	void core_thread::sendto_webapi(ctx_buffer_t&& _data)
	{
		sendto_webapi(INVALID_SOCKET, std::move(_data));
	}

	void core_thread::sendto_webapi(SOCKET _sock, ctx_buffer_t&& _data)
	{
		auto data = std::make_unique<std::pair<SOCKET, ctx_buffer_t>>(_sock, std::move(_data));
		ctx_.push_wq(CTX_WEBAPI, std::move(data));
		webapi_.tell_wq();
	}

	core_thread::core_thread(const std::string& _lip, uint16_t _lport, const std::string& _wip, uint16_t _wport, uint16_t _wmaxconn)
		: window_(NULL)
		, thread_(NULL)
		, event_close_(NULL)
		, event_message_(NULL)
		, event_queuecheck_(NULL)
		, ctx_()
		, liveapi_(LOG_LIVEAPI, CTX_LIVEAPI, ctx_, _lip, _lport, 2)
		, webapi_(LOG_WEBAPI, CTX_WEBAPI, ctx_, _wip, _wport, _wmaxconn)
		, local_(LOG_LOCAL)
		, filedump_()
		, game_()
		, observer_hash_("")
		, mtx_()
		, messages_()
		, liveapi_queue_()
		, liveapi_available_(true)
		, liveapi_lastsend_(0)
		, liveapi_lastresponse_(0)
	{
	}

	core_thread::~core_thread()
	{
		stop();
		if (event_queuecheck_) ::CloseHandle(event_queuecheck_);
		if (event_message_) ::CloseHandle(event_message_);
		if (event_close_) ::CloseHandle(event_close_);
	}

	DWORD WINAPI core_thread::proc_common(LPVOID _p)
	{
		auto p = reinterpret_cast<core_thread*>(_p);
		return p->proc();
	}

	//---------------------------------------------------------------------------------
	// PROC
	//---------------------------------------------------------------------------------
	DWORD core_thread::proc()
	{
		log(LOG_CORE, L"Info: thread start.");

		HANDLE events[] = {
			event_close_,
			ctx_.revent_.at(0),
			ctx_.revent_.at(1),
			local_.get_event_wq(),
			event_message_,
			ctx_.sevent_.at(0),
			ctx_.sevent_.at(1),
			event_queuecheck_
		};

		// 初回のデータロード
		local_.get_observer(INVALID_SOCKET, 0);
		

		while (true)
		{

			auto id = ::WaitForMultipleObjects(ARRAYSIZE(events), events, FALSE, INFINITE);
			if (id == WAIT_OBJECT_0)
			{
				// 終了
				log(LOG_CORE, L"Info: receive close event.");
				break;
			}
			else if (id == WAIT_OBJECT_0 + 1)
			{
				// liveapiからデータ到達
				auto q = ctx_.pull_rq(CTX_LIVEAPI);
				if (q)
				{
					while (q->size() > 0)
					{
						auto data = std::move(q->front());
						q->pop();
						if (data)
						{
							proc_liveapi_data(std::move(data));
						}
					}
				}
			}
			else if (id == WAIT_OBJECT_0 + 2)
			{
				// ブラウザからデータ到達
				auto q = ctx_.pull_rq(CTX_WEBAPI);
				if (q)
				{
					while (q->size() > 0)
					{
						auto data = std::move(q->front());
						q->pop();
						if (data)
						{
							proc_webapi_data(std::move(data));
						}
					}
				}
			}
			else if (id == WAIT_OBJECT_0 + 3)
			{

				// ローカルスレッドからデータ到達
				auto q = local_.pull_wq();
				while (q.size() > 0)
				{
					auto data = std::move(q.front());
					q.pop();
					if (data)
					{
						proc_local_data(std::move(data));
					}
				}
			}
			else if (id == WAIT_OBJECT_0 + 4)
			{
				// main_windowからメッセージ到達
				auto q = pull_messages();
				while (q.size() > 0)
				{
					auto message = q.front();
					q.pop();
					proc_message(message);
				}
			}
			else if (id == WAIT_OBJECT_0 + 5)
			{
				// stats(0)
				auto stats = ctx_.get_stats(0);
				auto conn_count = std::get<0>(stats);
				auto recv_count = std::get<1>(stats);
				auto send_count = std::get<2>(stats);
				::PostMessageW(window_, CWM_WEBSOCKET_STATS_CONNECTION_COUNT, 0, conn_count);
				::PostMessageW(window_, CWM_WEBSOCKET_STATS_RECV_COUNT, 0, recv_count);
				::PostMessageW(window_, CWM_WEBSOCKET_STATS_SEND_COUNT, 0, send_count);

				send_webapi_liveapi_socket_stats(conn_count, recv_count, send_count);
			}
			else if (id == WAIT_OBJECT_0 + 6)
			{
				// stats(1)
				auto stats = ctx_.get_stats(1);
				::PostMessageW(window_, CWM_WEBSOCKET_STATS_CONNECTION_COUNT, 1, std::get<0>(stats));
				::PostMessageW(window_, CWM_WEBSOCKET_STATS_RECV_COUNT, 1, std::get<1>(stats));
				::PostMessageW(window_, CWM_WEBSOCKET_STATS_SEND_COUNT, 1, std::get<2>(stats));
			}
			else if (id == WAIT_OBJECT_0 + 7)
			{
				// queue check
				sendto_liveapi_queuecheck();
			}
		}
		log(LOG_CORE, L"Info: thread end.");

		return 0;
	}

	//---------------------------------------------------------------------------------
	// PROC LIVEAPI DATA
	//---------------------------------------------------------------------------------
	void core_thread::proc_liveapi_data(ctx_data_t &&_data)
	{
		bool result = false;
		auto socket = _data->first;

		// メッセージとして処理
		if (!result)
		{
			rtech::liveapi::LiveAPIEvent ev;
			result = ev.ParseFromArray(_data->second->data(), _data->second->size());
			if (result)
			{
				if (ev.has_gamemessage())
				{

					// メッセージの場合は書き込む
					proc_liveapi_any(ev.gamemessage());

					// ファイルに書き込む
					filedump_.push(std::move(_data->second));

					return;
				}
				else
				{
					result = false;
				}
			}
		}

		if (!result)
		{
			log(LOG_CORE, L"Info: data is not protobuf data.");
		}
	}

	//---------------------------------------------------------------------------------
	// PROC WEBAPI DATA
	//---------------------------------------------------------------------------------
	void core_thread::proc_webapi_data(ctx_data_t &&_data)
	{
		auto socket = _data->first;
		uint32_t sequence = 0;
		received_webapi_data wdata;

		if (!wdata.set(std::move(_data->second)))
		{
			log(LOG_CORE, L"Error: receive data parse failed.");
			return;
		}

		// sequence番号の読み出し
		if (wdata.size() == 0)
		{
			log(LOG_CORE, L"Error: sended data size is zero.");
			return;
		}
		try
		{
			sequence = wdata.get_uint32(0);
		}
		catch (...)
		{
			log(LOG_CORE, L"Error: cannot parse sequence.");
			return;
		}

		switch (wdata.event_type())
		{
		case WEBAPI_SEND_CUSTOMMATCH_CREATELOBBY:
		{
			log(LOG_CORE, L"Info: WEBAPI_SEND_CUSTOMMATCH_CREATELOBBY received.");

			// CustomMatch_CreateLobby
			rtech::liveapi::Request req;
			auto act = new rtech::liveapi::CustomMatch_CreateLobby();

			req.set_withack(true);
			req.set_allocated_custommatch_createlobby(act);

			// 送信
			auto buf = std::make_unique<std::vector<uint8_t>>();
			buf->resize(req.ByteSizeLong());
			if (buf->size() > 0)
			{
				req.SerializeToArray(buf->data(), buf->size());
				sendto_liveapi(std::move(buf));
				reply_webapi_send_custommatch_createlobby(socket, sequence);
			}
			break;
		}
		case WEBAPI_SEND_CUSTOMMATCH_GETLOBBYPLAYERS:
		{
			log(LOG_CORE, L"Info: WEBAPI_SEND_CUSTOMMATCH_GETLOBBYPLAYERS received.");
			// CustomMatch_GetLobbyPlayers
			rtech::liveapi::Request req;
			auto act = new rtech::liveapi::CustomMatch_GetLobbyPlayers();

			req.set_withack(true);
			req.set_allocated_custommatch_getlobbyplayers(act);

			// 送信
			auto buf = std::make_unique<std::vector<uint8_t>>();
			buf->resize(req.ByteSizeLong());
			if (buf->size() > 0)
			{
				req.SerializeToArray(buf->data(), buf->size());
				sendto_liveapi(std::move(buf));
				reply_webapi_send_custommatch_getlobbyplayers(socket, sequence);
			}
			break;
		}
		case WEBAPI_LIVEDATA_GET_GAME:
			log(LOG_CORE, L"Info: WEBAPI_LIVEDATA_GET_GAME received.");
			livedata_get_game(socket, sequence);
			break;
		case WEBAPI_LIVEDATA_GET_TEAMS:
			log(LOG_CORE, L"Info: WEBAPI_LIVEDATA_GET_TEAMS received.");
			livedata_get_teams(socket, sequence);
			break;
		case WEBAPI_LIVEDATA_GET_TEAM_PLAYERS:
			log(LOG_CORE, L"Info: WEBAPI_LIVEDATA_GET_TEAM_PLAYERS received.");
			if (wdata.size() != 2)
			{
				log(LOG_CORE, L"Error: sended data size is not 2. (size=%d)", wdata.size());
				return;
			}
			try
			{
				auto teamid = wdata.get_uint8(1);
				livedata_get_team_players(socket, sequence, teamid);
			}
			catch (std::out_of_range& oor)
			{
				log(LOG_CORE, L"Error: data parse failed(%s)", s_to_ws(oor.what()));
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		case WEBAPI_LOCALDATA_GET_OBSERVER:
		{
			log(LOG_CORE, L"Info: WEBAPI_SEND_GET_OBSERVER received.");
			local_.get_observer(socket, sequence);
			break;
		}
		case WEBAPI_LOCALDATA_GET_OBSERVERS:
		{
			log(LOG_CORE, L"Info: WEBAPI_SEND_GET_OBSERVERS received.");
			local_.get_observers(socket, sequence);
			break;
		}
		case WEBAPI_LOCALDATA_GET_TOURNAMENT_IDS:
		{
			log(LOG_CORE, L"Info: WEBAPI_LOCALDATA_GET_TOURNAMENT_IDS received.");
			local_.get_tournament_ids(socket, sequence);
			break;
		}
		case WEBAPI_LOCALDATA_SET_TOURNAMENT_NAME:
		{
			log(LOG_CORE, L"Info: LOCAL_DATA_TYPE_SET_TOURNAMENT_NAME received.");
			if (wdata.size() != 2)
			{
				log(LOG_CORE, L"Error: sended data size is not 2. (size=%d)", wdata.size());
				return;
			}
			try
			{
				auto name = wdata.get_string(1);
				local_.set_tournament_name(socket, sequence, name);
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		}
		case WEBAPI_LOCALDATA_RENAME_TOURNAMENT_NAME:
		{
			log(LOG_CORE, L"Info: LOCAL_DATA_TYPE_RENAME_TOURNAMENT_NAME received.");
			if (wdata.size() != 3)
			{
				log(LOG_CORE, L"Error: sended data size is not 3. (size=%d)", wdata.size());
				return;
			}
			try
			{
				auto id = wdata.get_string(1);
				auto name = wdata.get_string(2);
				local_.rename_tournament_name(socket, sequence, id, name);
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		}
		case WEBAPI_LOCALDATA_SET_TOURNAMENT_PARAMS:
		{
			log(LOG_CORE, L"Info: LOCAL_DATA_TYPE_SET_TOURNAMENT_PARAMS received.");
			if (wdata.size() != 2)
			{
				log(LOG_CORE, L"Error: sended data size is not 2. (size=%d)", wdata.size());
				return;
			}
			try
			{
				auto json = wdata.get_json(1);
				local_.set_tournament_params(socket, sequence, json);
			}
			catch (std::out_of_range& oor)
			{
				log(LOG_CORE, L"Error: data parse failed(%s)", s_to_ws(oor.what()));
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		}
		case WEBAPI_LOCALDATA_GET_TOURNAMENT_PARAMS:
		{
			log(LOG_CORE, L"Info: LOCAL_DATA_TYPE_GET_TOURNAMENT_PARAMS received.");
			if (wdata.size() != 1)
			{
				log(LOG_CORE, L"Error: sended data size is not 1. (size=%d)", wdata.size());
				return;
			}
			try
			{
				local_.get_tournament_params(socket, sequence);
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		}
		case WEBAPI_LOCALDATA_SET_TOURNAMENT_RESULT:
		{
			log(LOG_CORE, L"Info: WEBAPI_LOCALDATA_SET_TOURNAMENT_RESULT received.");
			if (wdata.size() != 3)
			{
				log(LOG_CORE, L"Error: sended data size is not 3. (size=%d)", wdata.size());
				return;
			}
			try
			{
				uint32_t game_id = wdata.get_uint8(1);
				auto json = wdata.get_json(2);
				local_.set_tournament_result(socket, sequence, game_id, json);
			}
			catch (std::out_of_range& oor)
			{
				log(LOG_CORE, L"Error: data parse failed(%s)", s_to_ws(oor.what()));
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		}
		case WEBAPI_LOCALDATA_GET_TOURNAMENT_RESULT:
		{
			log(LOG_CORE, L"Info: LOCAL_DATA_TYPE_GET_TOURNAMENT_RESULT received.");
			if (wdata.size() != 2)
			{
				log(LOG_CORE, L"Error: sended data size is not 2. (size=%d)", wdata.size());
				return;
			}
			try
			{
				uint32_t game_id = wdata.get_uint8(1);
				local_.get_tournament_result(socket, sequence, game_id);
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		}
		case WEBAPI_LOCALDATA_GET_TOURNAMENT_RESULTS:
		{
			log(LOG_CORE, L"Info: LOCAL_DATA_TYPE_GET_TOURNAMENT_RESULTS received.");
			if (wdata.size() != 1)
			{
				log(LOG_CORE, L"Error: sended data size is not 1. (size=%d)", wdata.size());
				return;
			}
			try
			{
				local_.get_tournament_results(socket, sequence);
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		}
		case WEBAPI_LOCALDATA_GET_CURRENT_TOURNAMENT:
		{
			log(LOG_CORE, L"Info: WEBAPI_LOCALDATA_GET_CURRENT_TOURNAMENT received.");
			if (wdata.size() != 1)
			{
				log(LOG_CORE, L"Error: sended data size is not 1. (size=%d)", wdata.size());
				return;
			}
			try
			{
				local_.get_current_tournament(socket, sequence);
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		}
		case WEBAPI_LOCALDATA_SET_TEAM_PARAMS:
		{
			log(LOG_CORE, L"Info: LOCAL_DATA_TYPE_SET_TEAM_PARAMS received.");
			if (wdata.size() != 3)
			{
				log(LOG_CORE, L"Error: sended data size is not 3. (size=%d)", wdata.size());
				return;
			}
			try
			{
				uint32_t teamid = wdata.get_uint8(1);
				std::string json = wdata.get_json(2);
				local_.set_team_params(socket, sequence, teamid, json);
			}
			catch (std::out_of_range& oor)
			{
				log(LOG_CORE, L"Error: data parse failed(%s)", s_to_ws(oor.what()));
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		}
		case WEBAPI_LOCALDATA_GET_TEAM_PARAMS:
		{
			log(LOG_CORE, L"Info: LOCAL_DATA_TYPE_GET_TEAM_PARAMS received.");
			if (wdata.size() != 2)
			{
				log(LOG_CORE, L"Error: sended data size is not 2. (size=%d)", wdata.size());
				return;
			}
			try
			{
				uint32_t teamid = wdata.get_uint8(1);
				local_.get_team_params(socket, sequence, teamid);
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		}
		case WEBAPI_LOCALDATA_SET_PLAYER_PARAMS:
		{
			log(LOG_CORE, L"Info: LOCAL_DATA_TYPE_SET_PLAYER_PARAMS received.");
			if (wdata.size() != 3)
			{
				log(LOG_CORE, L"Error: sended data size is not 3. (size=%d)", wdata.size());
				return;
			}
			try
			{
				std::string hash = wdata.get_string(1);
				std::string json = wdata.get_json(2);
				local_.set_player_params(socket, sequence, hash, json);
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		}
		case WEBAPI_LOCALDATA_GET_PLAYER_PARAMS:
		{
			log(LOG_CORE, L"Info: LOCAL_DATA_TYPE_GET_PLAYER_PARAMS received.");
			if (wdata.size() != 2)
			{
				log(LOG_CORE, L"Error: sended data size is not 2. (size=%d)", wdata.size());
				return;
			}
			try
			{
				std::string hash = wdata.get_string(1);
				local_.get_player_params(socket, sequence, hash);
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		}
		case WEBAPI_LOCALDATA_GET_PLAYERS:
		{
			log(LOG_CORE, L"Info: LOCAL_DATA_TYPE_GET_PLAYERS received.");
			if (wdata.size() != 1)
			{
				log(LOG_CORE, L"Error: sended data size is not 1. (size=%d)", wdata.size());
				return;
			}
			try
			{
				local_.get_players(socket, sequence);
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
			}
			break;
		}
		case WEBAPI_SEND_CUSTOMMATCH_SETSETTINGS:
		{
			log(LOG_CORE, L"Info: WEBAPI_SEND_CUSTOMMATCH_SETSETTINGS received.");

			if (wdata.size() != 7)
			{
				log(LOG_CORE, L"Error: sended data size is not 7. (size=%d)", wdata.size());
				return;
			}

			// CustomMatch_SetSettings
			rtech::liveapi::Request req;
			auto act = new rtech::liveapi::CustomMatch_SetSettings();

			try
			{
				act->set_playlistname(wdata.get_string(1));
				act->set_adminchat(wdata.get_bool(2));
				act->set_teamrename(wdata.get_bool(3));
				act->set_selfassign(wdata.get_bool(4));
				act->set_aimassist(wdata.get_bool(5));
				act->set_anonmode(wdata.get_bool(6));
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
				return;
			}

			req.set_withack(true);
			req.set_allocated_custommatch_setsettings(act);

			// 送信
			auto buf = std::make_unique<std::vector<uint8_t>>();
			buf->resize(req.ByteSizeLong());
			if (buf->size() > 0)
			{
				req.SerializeToArray(buf->data(), buf->size());
				sendto_liveapi(std::move(buf));
				reply_webapi_send_custommatch_setsettings(socket, sequence);
			}
			break;
		}
		case WEBAPI_SEND_CUSTOMMATCH_SETTEAMNAME:
		{
			log(LOG_CORE, L"Info: WEBAPI_SEND_CUSTOMMATCH_SETTEAMNAME received.");

			if (wdata.size() != 3)
			{
				log(LOG_CORE, L"Error: sended data size is not 3. (size=%d)", wdata.size());
				return;
			}

			// CustomMatch_SetTeamName
			rtech::liveapi::Request req;
			auto act = new rtech::liveapi::CustomMatch_SetTeamName();

			try
			{
				act->set_teamid((int32_t)wdata.get_uint8(1));
				act->set_teamname(wdata.get_string(2));
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
				return;
			}

			req.set_withack(true);
			req.set_allocated_custommatch_setteamname(act);

			// 送信
			auto buf = std::make_unique<std::vector<uint8_t>>();
			buf->resize(req.ByteSizeLong());
			if (buf->size() > 0)
			{
				req.SerializeToArray(buf->data(), buf->size());
				sendto_liveapi(std::move(buf));
				reply_webapi_send_custommatch_setteamname(socket, sequence);
			}
			break;
		}
		case WEBAPI_SEND_CUSTOMMATCH_SENDCHAT:
		{
			log(LOG_CORE, L"Info: WEBAPI_SEND_CUSTOMMATCH_SENDCHAT received.");

			if (wdata.size() != 2)
			{
				log(LOG_CORE, L"Error: sended data size is not 2. (size=%d)", wdata.size());
				return;
			}

			// CustomMatch_SendChat
			rtech::liveapi::Request req;
			auto act = new rtech::liveapi::CustomMatch_SendChat();

			// 文字設定
			try
			{
				act->set_text(wdata.get_string(1).c_str());
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
				return;
			}

			req.set_withack(true);
			req.set_allocated_custommatch_sendchat(act);

			// 送信
			auto buf = std::make_unique<std::vector<uint8_t>>();
			buf->resize(req.ByteSizeLong());
			if (buf->size() > 0)
			{
				req.SerializeToArray(buf->data(), buf->size());
				sendto_liveapi(std::move(buf));
				reply_webapi_send_custommatch_sendchat(socket, sequence);
			}
			break;
		}
		case WEBAPI_SEND_CHANGECAMERA:
		{
			log(LOG_CORE, L"Info: WEBAPI_SEND_CHANGECAMERA received.");
			
			if (wdata.size() != 2)
			{
				log(LOG_CORE, L"Error: sended data size is not 2. (size=%d)", wdata.size());
				return;
			}

			// ChangeCamera
			rtech::liveapi::Request req;
			auto act = new rtech::liveapi::ChangeCamera();

			// カメラ設定
			try
			{
				act->set_name(wdata.get_string(1).c_str());
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
				return;
			}

			req.set_withack(true);
			req.set_allocated_changecam(act);

			// 送信
			auto buf = std::make_unique<std::vector<uint8_t>>();
			buf->resize(req.ByteSizeLong());
			if (buf->size() > 0)
			{
				req.SerializeToArray(buf->data(), buf->size());
				sendto_liveapi(std::move(buf));
				reply_webapi_send_changecamera(socket, sequence);
			}
			break;
		}
		case WEBAPI_SEND_PAUSETOGGLE:
		{
			log(LOG_CORE, L"Info: WEBAPI_SEND_PAUSETOGGLE received.");

			if (wdata.size() != 2)
			{
				log(LOG_CORE, L"Error: sended data size is not 2. (size=%d)", wdata.size());
				return;
			}

			// PauseToggle
			rtech::liveapi::Request req;
			auto act = new rtech::liveapi::PauseToggle();

			float pretimer = wdata.get_float32(1);
			if (pretimer <= 0.0f) break;
			if (10.0f <= pretimer) break;

			try
			{
				act->set_pretimer(pretimer);
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
				return;
			}

			req.set_withack(true);
			req.set_allocated_pausetoggle(act);

			// 送信
			auto buf = std::make_unique<std::vector<uint8_t>>();
			buf->resize(req.ByteSizeLong());
			if (buf->size() > 0)
			{
				req.SerializeToArray(buf->data(), buf->size());
				sendto_liveapi(std::move(buf));
				reply_webapi_send_pausetoggle(socket, sequence);
			}
			break;
		}
		case WEBAPI_LOCALDATA_SET_OBSERVER:
		{
			log(LOG_CORE, L"Info: WEBAPI_SEND_SET_OBSERVER received.");

			if (wdata.size() != 2)
			{
				log(LOG_CORE, L"Error: sended data size is not 2. (size=%d)", wdata.size());
			}

			std::string hash;
			try
			{
				hash = wdata.get_string(1);
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
				return;
			}

			if (!is_hash(hash))
			{
				log(LOG_CORE, L"Error: hash is not 32byte hex string.");
				return;
			}

			local_.set_observer(socket, sequence, hash);
			break;
		}
		case WEBAPI_BROADCAST_OBJECT:
		{
			log(LOG_CORE, L"Info: WEBAPI_BROADCAST_OBJECT received.");

			if (wdata.size() != 2)
			{
				log(LOG_CORE, L"Error: sended data size is not 2. (size=%d)", wdata.size());
			}

			std::string json;
			try
			{
				json = wdata.get_json(1);
			}
			catch (...)
			{
				log(LOG_CORE, L"Error: data parse failed.");
				return;
			}

			broadcast_object(sequence, json);
			break;
		}
		default:
		{
			log(LOG_CORE, L"Info: receive data event type=0x%x, not implement yet.", (uint16_t)wdata.event_type());
		}
		}
	}

	//---------------------------------------------------------------------------------
	// PROC LOCAL DATA
	//---------------------------------------------------------------------------------
	void core_thread::proc_local_data(local_queue_data_t&& _data)
	{
		switch(_data->data_type)
		{
		case LOCAL_DATA_TYPE_SET_OBSERVER:
			observer_hash_ = _data->hash;
			reply_webapi_set_observer(_data->sock, _data->sequence, _data->hash);
			break;
		case LOCAL_DATA_TYPE_GET_OBSERVER:
			observer_hash_ = _data->hash;
			reply_webapi_get_observer(_data->sock, _data->sequence, _data->hash);
			break;
		case LOCAL_DATA_TYPE_GET_OBSERVERS:
			reply_webapi_get_observers(_data->sock, _data->sequence, _data->hash);
			break;
		case LOCAL_DATA_TYPE_SAVE_RESULT:
			send_webapi_save_result(_data->tournament_id, _data->game_id, std::move(_data->json));
			break;
		case LOCAL_DATA_TYPE_GET_TOURNAMENT_IDS:
			if (_data->json != nullptr)
			{
				reply_webapi_get_tournament_ids(_data->sock, _data->sequence, *_data->json);
			}
			break;
		case LOCAL_DATA_TYPE_SET_TOURNAMENT_NAME:
			reply_webapi_set_tournament_name(INVALID_SOCKET, _data->sequence, _data->tournament_id, _data->tournament_name);
			break;
		case LOCAL_DATA_TYPE_RENAME_TOURNAMENT_NAME:
			reply_webapi_rename_tournament_name(_data->sock, _data->sequence, _data->tournament_id, _data->tournament_name, _data->result);
			break;
		case LOCAL_DATA_TYPE_SET_TOURNAMENT_PARAMS:
			if (_data->json != nullptr)
			{
				reply_webapi_set_tournament_params(INVALID_SOCKET, _data->sequence, _data->tournament_id, _data->result, *_data->json);
			}
			break;
		case LOCAL_DATA_TYPE_GET_TOURNAMENT_PARAMS:
			if (_data->json != nullptr)
			{
				reply_webapi_get_tournament_params(_data->sock, _data->sequence, _data->tournament_id, *_data->json);
			}
			break;
		case LOCAL_DATA_TYPE_SET_TOURNAMENT_RESULT:
			if (_data->json != nullptr)
			{
				reply_webapi_set_tournament_result(_data->sock, _data->sequence, _data->tournament_id, _data->game_id, _data->result, *_data->json);
			}
			break;
		case LOCAL_DATA_TYPE_GET_TOURNAMENT_RESULT:
			if (_data->json != nullptr)
			{
				reply_webapi_get_tournament_result(_data->sock, _data->sequence, _data->tournament_id, _data->game_id, *_data->json);
			}
			break;
		case LOCAL_DATA_TYPE_GET_TOURNAMENT_RESULTS:
			if (_data->json != nullptr)
			{
				reply_webapi_get_tournament_results(_data->sock, _data->sequence, _data->tournament_id, *_data->json);
			}
			break;
		case LOCAL_DATA_TYPE_GET_CURRENT_TOURNAMENT:
			reply_webapi_get_current_tournament(_data->sock, _data->sequence, _data->tournament_id, _data->tournament_name, _data->result_count);
			break;
		case LOCAL_DATA_TYPE_SET_TEAM_PARAMS:
			if (_data->json != nullptr)
			{
				reply_webapi_set_team_params(INVALID_SOCKET, _data->sequence, _data->tournament_id, _data->team_id, _data->result, *_data->json);
			}
			break;
		case LOCAL_DATA_TYPE_GET_TEAM_PARAMS:
			if (_data->json != nullptr)
			{
				reply_webapi_get_team_params(_data->sock, _data->sequence, _data->tournament_id, _data->team_id, *_data->json);
			}
			break;
		case LOCAL_DATA_TYPE_SET_PLAYER_PARAMS:
			if (_data->json != nullptr)
			{
				reply_webapi_set_player_params(INVALID_SOCKET, _data->sequence, _data->hash, _data->result, *_data->json);
			}
			break;
		case LOCAL_DATA_TYPE_GET_PLAYER_PARAMS:
			if (_data->json != nullptr)
			{
				reply_webapi_get_player_params(_data->sock, _data->sequence, _data->hash, *_data->json);
			}
			break;
		case LOCAL_DATA_TYPE_GET_PLAYERS:
			if (_data->json != nullptr)
			{
				reply_webapi_get_players(_data->sock, _data->sequence, *_data->json);
			}
			break;
		}
	}

	//---------------------------------------------------------------------------------
	// PROC LIVEAPI ANY
	//---------------------------------------------------------------------------------
	void core_thread::proc_liveapi_any(const google::protobuf::Any& _any)
	{
		namespace api = rtech::liveapi;
		if (_any.Is<api::Response>())
		{
			api::Response p;
			if (!_any.UnpackTo(&p)) return;

			// 溜まってるメッセージを確認
			liveapi_available_ = true;
			liveapi_lastresponse_ = get_millis();
			sendto_liveapi_queuecheck();
			
			log(LOG_CORE, L"Info: Response received. success = %d", p.success() ? 1 : 0);
			if (!p.has_result()) return;
			proc_liveapi_any(p.result());
		}
		else if (_any.Is<api::RequestStatus>())
		{
			api::RequestStatus p;
			if (!_any.UnpackTo(&p)) return;
			auto wstatus = s_to_ws(p.status());
			log(LOG_CORE, L"Info: RequestStatus received. success = %s", wstatus.c_str());
		}
		else if (_any.Is<api::Init>())
		{
			log(LOG_CORE, L"Info: Init received.");
		}
		else if (_any.Is<api::CustomMatch_LobbyPlayers>())
		{
			api::CustomMatch_LobbyPlayers p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: CustomMatch_LobbyPlayers received.");

			for (int i = 0; i < p.players_size(); ++i)
			{
				auto name = p.players(i).name();
				auto teamid = p.players(i).teamid();
				auto hash = p.players(i).nucleushash();
				auto hardware = p.players(i).hardwarename();
				send_webapi_lobbyplayer(teamid, hash, name, hardware);
			}
		}
		else if (_any.Is<api::ObserverSwitched>())
		{
			api::ObserverSwitched p;
			if (!_any.UnpackTo(&p)) return;
			
			log(LOG_CORE, L"Info: ObserverSwitched received.");
			if (p.has_target() && p.has_observer())
			{
				auto& observer = p.observer();
				auto& target = p.target();

				proc_player(observer);
				proc_player(target);
				for (int i = 0; i < p.targetteam_size(); ++i)
				{
					auto &member = p.targetteam(i);
					proc_player(member);
				}

				uint8_t oteamid = p.observer().teamid();
				uint8_t osquadindex = get_squadindex(p.observer());
				uint8_t tteamid = p.target().teamid();
				uint8_t tsquadindex = get_squadindex(p.target());

				// 自分のカメライベントだった場合は保存しておく
				if (observer.nucleushash() == observer_hash_)
				{
					game_.camera_teamid = tteamid;
					game_.camera_squadindex = tsquadindex;
				}

				send_webapi_observerswitched(INVALID_SOCKET, oteamid, osquadindex, tteamid, tsquadindex, observer.nucleushash() == observer_hash_);
			}
		}
		else if (_any.Is<api::MatchSetup>())
		{
			api::MatchSetup p;
			if (!_any.UnpackTo(&p)) return;
			
			log(LOG_CORE, L"Info: MatchSetup received.");
			std::string datacenter = "";
			if (p.has_datacenter())
			{
				datacenter = p.datacenter().name();
			}

			game_.map = p.map();
			game_.playlistname = p.playlistname();
			game_.playlistdesc = p.playlistdesc();
			game_.datacenter = datacenter;
			game_.aimassiston = p.aimassiston();
			game_.anonymousmode = p.anonymousmode();
			game_.serverid = p.serverid();

			send_webapi_matchsetup_map(INVALID_SOCKET, game_.map);
			send_webapi_matchsetup_playlist(INVALID_SOCKET, game_.playlistname, game_.playlistdesc);
			send_webapi_matchsetup_datacenter(INVALID_SOCKET, game_.datacenter);
			send_webapi_matchsetup_aimassiston(INVALID_SOCKET, game_.aimassiston);
			send_webapi_matchsetup_anonymousmode(INVALID_SOCKET, game_.anonymousmode);
			send_webapi_matchsetup_serverid(INVALID_SOCKET, game_.serverid);
		}
		else if (_any.Is<api::GameStateChanged>())
		{
			api::GameStateChanged p;
			if (!_any.UnpackTo(&p)) return;
			
			log(LOG_CORE, L"Info: GameStateChanged received.");
			game_.gamestate = p.state();
			send_webapi_gamestatechanged(INVALID_SOCKET, p.state());

			if (p.state() == "Resolution")
			{
				game_.end = get_millis();

				if (game_.matchendreason == "WinnerDetermined")
				{
					// リザルトを保存する
					save_result();
				}
			}
		}
		else if (_any.Is<api::CharacterSelected>())
		{
			api::CharacterSelected p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: CharacterSelected received.");
			if (!p.has_player()) return;
			proc_player(p.player());
		}
		else if (_any.Is<api::MatchStateEnd>())
		{
			api::MatchStateEnd p;
			if (!_any.UnpackTo(&p)) return;
			
			log(LOG_CORE, L"Info: MatchStateEnd received.");
			game_.matchendreason = p.state();
			if (p.state() == "WinnerDetermined")
			{
				if (p.winners_size() > 0)
				{
					for (auto i = 0; i < p.winners_size(); ++i)
					{
						proc_player(p.winners(i));
					}
					uint8_t teamid = p.winners(0).teamid() & 0xff;
					send_webapi_matchstateend_winnerdetermined(INVALID_SOCKET, teamid);
				}
			}
		}
		else if (_any.Is<api::RingStartClosing>())
		{
			api::RingStartClosing p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: RingStartClosing received.");
			auto timestamp = get_millis();
			auto stage = p.stage();
			auto x = p.center().x();
			auto y = p.center().y();
			auto current = p.currentradius();
			auto end = p.endradius();
			auto duration = p.shrinkduration();
			game_.rings.push_back({
				timestamp,
				stage,
				x,
				y,
				current,
				end,
				duration
			});
			send_webapi_ringinfo(INVALID_SOCKET, timestamp, stage, x, y, current, end, duration);
		}
		else if (_any.Is<api::RingFinishedClosing>())
		{
			api::RingFinishedClosing p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: RingFinishedClosing received.");
			auto timestamp = get_millis();
			auto stage = p.stage();
			auto x = p.center().x();
			auto y = p.center().y();
			auto current = p.currentradius();
			auto duration = p.shrinkduration();
			game_.rings.push_back({
				timestamp,
				stage,
				x,
				y,
				current,
				current,
				duration
			});
			send_webapi_ringinfo(INVALID_SOCKET, timestamp, stage, x, y, current, current, duration);
		}
		else if (_any.Is<api::PlayerConnected>())
		{
			api::PlayerConnected p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: PlayerConnected received.");
			if (p.has_player())
			{
				if (game_.start == 0)
				{
					// クリア
					clear_livedata();

					// ダンプファイルリセット
					filedump_.reset();

					game_.start = get_millis();
					send_webapi_clear_livedata(); // 試合開始
				}
				else
				{
					if (game_.end > 0)
					{
						// クリア
						clear_livedata();

						// ダンプファイルリセット
						filedump_.reset();

						game_.start = get_millis();
						send_webapi_clear_livedata(); // 試合開始
					}
				}

				proc_player(p.player());
				uint8_t teamid = p.player().teamid();
				uint8_t squadindex = get_squadindex(p.player());

				proc_connected(teamid, squadindex);
			}
		}
		else if (_any.Is<api::PlayerDisconnected>())
		{
			api::PlayerDisconnected p;
			if (!_any.UnpackTo(&p)) return;
			
			log(LOG_CORE, L"Info: PlayerDisconnected received.");
			if (p.has_player())
			{
				proc_player(p.player());
				uint8_t teamid = p.player().teamid();
				uint8_t squadindex = get_squadindex(p.player());

				proc_disconnected(teamid, squadindex, p.canreconnect(), p.isalive());
			}
		}
		else if (_any.Is<api::PlayerStatChanged>())
		{
			api::PlayerStatChanged p;
			if (!_any.UnpackTo(&p)) return;
			log(LOG_CORE, L"Info: PlayerStatChanged received.");
			if (p.has_player())
			{
				proc_player(p.player());

				uint8_t teamid = p.player().teamid();
				uint8_t squadindex = get_squadindex(p.player());

				proc_player_stats(teamid, squadindex, p.statname(), p.newvalue());
			}
		}
		else if (_any.Is<api::PlayerDamaged>())
		{
			api::PlayerDamaged p;
			if (!_any.UnpackTo(&p)) return;
			
			log(LOG_CORE, L"Info: PlayerDamaged received.");
			if (p.has_attacker())
			{
				proc_player(p.attacker());
				uint8_t teamid = p.attacker().teamid();
				uint8_t squadindex = get_squadindex(p.attacker());
				if (teamid >= 2)
				{
					proc_damage_dealt(teamid, squadindex, p.damageinflicted());
				}
			}
			if (p.has_victim())
			{
				proc_player(p.victim());
				uint8_t teamid = p.victim().teamid();
				uint8_t squadindex = get_squadindex(p.victim());
				if (teamid >= 2)
				{
					proc_damage_taken(teamid, squadindex, p.damageinflicted());
				}
			}
		}
		else if (_any.Is<api::PlayerKilled>())
		{
			api::PlayerKilled p;
			if (!_any.UnpackTo(&p)) return;
			
			log(LOG_CORE, L"Info: PlayerKilled received.");
			if (p.has_attacker())
			{
				proc_player(p.attacker());
			}
			if (p.has_victim())
			{
				proc_player(p.victim());

				uint8_t teamid = p.victim().teamid();
				uint8_t squadindex = get_squadindex(p.victim());
				if (teamid >= 2)
				{
					proc_killed(teamid, squadindex);
					auto killed = game_.teams.at(teamid).players.at(squadindex).killed;
					send_webapi_player_killed_count(INVALID_SOCKET, teamid, squadindex, killed);
				}
			}
			if (p.has_attacker() && p.has_victim())
			{
				uint8_t victim_teamid = p.victim().teamid();
				uint8_t victim_squadindex = get_squadindex(p.victim());
				uint8_t attacker_teamid = p.attacker().teamid();
				uint8_t attacker_squadindex = get_squadindex(p.attacker());
				if (victim_teamid >= 2)
				{
					send_webapi_player_killed(INVALID_SOCKET, victim_teamid, victim_squadindex, attacker_teamid, attacker_squadindex);
				}
			}
			if (p.has_awardedto())
			{
				proc_player(p.awardedto());
			}
		}
		else if (_any.Is<api::PlayerDowned>())
		{
			api::PlayerDowned p;
			if (!_any.UnpackTo(&p)) return;
			
			log(LOG_CORE, L"Info: PlayerDowned received.");
			if (p.has_attacker())
			{
				proc_player(p.attacker());
			}

			if (p.has_victim())
			{
				proc_player(p.victim());

				uint8_t teamid = p.victim().teamid();
				uint8_t squadindex = get_squadindex(p.victim());
				if (teamid >= 2)
				{
					proc_down(teamid, squadindex);
				}
			}
		}
		else if (_any.Is<api::PlayerAssist>())
		{
			api::PlayerAssist p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: PlayerAssist received.");
			if (p.has_assistant())
			{
				proc_player(p.assistant());
			}
			
			if (p.has_victim())
			{
				proc_player(p.victim());
			}
		}
		else if (_any.Is<api::SquadEliminated>())
		{
			api::SquadEliminated p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: SquadEliminated received.");
			if (p.players_size() == 0) return;

			uint8_t teamid = 0;
			for (auto i = 0; i < p.players_size(); ++i)
			{
				proc_player(p.players(i));
				teamid = p.players(i).teamid();
			}

			if (teamid >= 2)
			{
				proc_squad_eliminated(teamid);
			}
		}
		else if (_any.Is<api::GibraltarShieldAbsorbed>())
		{
			api::GibraltarShieldAbsorbed p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: GibraltarShieldAbsorbed received.");
			if (p.has_attacker())
			{
				proc_player(p.attacker());
			}

			if (p.has_victim())
			{
				proc_player(p.victim());
			}
		}
		else if (_any.Is<api::PlayerRespawnTeam>())
		{
			api::PlayerRespawnTeam p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: PlayerRespawnTeam received.");
			if (!p.has_player()) return;
			proc_player(p.player());

			uint8_t teamid = p.player().teamid();
			for (uint8_t squadindex = 0; squadindex < game_.teams.at(teamid).players.size(); ++squadindex)
			{
				auto& target = game_.teams.at(teamid).players.at(squadindex);
				if (target.state == WEBAPI_PLAYER_STATE_COLLECTED)
				{
					proc_respawn(teamid, squadindex);
				}
			}
		}
		else if (_any.Is<api::PlayerRevive>())
		{
			api::PlayerRevive p;
			if (!_any.UnpackTo(&p)) return;
			
			log(LOG_CORE, L"Info: PlayerRevive received.");
			if (p.has_player())
			{
				proc_player(p.player());
			}

			if (p.has_revived())
			{
				proc_player(p.revived());

				uint8_t teamid = p.revived().teamid();
				uint8_t squadindex = get_squadindex(p.revived());
				proc_revive(teamid, squadindex);
			}
		}
		else if (_any.Is<api::ArenasItemSelected>())
		{

		}
		else if (_any.Is<api::ArenasItemDeselected>())
		{

		}
		else if (_any.Is<api::InventoryPickUp>())
		{
			api::InventoryPickUp p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: InventoryPickUp received.");
			if (!p.has_player()) return;
			proc_player(p.player());

			uint8_t item = string_to_itemid(p.item());
			if (item == 0) return;

			uint8_t teamid = p.player().teamid();
			uint8_t squadindex = get_squadindex(p.player());
			proc_item(teamid, squadindex, item, p.quantity());
		}
		else if (_any.Is<api::InventoryDrop>())
		{
			api::InventoryDrop p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: InventoryDrop received.");
			if (!p.has_player()) return;
			proc_player(p.player());

			uint8_t item = string_to_itemid(p.item());
			if (item == 0) return;
			
			uint8_t teamid = p.player().teamid();
			uint8_t squadindex = get_squadindex(p.player());
			proc_item(teamid, squadindex, item, -p.quantity());
		}
		else if (_any.Is<api::InventoryUse>())
		{
			api::InventoryUse p;
			if (!_any.UnpackTo(&p)) return;
			
			log(LOG_CORE, L"Info: InventoryUse received.");
			if (!p.has_player()) return;
			proc_player(p.player());

			uint8_t item = string_to_itemid(p.item());
			if (item == 0) return;
			
			uint8_t teamid = p.player().teamid();
			uint8_t squadindex = get_squadindex(p.player());
			proc_item(teamid, squadindex, item, -p.quantity());
		}
		else if (_any.Is<api::BannerCollected>())
		{
			api::BannerCollected p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: BannerCollected received.");
			if (!p.has_player()) return;
			proc_player(p.player());

			if (!p.has_collected()) return;
			proc_player(p.collected());

			uint8_t teamid = p.collected().teamid();
			uint8_t squadindex = get_squadindex(p.collected());

			proc_banner_collected(teamid, squadindex);
		}
		else if (_any.Is<api::PlayerAbilityUsed>())
		{
			api::PlayerAbilityUsed p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: PlayerAbilityUsed received.");
			if (!p.has_player()) return;
			proc_player(p.player());
			
			uint8_t teamid = p.player().teamid();
			uint8_t squadindex = get_squadindex(p.player());

			send_webapi_data sdata(WEBAPI_EVENT_PLAYERABILITYUSED);
			if (sdata.append(teamid) && sdata.append(squadindex) && sdata.append(p.linkedentity()))
			{
				sendto_webapi(std::move(sdata.buffer_));
			}
		}
		else if (_any.Is<api::ZiplineUsed>())
		{
			api::ZiplineUsed p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: ZiplineUsed received.");
			if (!p.has_player()) return;
			proc_player(p.player());
		}
		else if (_any.Is<api::GrenadeThrown>())
		{
			api::GrenadeThrown p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: GrenadeThrown received.");
			if (!p.has_player()) return;
			proc_player(p.player());

			uint8_t grenade = string_to_itemid(p.linkedentity());
			if (grenade != 0)
			{
				uint8_t teamid = p.player().teamid();
				uint8_t squadindex = get_squadindex(p.player());
				proc_item(teamid, squadindex, grenade, -1);
			}
		}
		else if (_any.Is<api::BlackMarketAction>())
		{
			api::BlackMarketAction p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: BlackMarketAction received.");
			if (!p.has_player()) return;
			proc_player(p.player());
		}
		else if (_any.Is<api::WraithPortal>())
		{
			api::WraithPortal p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: WraithPortal received.");
			if (!p.has_player()) return;
			proc_player(p.player());
		}
		else if (_any.Is<api::WarpGateUsed>())
		{
			api::WarpGateUsed p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: WarpGateUsed received.");
			if (!p.has_player()) return;
			proc_player(p.player());
		}
		else if (_any.Is<api::AmmoUsed>())
		{
			api::AmmoUsed p;
			if (!_any.UnpackTo(&p)) return;

			log(LOG_CORE, L"Info: AmmoUsed received.");
			if (!p.has_player()) return;
			proc_player(p.player());
		}
		else if (_any.Is<api::WeaponSwitched>())
		{
			api::WeaponSwitched p;
			if (!_any.UnpackTo(&p)) return;
			
			log(LOG_CORE, L"Info: WeaponSwitched received.");
			if (!p.has_player()) return;
			proc_player(p.player());

			// TDM/CTL/GG用処理
			{
				uint8_t teamid = p.player().teamid();
				uint8_t squadindex = get_squadindex(p.player());
				auto& player = game_.teams.at(teamid).players.at(squadindex);
				if (player.state == WEBAPI_PLAYER_STATE_KILLED && player.shield > 0 && player.shield_max > 0)
				{
					proc_respawn(teamid, squadindex);
				}
			}
		}
		else
		{
			log(LOG_CORE, L"Error: unknown Any type.(%s)", s_to_ws(_any.GetTypeName()).c_str());
		}
	}

	//---------------------------------------------------------------------------------
	// PROC MESSAGE
	//---------------------------------------------------------------------------------
	void core_thread::proc_message(UINT _message)
	{
		switch (_message)
		{
		case CORE_MESSAGE_TEAMBANNER_STATE_SHOW:
			log(LOG_CORE, L"Info: CORE_MESSAGE_TEAMBANNER_STATE_SHOW received.");
			send_webapi_teambanner_state(1);
			break;
		case CORE_MESSAGE_TEAMBANNER_STATE_HIDE:
			log(LOG_CORE, L"Info: CORE_MESSAGE_TEAMBANNER_STATE_HIDE received.");
			send_webapi_teambanner_state(0);
			break;
		case CORE_MESSAGE_GET_STATS:
			liveapi_.get_stats();
			webapi_.get_stats();
			break;
		default:
			log(LOG_CORE, L"Info: receive unknown message(=%lu) from main_window", _message);
			break;
		}
	}
	
	//---------------------------------------------------------------------------------
	// SEND WEBAPI
	//---------------------------------------------------------------------------------
	void core_thread::send_webapi_gamestatechanged(SOCKET _sock, const std::string &_state)
	{
		send_webapi_data sdata(WEBAPI_EVENT_GAMESTATECHANGED);
		if (sdata.append(_state))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_matchstateend_winnerdetermined(SOCKET _sock, uint8_t _teamid)
	{
		send_webapi_data sdata(WEBAPI_EVENT_MATCHSTATEEND_WINNERDETERMINED);
		if (sdata.append(_teamid))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_matchsetup_map(SOCKET _sock, const std::string &_map)
	{
		send_webapi_data sdata(WEBAPI_EVENT_MATCHSETUP_MAP);
		if (sdata.append(_map))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_matchsetup_playlist(SOCKET _sock, const std::string& _name, const std::string& _desc)
	{
		send_webapi_data sdata(WEBAPI_EVENT_MATCHSETUP_PLAYLIST);
		if (sdata.append(_name) && sdata.append(_desc))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_matchsetup_datacenter(SOCKET _sock, const std::string& _datacenter)
	{
		send_webapi_data sdata(WEBAPI_EVENT_MATCHSETUP_DATACENTER);
		if (sdata.append(_datacenter))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_matchsetup_aimassiston(SOCKET _sock, bool _aimassiston)
	{
		send_webapi_data sdata(WEBAPI_EVENT_MATCHSETUP_AIMASSISTON);
		if (sdata.append(_aimassiston))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_matchsetup_anonymousmode(SOCKET _sock, bool _anonymousmode)
	{
		send_webapi_data sdata(WEBAPI_EVENT_MATCHSETUP_ANONYMOUSMODE);
		if (sdata.append(_anonymousmode))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_matchsetup_serverid(SOCKET _sock, const std::string& _serverid)
	{
		send_webapi_data sdata(WEBAPI_EVENT_MATCHSETUP_SERVERID);
		if (sdata.append(_serverid))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_observerswitched(SOCKET _sock, uint8_t _observer_teamid, uint8_t _observer_squadindex, uint8_t _teamid, uint8_t _playerid, bool _owned)
	{
		send_webapi_data sdata(WEBAPI_EVENT_OBSERVERSWITCHED);
		if (sdata.append(_observer_teamid) && sdata.append(_observer_squadindex) &&
			sdata.append(_teamid) && sdata.append(_playerid) && sdata.append(_owned))
		{
			// データ送信
			sendto_webapi(std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_init_camera(SOCKET _sock, uint8_t _teamid, uint8_t _playerid)
	{
		send_webapi_data sdata(WEBAPI_EVENT_INIT_CAMERA);
		if (sdata.append(_teamid) && sdata.append(_playerid))
		{
			// データ送信
			sendto_webapi(std::move(sdata.buffer_));
		}
	}
	
	void core_thread::send_webapi_ringinfo(SOCKET _sock, uint64_t _timestamp, uint32_t _stage, float _x, float _y, float _current, float _end, float _duration)
	{
		send_webapi_data sdata(WEBAPI_EVENT_RINGINFO);
		if (sdata.append(_timestamp) && sdata.append(_x) && sdata.append(_y) &&
			sdata.append(_current) && sdata.append(_end) && sdata.append(_duration))
		{
			// データ送信
			sendto_webapi(std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_player_string(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint8_t _type, const std::string& _string)
	{
		send_webapi_data sdata(_type);
		if (sdata.append(_teamid) && sdata.append(_squadindex) && sdata.append(_string))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_player_u32u32(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint8_t _type, uint32_t _v1, uint32_t _v2)
	{
		send_webapi_data sdata(_type);
		if (sdata.append(_teamid) && sdata.append(_squadindex) &&
			sdata.append(_v1) && sdata.append(_v2))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_player_connected(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex)
	{
		send_webapi_data sdata(WEBAPI_EVENT_PLAYERCONNECTED);
		if (sdata.append(_teamid) && sdata.append(_squadindex))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_player_disconnected(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, bool _canreconnect)
	{
		send_webapi_data sdata(WEBAPI_EVENT_PLAYERDISCONNECTED);
		if (sdata.append(_teamid) && sdata.append(_squadindex) && sdata.append(_canreconnect))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_player_killed(SOCKET _sock, uint8_t _victim_teamid, uint8_t _victim_squadindex, uint8_t _attacker_teamid, uint8_t _attacker_squadindex)
	{
		send_webapi_data sdata(WEBAPI_EVENT_PLAYER_KILLED);
		if (sdata.append(_victim_teamid) && sdata.append(_victim_squadindex) && sdata.append(_attacker_teamid) && sdata.append(_attacker_squadindex))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_player_killed_count(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint32_t _killed)
	{
		send_webapi_data sdata(WEBAPI_EVENT_PLAYER_KILLED_COUNT);
		if (sdata.append(_teamid) && sdata.append(_squadindex) && sdata.append(_killed))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_player_pos(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, float _x, float _y, float _angle)
	{
		send_webapi_data sdata(WEBAPI_EVENT_PLAYER_POS);
		if (sdata.append(_teamid) && sdata.append(_squadindex) &&
			sdata.append(_x) && sdata.append(_y) && sdata.append(_angle))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_player_state(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint8_t _state)
	{
		send_webapi_data sdata(WEBAPI_EVENT_PLAYER_STATE);
		if (sdata.append(_teamid) && sdata.append(_squadindex) && sdata.append(_state))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_player_stats(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint32_t _kills, uint32_t _assists, uint32_t _knockdowns, uint32_t _revives, uint32_t _respawns)
	{
		send_webapi_data sdata(WEBAPI_EVENT_PLAYER_STATS);
		if (sdata.append(_teamid) && sdata.append(_squadindex) &&
			sdata.append(_kills) && sdata.append(_assists) && sdata.append(_knockdowns) &&
			sdata.append(_revives) && sdata.append(_respawns))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_player_items(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint8_t _itemid, uint32_t _quantity)
	{
		send_webapi_data sdata(WEBAPI_EVENT_PLAYER_ITEMS);
		if (sdata.append(_teamid) && sdata.append(_squadindex) && sdata.append(_itemid) && sdata.append(_quantity))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_squad_eliminated(SOCKET _sock, uint8_t _teamid, uint32_t _placement)
	{
		send_webapi_data sdata(WEBAPI_EVENT_SQUADELIMINATED);
		if (sdata.append(_teamid) && sdata.append(_placement))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_team_name(SOCKET _sock, uint8_t _teamid, const std::string& _teamname)
	{
		send_webapi_data sdata(WEBAPI_EVENT_TEAM_NAME);
		if (sdata.append(_teamid) && sdata.append(_teamname))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_team_placement(SOCKET _sock, uint8_t _teamid, uint32_t _placement)
	{
		send_webapi_data sdata(WEBAPI_EVENT_TEAM_PLACEMENT);
		if (sdata.append(_teamid) && sdata.append(_placement))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_lobbyplayer(uint8_t _teamid, const std::string& _hash, const std::string& _name, const std::string& _hardware)
	{
		send_webapi_data sdata(WEBAPI_EVENT_LOBBYPLAYER);
		if (sdata.append(_teamid) && sdata.append(_hash) && sdata.append(_name) && sdata.append(_hardware))
		{
			sendto_webapi(std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_clear_livedata()
	{
		send_webapi_data sdata(WEBAPI_EVENT_CLEAR_LIVEDATA);
		sendto_webapi(std::move(sdata.buffer_));
	}

	void core_thread::send_webapi_save_result(const std::string& _tournament_id, uint8_t _gameid, std::unique_ptr<std::string>&& _json)
	{
		send_webapi_data sdata(WEBAPI_EVENT_SAVE_RESULT);
		if (sdata.append(_tournament_id) && sdata.append(_gameid) && sdata.append_json(*_json))
		{
			sendto_webapi(std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_teambanner_state(uint8_t _state)
	{
		send_webapi_data sdata(WEBAPI_EVENT_TEAMBANNER_STATE);
		if (sdata.append(_state))
		{
			sendto_webapi(std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_liveapi_socket_stats(uint64_t _conn_count, uint64_t _recv_count, uint64_t _send_count)
	{
		send_webapi_data sdata(WEBAPI_EVENT_LIVEAPI_SOCKET_STATS);
		if (sdata.append(_conn_count) && sdata.append(_recv_count) && sdata.append(_send_count))
		{
			sendto_webapi(std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_send_custommatch_createlobby(SOCKET _sock, uint32_t _sequence)
	{
		send_webapi_data sdata(WEBAPI_SEND_CUSTOMMATCH_CREATELOBBY);
		if (sdata.append(_sequence))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_set_observer(SOCKET _sock, uint32_t _sequence, const std::string& _hash)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_SET_OBSERVER);
		if (sdata.append(_sequence) && sdata.append(_hash))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_get_observer(SOCKET _sock, uint32_t _sequence, const std::string& _hash)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_GET_OBSERVER);
		if (sdata.append(_sequence) && sdata.append(_hash))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_get_observers(SOCKET _sock, uint32_t _sequence, const std::string& _hash)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_GET_OBSERVERS);
		if (game_.teams.size() < 2)
		{
			if (sdata.append(_sequence))
			{
				sendto_webapi(std::move(sdata.buffer_));
			}
		}
		else
		{
			bool result = true;
			if (!sdata.append(_sequence)) result = false;
			for (const auto& observer : game_.teams.at(1).players)
			{
				if (!sdata.append(observer.id)) result = false;
				if (!sdata.append(observer.name)) result = false;
				if (!sdata.append(observer.id == _hash)) result = false;
			}
			if (result) sendto_webapi(std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_livedata_get_game(SOCKET _sock, uint32_t _sequence)
	{
		send_webapi_data sdata(WEBAPI_LIVEDATA_GET_GAME);
		if (sdata.append(_sequence))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_livedata_get_teams(SOCKET _sock, uint32_t _sequence)
	{
		send_webapi_data sdata(WEBAPI_LIVEDATA_GET_TEAMS);
		if (sdata.append(_sequence))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_livedata_get_team_players(SOCKET _sock, uint32_t _sequence, uint8_t _teamid)
	{
		send_webapi_data sdata(WEBAPI_LIVEDATA_GET_TEAM_PLAYERS);
		if (sdata.append(_sequence) && sdata.append(_teamid))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_get_tournament_ids(SOCKET _sock, uint32_t _sequence, const std::string& _json)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_GET_TOURNAMENT_IDS);
		if (sdata.append(_sequence) && sdata.append_json(_json))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_set_tournament_name(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _name)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_SET_TOURNAMENT_NAME);
		if (sdata.append(_sequence) && sdata.append(_id) && sdata.append(_name))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_rename_tournament_name(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _name, bool _result)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_RENAME_TOURNAMENT_NAME);
		if (sdata.append(_sequence) && sdata.append(_id) && sdata.append(_name) && sdata.append(_result))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_set_tournament_params(SOCKET _sock, uint32_t _sequence, const std::string& _id, bool _result, const std::string& _json)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_SET_TOURNAMENT_PARAMS);
		if (sdata.append(_sequence) && sdata.append(_id) && sdata.append(_result) && sdata.append_json(_json))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_get_tournament_params(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _json)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_GET_TOURNAMENT_PARAMS);
		if (sdata.append(_sequence) && sdata.append(_id) && sdata.append_json(_json))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_set_tournament_result(SOCKET _sock, uint32_t _sequence, const std::string& _id, uint32_t _gameid, bool _result, const std::string& _json)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_SET_TOURNAMENT_RESULT);
		if (sdata.append(_sequence) && sdata.append(_id) && sdata.append(_gameid) && sdata.append(_result) && sdata.append_json(_json))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_get_tournament_result(SOCKET _sock, uint32_t _sequence, const std::string& _id, uint32_t _gameid, const std::string& _json)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_GET_TOURNAMENT_RESULT);
		if (sdata.append(_sequence) && sdata.append(_id) && sdata.append(_gameid) && sdata.append_json(_json))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_get_tournament_results(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _json)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_GET_TOURNAMENT_RESULTS);
		if (sdata.append(_sequence) && sdata.append(_id) && sdata.append_json(_json))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_get_current_tournament(SOCKET _sock, uint32_t _sequence, const std::string& _id, const std::string& _name, uint32_t _gameid)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_GET_CURRENT_TOURNAMENT);
		if (sdata.append(_sequence) && sdata.append(_id) && sdata.append(_name) && sdata.append(_gameid))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_set_team_params(SOCKET _sock, uint32_t _sequence, const std::string& _id, uint8_t _team_id, bool _result, const std::string& _json)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_SET_TEAM_PARAMS);
		if (sdata.append(_sequence) && sdata.append(_id) && sdata.append(_team_id) && sdata.append(_result) && sdata.append_json(_json))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_get_team_params(SOCKET _sock, uint32_t _sequence, const std::string& _id, uint8_t _team_id, const std::string& _json)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_GET_TEAM_PARAMS);
		if (sdata.append(_sequence) && sdata.append(_id) && sdata.append(_team_id) && sdata.append_json(_json))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_set_player_params(SOCKET _sock, uint32_t _sequence, const std::string& _hash, bool _result, const std::string& _json)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_SET_PLAYER_PARAMS);
		if (sdata.append(_sequence) && sdata.append(_hash) && sdata.append(_result) && sdata.append_json(_json))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_get_player_params(SOCKET _sock, uint32_t _sequence, const std::string& _hash, const std::string& _json)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_GET_PLAYER_PARAMS);
		if (sdata.append(_sequence) && sdata.append(_hash) && sdata.append_json(_json))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_get_players(SOCKET _sock, uint32_t _sequence, const std::string& _json)
	{
		send_webapi_data sdata(WEBAPI_LOCALDATA_GET_PLAYERS);
		if (sdata.append(_sequence) && sdata.append_json(_json))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_send_custommatch_sendchat(SOCKET _sock, uint32_t _sequence)
	{
		send_webapi_data sdata(WEBAPI_SEND_CUSTOMMATCH_SENDCHAT);
		if (sdata.append(_sequence))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_send_custommatch_setsettings(SOCKET _sock, uint32_t _sequence)
	{
		send_webapi_data sdata(WEBAPI_SEND_CUSTOMMATCH_SETSETTINGS);
		if (sdata.append(_sequence))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_send_custommatch_getlobbyplayers(SOCKET _sock, uint32_t _sequence)
	{
		send_webapi_data sdata(WEBAPI_SEND_CUSTOMMATCH_GETLOBBYPLAYERS);
		if (sdata.append(_sequence))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_send_changecamera(SOCKET _sock, uint32_t _sequence)
	{
		send_webapi_data sdata(WEBAPI_SEND_CHANGECAMERA);
		if (sdata.append(_sequence))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_send_custommatch_setteamname(SOCKET _sock, uint32_t _sequence)
	{
		send_webapi_data sdata(WEBAPI_SEND_CUSTOMMATCH_SETTEAMNAME);
		if (sdata.append(_sequence))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::reply_webapi_send_pausetoggle(SOCKET _sock, uint32_t _sequence)
	{
		send_webapi_data sdata(WEBAPI_SEND_PAUSETOGGLE);
		if (sdata.append(_sequence))
		{
			sendto_webapi(_sock, std::move(sdata.buffer_));
		}
	}

	void core_thread::send_webapi_player_id(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, const std::string& _id)
	{
		send_webapi_player_string(_sock, _teamid, _squadindex, WEBAPI_EVENT_PLAYER_ID, _id);
	}

	void core_thread::send_webapi_player_name(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, const std::string& _name)
	{
		send_webapi_player_string(_sock, _teamid, _squadindex, WEBAPI_EVENT_PLAYER_NAME, _name);
	}

	void core_thread::send_webapi_player_character(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, const std::string& _character)
	{
		send_webapi_player_string(_sock, _teamid, _squadindex, WEBAPI_EVENT_PLAYER_CHARACTER, _character);
	}

	void core_thread::send_webapi_player_hp(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint32_t _current, uint32_t _max)
	{
		send_webapi_player_u32u32(_sock, _teamid, _squadindex, WEBAPI_EVENT_PLAYER_HP, _current, _max);
	}

	void core_thread::send_webapi_player_shield(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint32_t _current, uint32_t _max)
	{
		send_webapi_player_u32u32(_sock, _teamid, _squadindex, WEBAPI_EVENT_PLAYER_SHIELD, _current, _max);
	}

	void core_thread::send_webapi_player_damage(SOCKET _sock, uint8_t _teamid, uint8_t _squadindex, uint32_t _dealt, uint32_t _taken)
	{
		send_webapi_player_u32u32(_sock, _teamid, _squadindex, WEBAPI_EVENT_PLAYER_DAMAGE, _dealt, _taken);
	}

	void core_thread::broadcast_object(uint32_t _sequence, const std::string& _json)
	{
		send_webapi_data sdata(WEBAPI_BROADCAST_OBJECT);
		if (sdata.append(_sequence) && sdata.append_json(_json))
		{
			sendto_webapi(INVALID_SOCKET, std::move(sdata.buffer_));
		}
	}

	//---------------------------------------------------------------------------------
	// GETTER
	//---------------------------------------------------------------------------------
	uint8_t core_thread::get_squadindex(const rtech::liveapi::Player& _player)
	{
		auto teamid = _player.teamid();
		const auto& team = game_.teams.at(teamid);
		for (size_t i = 0; i < team.players.size(); ++i)
		{
			const auto& player = team.players.at(i);
			if (player.id != "" && player.id == _player.nucleushash())
			{
				return (i & 0xff);
			}
		}
		return 0xff;
	}

	//---------------------------------------------------------------------------------
	// PROC DETAIL
	//---------------------------------------------------------------------------------
	void core_thread::proc_player(const rtech::liveapi::Player& _player)
	{
		// チーム数修正
		uint8_t teamid = _player.teamid();
		if (game_.teams.size() <= teamid) game_.teams.resize(teamid + 1);
		auto& team = game_.teams.at(teamid);
		
		// プレイヤー数修正
		uint8_t squadindex = get_squadindex(_player);
		if (squadindex == 0xff)
		{
			// indexが取得できなかった場合は追加する
			team.players.push_back({});
			squadindex = team.players.size() - 1;
		}
		auto& player = team.players.at(squadindex);

		if (teamid == 0)
		{
			// 未アサイン、Worldなど
		}
		else if (teamid >= 1)
		{
			// オブザーバー以上

			// ID
			if (_player.nucleushash() != player.id)
			{
				if (player.id == "")
				{
					// 空だった場合
					player.id = _player.nucleushash();
					send_webapi_player_id(INVALID_SOCKET, teamid, squadindex, player.id);
				}
			}

			// 名前
			if (_player.name() != player.name)
			{
				player.name = _player.name();
				send_webapi_player_name(INVALID_SOCKET, teamid, squadindex, player.name);
			}
		}
		
		if (teamid >= 2)
		{
			// プレイヤー

			// 初回かどうか
			bool first = false;

			// 名前
			if (_player.name() != player.name)
			{
				player.name = _player.name();
				send_webapi_player_name(INVALID_SOCKET, teamid, squadindex, player.name);
			}

			// キャラクター
			if (_player.character() != player.character)
			{
				player.character = _player.character();
				send_webapi_player_character(INVALID_SOCKET, teamid, squadindex, player.character);
			}

			// HP/HPMAX
			if (_player.currenthealth() != player.hp ||
				_player.maxhealth() != player.hp_max)
			{
				if (player.hp == 0 && player.hp_max == 0) first = true;
				player.hp = _player.currenthealth();
				player.hp_max = _player.maxhealth();
				send_webapi_player_hp(INVALID_SOCKET, teamid, squadindex, player.hp, player.hp_max);
			}

			// SHIELD/SHIELDMAX
			if (_player.shieldhealth() != player.shield ||
				_player.shieldmaxhealth() != player.shield_max)
			{
				player.shield = _player.shieldhealth();
				player.shield_max = _player.shieldmaxhealth();
				send_webapi_player_shield(INVALID_SOCKET, teamid, squadindex, player.shield, player.shield_max);
			}

			// POS/ANGLE
			{
				float x = 0.0f;
				float y = 0.0f;
				float angle = 0.0f;
				if (_player.has_pos())
				{
					x = _player.pos().x();
					y = _player.pos().y();
				}
				if (_player.has_angles())
				{
					angle = _player.angles().y();
				}
				if (x != player.x || y != player.y || angle != player.angle)
				{
					player.x = x;
					player.y = y;
					player.angle = angle;
					send_webapi_player_pos(INVALID_SOCKET, teamid, squadindex, x, y, angle);
				}
			}

			// 初回は現在のitem数を全部送る
			if (first)
			{
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_SYRINGE, player.items.syringe);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_MEDKIT, player.items.medkit);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_SHIELDCELL, player.items.shield_cell);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_SHIELDBATTERY, player.items.shield_battery);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_PHOENIXKIT, player.items.phoenixkit);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_ULTIMATEACCELERANT, player.items.ultimateaccelerant);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_THERMITEGRENADE, player.items.thermitegrenade);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_FRAGGRENADE, player.items.fraggrenade);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_ARCSTAR, player.items.arcstar);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_BODYSHIELD, player.items.bodyshield);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_BACKPACK, player.items.backpack);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_KNOCKDOWNSHIELD, player.items.knockdownshield);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_MOBILERESPAWNBEACON, player.items.mobilerespawnbeacon);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_HEATSHIELD, player.items.heatshield);
				send_webapi_player_items(INVALID_SOCKET, teamid, squadindex, WEBAPI_ITEM_EVACTOWER, player.items.evactower);
			}

			// チーム名
			{
				if (team.name != _player.teamname())
				{
					team.name = _player.teamname();
					send_webapi_team_name(INVALID_SOCKET, teamid, team.name);
				}
			}
		}
	}

	void core_thread::proc_connected(uint8_t _teamid, uint8_t _squadindex)
	{
		auto& player = game_.teams.at(_teamid).players.at(_squadindex);
		if (player.disconnected)
		{
			player.disconnected = false;
			player.canreconnect = false;

			send_webapi_player_connected(INVALID_SOCKET, _teamid, _squadindex);
		}

		// 接続によりチーム数がaliveに変更がないか確認する
		uint32_t alive = 0;
		for (size_t i = 2; i < game_.teams.size(); ++i)
		{
			const auto& t = game_.teams.at(i);
			if (t.players.size() > 0 && !t.eliminated) ++alive;
		}

		// 全部いなくなった場合は何もしない
		if (alive == 0) return;

		for (size_t i = 2; i < game_.teams.size(); ++i)
		{
			auto& t = game_.teams.at(i);
			if (t.players.size() > 0 && (!t.eliminated))
			{
				if (t.place != alive)
				{
					t.place = alive;
					send_webapi_team_placement(INVALID_SOCKET, i, alive);
				}
			}
		}
	}

	void core_thread::proc_disconnected(uint8_t _teamid, uint8_t _squadindex, bool _canreconnect, bool _alive)
	{
		auto& player = game_.teams.at(_teamid).players.at(_squadindex);
		if (!player.disconnected)
		{
			player.disconnected = true;
			player.canreconnect = _canreconnect;

			send_webapi_player_disconnected(INVALID_SOCKET, _teamid, _squadindex, _canreconnect);
		}
	}


	void core_thread::proc_damage_dealt(uint8_t _teamid, uint8_t _squadindex, uint32_t _damage)
	{
		auto& player = game_.teams.at(_teamid).players.at(_squadindex);
		if (_damage != 0)
		{
			player.damage_dealt += _damage;
			send_webapi_player_damage(INVALID_SOCKET, _teamid, _squadindex, player.damage_dealt, player.damage_taken);
		}
	}

	void core_thread::proc_damage_taken(uint8_t _teamid, uint8_t _squadindex, uint32_t _damage)
	{
		auto& player = game_.teams.at(_teamid).players.at(_squadindex);
		if (_damage != 0)
		{
			player.damage_taken += _damage;
			send_webapi_player_damage(INVALID_SOCKET, _teamid, _squadindex, player.damage_dealt, player.damage_taken);
		}
	}
	
	void core_thread::proc_player_stats(uint8_t _teamid, uint8_t _squadindex, const std::string& _stat, uint32_t _v)
	{
		auto& player = game_.teams.at(_teamid).players.at(_squadindex);
		bool send = false;
		if (_stat == "assists")
		{
			if (_v != player.assists)
			{
				player.assists = _v;
				send = true;
			}
		}
		else if (_stat == "kills")
		{
			if (_v != player.kills)
			{
				player.kills = _v;
				send = true;
			}
		}
		else if (_stat == "knockdowns")
		{
			if (_v != player.knockdowns)
			{
				player.knockdowns = _v;
				send = true;
			}
		}
		else if (_stat == "respawnsGiven")
		{
			if (_v != player.respawns)
			{
				player.respawns = _v;
				send = true;
			}
		}
		else if (_stat == "revivesGiven")
		{
			if (_v != player.revives)
			{
				player.revives = _v;
				send = true;
			}
		}
		if (send)
		{
			send_webapi_player_stats(INVALID_SOCKET, _teamid, _squadindex, player.kills, player.assists, player.knockdowns, player.revives, player.respawns);
		}
	}

	inline uint32_t update_quantity(uint32_t& _store, int _quantity)
	{
		if (_quantity > 0)
		{
			_store = _store + _quantity;
		}
		else if (_quantity < 0)
		{
			if (std::abs(_quantity) >= _store)
			{
				_store = 0;
			}
			else
			{
				_store = _store - std::abs(_quantity);
			}
		}
		return _store;
	}

	void core_thread::proc_item(uint8_t _teamid, uint8_t _squadindex, uint8_t _item, int _quantity)
	{
		auto& player = game_.teams.at(_teamid).players.at(_squadindex);
		switch (_item)
		{
		case WEBAPI_ITEM_BODYSHIELD_LV1:
		case WEBAPI_ITEM_BODYSHIELD_LV2:
		case WEBAPI_ITEM_BODYSHIELD_LV3:
		case WEBAPI_ITEM_BODYSHIELD_LV4:
		case WEBAPI_ITEM_BODYSHIELD_LV5:
			if (_quantity == -1)
			{
				player.items.bodyshield = 0;
				send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_BODYSHIELD, player.items.bodyshield);
			}
			else
			{
				player.items.bodyshield = _item - WEBAPI_ITEM_BODYSHIELD;
				send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_BODYSHIELD, player.items.bodyshield);
			}
			break;

		case WEBAPI_ITEM_BACKPACK_LV1:
		case WEBAPI_ITEM_BACKPACK_LV2:
		case WEBAPI_ITEM_BACKPACK_LV3:
		case WEBAPI_ITEM_BACKPACK_LV4:
			if (_quantity == -1)
			{
				player.items.backpack = 0;
				send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_BACKPACK, player.items.backpack);
			}
			else
			{
				player.items.backpack = _item - WEBAPI_ITEM_BACKPACK;
				send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_BACKPACK, player.items.backpack);
			}
			break;

		case WEBAPI_ITEM_KNOCKDOWNSHIELD_LV1:
		case WEBAPI_ITEM_KNOCKDOWNSHIELD_LV2:
		case WEBAPI_ITEM_KNOCKDOWNSHIELD_LV3:
		case WEBAPI_ITEM_KNOCKDOWNSHIELD_LV4:
			if (_quantity == -1)
			{
				player.items.knockdownshield = 0;
				send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_KNOCKDOWNSHIELD, player.items.knockdownshield);
			}
			else
			{
				player.items.knockdownshield = _item - WEBAPI_ITEM_KNOCKDOWNSHIELD;
				send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_KNOCKDOWNSHIELD, player.items.knockdownshield);
			}
			break;

		default:
		{
			uint32_t q = 0;
			if (_item == WEBAPI_ITEM_SYRINGE) q = update_quantity(player.items.syringe, _quantity);
			else if (_item == WEBAPI_ITEM_MEDKIT) q = update_quantity(player.items.medkit, _quantity);
			else if (_item == WEBAPI_ITEM_SHIELDCELL) q = update_quantity(player.items.shield_cell, _quantity);
			else if (_item == WEBAPI_ITEM_SHIELDBATTERY) q = update_quantity(player.items.shield_battery, _quantity);
			else if (_item == WEBAPI_ITEM_PHOENIXKIT) q = update_quantity(player.items.phoenixkit, _quantity);
			else if (_item == WEBAPI_ITEM_ULTIMATEACCELERANT) q = update_quantity(player.items.ultimateaccelerant, _quantity);
			else if (_item == WEBAPI_ITEM_THERMITEGRENADE) q = update_quantity(player.items.thermitegrenade, _quantity);
			else if (_item == WEBAPI_ITEM_FRAGGRENADE) q = update_quantity(player.items.fraggrenade, _quantity);
			else if (_item == WEBAPI_ITEM_ARCSTAR) q = update_quantity(player.items.arcstar, _quantity);
			else if (_item == WEBAPI_ITEM_MOBILERESPAWNBEACON) q = update_quantity(player.items.mobilerespawnbeacon, _quantity);
			else if (_item == WEBAPI_ITEM_HEATSHIELD) q = update_quantity(player.items.heatshield, _quantity);
			else if (_item == WEBAPI_ITEM_EVACTOWER) q = update_quantity(player.items.evactower, _quantity);
			send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, _item, q);
		}
			break;
		}
	}

	void core_thread::proc_respawn(uint8_t _teamid, uint8_t _squadindex)
	{
		auto& player = game_.teams.at(_teamid).players.at(_squadindex);
		if (player.state != WEBAPI_PLAYER_STATE_ALIVE)
		{
			player.state = WEBAPI_PLAYER_STATE_ALIVE;
			send_webapi_player_state(INVALID_SOCKET, _teamid, _squadindex, player.state);
		}

		// アイテムの初期化
		{
			livedata::items items;

			if (player.items.syringe != items.syringe) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_SYRINGE, items.syringe);
			if (player.items.medkit != items.medkit) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_MEDKIT, items.medkit);
			if (player.items.shield_cell != items.shield_cell) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_SHIELDCELL, items.shield_cell);
			if (player.items.shield_battery != items.shield_battery) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_SHIELDBATTERY, items.shield_battery);
			if (player.items.phoenixkit != items.phoenixkit) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_PHOENIXKIT, items.phoenixkit);
			if (player.items.ultimateaccelerant != items.ultimateaccelerant) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_ULTIMATEACCELERANT, items.ultimateaccelerant);
			if (player.items.thermitegrenade != items.thermitegrenade) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_THERMITEGRENADE, items.thermitegrenade);
			if (player.items.fraggrenade != items.fraggrenade) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_FRAGGRENADE, items.fraggrenade);
			if (player.items.arcstar != items.arcstar) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_ARCSTAR, items.arcstar);
			if (player.items.bodyshield != items.bodyshield) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_BODYSHIELD, items.bodyshield);
			if (player.items.backpack != items.backpack) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_BACKPACK, items.backpack);
			if (player.items.knockdownshield != items.knockdownshield) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_KNOCKDOWNSHIELD, items.knockdownshield);
			if (player.items.mobilerespawnbeacon != items.mobilerespawnbeacon) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_MOBILERESPAWNBEACON, items.mobilerespawnbeacon);
			if (player.items.heatshield != items.heatshield) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_HEATSHIELD, items.heatshield);
			if (player.items.evactower != items.evactower) send_webapi_player_items(INVALID_SOCKET, _teamid, _squadindex, WEBAPI_ITEM_EVACTOWER, items.evactower);

			player.items = items;
		}
	}

	void core_thread::proc_revive(uint8_t _teamid, uint8_t _squadindex)
	{
		auto& player = game_.teams.at(_teamid).players.at(_squadindex);
		if (player.state != WEBAPI_PLAYER_STATE_ALIVE)
		{
			player.state = WEBAPI_PLAYER_STATE_ALIVE;
			send_webapi_player_state(INVALID_SOCKET, _teamid, _squadindex, player.state);
		}
	}

	void core_thread::proc_down(uint8_t _teamid, uint8_t _squadindex)
	{
		auto& player = game_.teams.at(_teamid).players.at(_squadindex);
		if (player.state != WEBAPI_PLAYER_STATE_DOWN)
		{
			player.state = WEBAPI_PLAYER_STATE_DOWN;
			send_webapi_player_state(INVALID_SOCKET, _teamid, _squadindex, player.state);
		}
	}

	void core_thread::proc_killed(uint8_t _teamid, uint8_t _squadindex)
	{
		auto& player = game_.teams.at(_teamid).players.at(_squadindex);
		player.killed++;
		if (player.state != WEBAPI_PLAYER_STATE_KILLED)
		{
			player.state = WEBAPI_PLAYER_STATE_KILLED;
			send_webapi_player_state(INVALID_SOCKET, _teamid, _squadindex, player.state);
		}
	}

	void core_thread::proc_banner_collected(uint8_t _teamid, uint8_t _squadindex)
	{
		auto& player = game_.teams.at(_teamid).players.at(_squadindex);
		if (player.state != WEBAPI_PLAYER_STATE_COLLECTED)
		{
			player.state = WEBAPI_PLAYER_STATE_COLLECTED;
			send_webapi_player_state(INVALID_SOCKET, _teamid, _squadindex, player.state);
		}
	}

	void core_thread::proc_squad_eliminated(uint8_t _teamid)
	{
		// 生存チーム数の確認
		uint32_t alive = 0;
		for (size_t i = 2; i < game_.teams.size(); ++i)
		{
			const auto& t = game_.teams.at(i);
			if (t.players.size() > 0 && !t.eliminated) ++alive;
		}

		for (size_t i = 2; i < game_.teams.size(); ++i)
		{
			auto& t = game_.teams.at(i);
			if (t.players.size() > 0 &&(!t.eliminated))
			{
				if (i == _teamid)
				{
					t.place = alive;
					t.eliminated = true;
				}
				else
				{
					// 生存チームの順位を一つ上げる
					if (alive > 1)
					{
						t.place = alive - 1;
						send_webapi_team_placement(INVALID_SOCKET, i, t.place);
					}
				}
			}
		}
		send_webapi_squad_eliminated(INVALID_SOCKET, _teamid, alive);
	}

	//---------------------------------------------------------------------------------
	// LIVEDATA
	//---------------------------------------------------------------------------------
	void core_thread::livedata_get_game(SOCKET _sock, uint32_t _sequence)
	{
		send_webapi_gamestatechanged(_sock, game_.gamestate);
		send_webapi_matchsetup_map(_sock, game_.map);
		send_webapi_matchsetup_playlist(_sock, game_.playlistname, game_.playlistdesc);
		send_webapi_matchsetup_datacenter(_sock, game_.datacenter);
		send_webapi_matchsetup_aimassiston(_sock, game_.aimassiston);
		send_webapi_matchsetup_anonymousmode(_sock, game_.anonymousmode);
		send_webapi_matchsetup_serverid(_sock, game_.serverid);
		send_webapi_init_camera(_sock, game_.camera_teamid, game_.camera_squadindex);

		reply_livedata_get_game(_sock, _sequence);
	}

	void core_thread::livedata_get_teams(SOCKET _sock, uint32_t _sequence)
	{
		// observerも送る
		for (size_t i = 1; i < game_.teams.size(); ++i)
		{
			const auto& t = game_.teams.at(i);
			if (t.name != "") send_webapi_team_name(_sock, i, t.name);
			if (t.place != 0) send_webapi_team_placement(_sock, i, t.place);
			if (t.eliminated) send_webapi_squad_eliminated(_sock, i, t.place);
			for (size_t j = 0; j < t.players.size(); ++j)
			{
				const auto& p = t.players.at(j);
				// IDだけ先に送る
				if (p.id != "")
				{
					send_webapi_player_id(_sock, i, j, p.id);
				}
			}
		}

		reply_livedata_get_teams(_sock, _sequence);
	}

	void core_thread::livedata_get_team_players(SOCKET _sock, uint32_t _sequence, uint8_t _teamid)
	{
		if (_teamid >= game_.teams.size()) return;
		const auto& t = game_.teams.at(_teamid);
		for (size_t i = 0; i < t.players.size(); ++i)
		{
			const auto& p = t.players.at(i);
			// ID以外を送る
			if (p.disconnected) send_webapi_player_disconnected(_sock, _teamid, i, p.canreconnect);
			send_webapi_player_name(_sock, _teamid, i, p.name);
			send_webapi_player_character(_sock, _teamid, i, p.character);
			send_webapi_player_hp(_sock, _teamid, i, p.hp, p.hp_max);
			send_webapi_player_shield(_sock, _teamid, i, p.shield, p.shield_max);
			send_webapi_player_damage(_sock, _teamid, i, p.damage_dealt, p.damage_taken);
			send_webapi_player_pos(_sock, _teamid, i, p.x, p.y, p.angle);
			send_webapi_player_state(_sock, _teamid, i, p.state);
			send_webapi_player_stats(_sock, _teamid, i, p.kills, p.assists, p.knockdowns, p.revives, p.respawns);
			send_webapi_player_killed_count(_sock, _teamid, i, p.killed);

			// アイテム
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_SYRINGE, p.items.syringe);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_MEDKIT, p.items.medkit);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_SHIELDCELL, p.items.shield_cell);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_SHIELDBATTERY, p.items.shield_battery);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_PHOENIXKIT, p.items.phoenixkit);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_ULTIMATEACCELERANT, p.items.ultimateaccelerant);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_THERMITEGRENADE, p.items.thermitegrenade);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_FRAGGRENADE, p.items.fraggrenade);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_ARCSTAR, p.items.arcstar);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_BODYSHIELD, p.items.bodyshield);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_BACKPACK, p.items.backpack);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_KNOCKDOWNSHIELD, p.items.knockdownshield);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_MOBILERESPAWNBEACON, p.items.mobilerespawnbeacon);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_HEATSHIELD, p.items.heatshield);
			send_webapi_player_items(_sock, _teamid, i, WEBAPI_ITEM_EVACTOWER, p.items.evactower);
		}

		reply_livedata_get_team_players(_sock, _sequence, _teamid);
	}

	//---------------------------------------------------------------------------------
	// CLEAR
	//---------------------------------------------------------------------------------
	void core_thread::clear_livedata()
	{
		game_.teams.clear();
		game_.matchendreason = "";
		game_.gamestate = "";
		game_.map = "";
		game_.playlistname = "";
		game_.playlistdesc = "";
		game_.datacenter = "";
		game_.aimassiston = false;
		game_.anonymousmode = false;
		game_.serverid = "";
		game_.start = 0;
		game_.end = 0;
	}


	//---------------------------------------------------------------------------------
	// SAVE
	//---------------------------------------------------------------------------------
	void core_thread::save_result()
	{
		// リザルト用構造体に入れる
		std::unique_ptr<livedata::result> r(new livedata::result());

		r->start = game_.start;
		r->end = game_.end;
		r->serverid = game_.serverid;
		r->map = game_.map;
		r->playlistname = game_.playlistname;
		r->playlistdesc = game_.playlistdesc;
		r->datacenter = game_.datacenter;
		r->aimassiston = game_.aimassiston;
		r->anonymousmode = game_.anonymousmode;
		r->rings = game_.rings;

		for (uint8_t i = 2; i < game_.teams.size(); ++i)
		{
			const auto& team = game_.teams.at(i);
			if (team.players.size() == 0) continue;

			r->teams[i - 2] = {};
			auto& team_result = r->teams[i - 2];
			uint32_t kills = 0;
			for (const auto& player : team.players)
			{
				team_result.players.push_back({
					.kills = player.kills,
					.damage_dealt = player.damage_dealt,
					.damage_taken = player.damage_taken,
					.assists = player.assists,
					.id = player.id,
					.name = player.name,
					.character = player.character
				});
				kills += player.kills;
			}
			team_result.id = i - 2;
			team_result.name = team.name;
			team_result.kills = kills;
			team_result.placement = team.place;
		}

		local_.save_result(std::move(r));
	}

	//---------------------------------------------------------------------------------
	// MESSAGE
	//---------------------------------------------------------------------------------
	std::queue<UINT> core_thread::pull_messages()
	{
		std::queue<UINT> r;
		{
			std::lock_guard<std::mutex> lock(mtx_);
			r.swap(messages_);
		}
		return r;
	}

	void core_thread::push_message(UINT _message)
	{
		{
			std::lock_guard<std::mutex> lock(mtx_);
			messages_.push(_message);
		}
		// 通知
		if (event_message_)
		{
			::SetEvent(event_message_);
		}
	}

	//---------------------------------------------------------------------------------
	// QUEUE CHECK
	//---------------------------------------------------------------------------------
	void core_thread::liveapi_queuecheck()
	{
		// 通知
		if (event_queuecheck_)
		{
			::SetEvent(event_queuecheck_);
		}
	}

	//---------------------------------------------------------------------------------
	// RUN/STOP/PING
	//---------------------------------------------------------------------------------
	bool core_thread::run(HWND _window)
	{
		window_ = _window;

		if (!ctx_.init())
		{
			log(LOG_CORE, L"Error: shared_context::init() failed.");
			return false;
		}

		if (!liveapi_.run(_window))
		{
			log(LOG_CORE, L"Error: Failed to run liveapi thread.");
			return false;
		}

		if (!webapi_.run(_window))
		{
			log(LOG_CORE, L"Error: Failed to run webapi thread.");
			return false;
		}


		if (!local_.run(_window))
		{
			log(LOG_CORE, L"Error: Failed to run local thread.");
			return false;
		}

		if (!filedump_.run())
		{
			log(LOG_CORE, L"Error: Failed to run filedump thread.");
			return false;
		}

		// イベント作成
		event_close_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_close_ == NULL)
		{
			log(LOG_CORE, L"Error: CreateEvent() failed.");
			return false;
		}
		event_message_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_message_ == NULL)
		{
			log(LOG_CORE, L"Error: CreateEvent() failed.");
			return false;
		}
		event_queuecheck_ = ::CreateEventW(NULL, FALSE, FALSE, NULL);
		if (event_queuecheck_ == NULL)
		{
			log(LOG_CORE, L"Error: CreateEvent() failed.");
			return false;
		}

		// スレッド起動
		thread_ = ::CreateThread(NULL, 0, proc_common, this, 0, NULL);
		return thread_ != NULL;
	}

	void core_thread::stop()
	{
		liveapi_.stop();
		webapi_.stop();
		local_.stop();
		filedump_.stop();

		// スレッドの停止
		if (thread_ != NULL)
		{
			::SetEvent(event_close_);
			::WaitForSingleObject(thread_, INFINITE);
			thread_ = NULL;
		}
	}

	void core_thread::ping()
	{
		liveapi_.ping();
		webapi_.ping();
	}
}
