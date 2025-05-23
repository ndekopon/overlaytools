﻿#pragma once

#include "common.hpp"

#include <cstdint>
#include <memory>
#include <vector>
#include <string>

namespace app {

	// データタイプ
	enum : uint8_t {
		WEBAPI_DATA_BOOL = 0x00,
		WEBAPI_DATA_UINT8,
		WEBAPI_DATA_UINT16,
		WEBAPI_DATA_UINT32,
		WEBAPI_DATA_UINT64,
		WEBAPI_DATA_INT8,
		WEBAPI_DATA_INT16,
		WEBAPI_DATA_INT32,
		WEBAPI_DATA_INT64,

		WEBAPI_DATA_FLOAT32 = 0x10,
		WEBAPI_DATA_FLOAT64,

		WEBAPI_DATA_STRING = 0x20,

		WEBAPI_DATA_JSON = 0x30
	};


	// from LiveAPI
	enum : uint8_t {
		WEBAPI_EVENT_OBSERVERSWITCHED = 0x01u,
		WEBAPI_EVENT_MATCHSETUP_MAP,
		WEBAPI_EVENT_MATCHSETUP_PLAYLIST,
		WEBAPI_EVENT_MATCHSETUP_DATACENTER,
		WEBAPI_EVENT_MATCHSETUP_AIMASSISTON,
		WEBAPI_EVENT_MATCHSETUP_ANONYMOUSMODE,
		WEBAPI_EVENT_MATCHSETUP_SERVERID,
		WEBAPI_EVENT_GAMESTATECHANGED,
		WEBAPI_EVENT_MATCHSTATEEND_WINNERDETERMINED,
		WEBAPI_EVENT_INIT_CAMERA,

		WEBAPI_EVENT_PLAYERCONNECTED = 0x10u,
		WEBAPI_EVENT_PLAYERDISCONNECTED,
		WEBAPI_EVENT_PLAYERABILITYUSED,
		WEBAPI_EVENT_SQUADELIMINATED,

		// リザルトのクリア・保存
		WEBAPI_EVENT_CLEAR_LIVEDATA, // 次の試合開始
		WEBAPI_EVENT_SAVE_RESULT, // 試合終了

		WEBAPI_EVENT_RINGINFO, // リング情報

		WEBAPI_EVENT_PLAYERULTIMATECHARGED,

		// team関連
		WEBAPI_EVENT_TEAM_NAME = 0x20u,
		WEBAPI_EVENT_TEAM_PLACEMENT,
		WEBAPI_EVENT_TEAM_RESPAWN,

		// player関連
		WEBAPI_EVENT_PLAYER_ID = 0x30u,
		WEBAPI_EVENT_PLAYER_NAME,
		WEBAPI_EVENT_PLAYER_HP,
		WEBAPI_EVENT_PLAYER_SHIELD,
		WEBAPI_EVENT_PLAYER_POS,
		WEBAPI_EVENT_PLAYER_STATE,
		WEBAPI_EVENT_PLAYER_STATS,
		WEBAPI_EVENT_PLAYER_DAMAGE,
		WEBAPI_EVENT_PLAYER_CHARACTER,
		WEBAPI_EVENT_PLAYER_ITEMS,

		// KILLイベント(主にTDM用)
		WEBAPI_EVENT_PLAYER_KILLED,
		WEBAPI_EVENT_PLAYER_KILLED_COUNT,

		// S20追加
		WEBAPI_EVENT_PLAYER_LEVEL,
		WEBAPI_EVENT_PLAYER_PERK,

		// 武器切替
		WEBAPI_EVENT_PLAYER_WEAPON,

		// 拡張情報
		WEBAPI_EVENT_EXTENDED,

		// ロビープレイヤー関連
		WEBAPI_EVENT_LOBBYPLAYER = 0x40u,
		WEBAPI_EVENT_CUSTOMMATCH_SETTINGS,
		WEBAPI_EVENT_LOBBYENUM_START,
		WEBAPI_EVENT_LOBBYENUM_END,
		WEBAPI_EVENT_LOBBYTEAM,
		WEBAPI_EVENT_LOBBYTOKEN,

		// レジェンドバン
		WEBAPI_EVENT_LEGENDBANENUM_START,
		WEBAPI_EVENT_LEGENDBANENUM_END,
		WEBAPI_EVENT_LEGENDBANSTATUS,
	};

	// from WEBAPI
	enum : uint8_t {
		// LiveAPI送信系
		WEBAPI_SEND_CUSTOMMATCH_SENDCHAT = 0x50u,
		WEBAPI_SEND_CUSTOMMATCH_CREATELOBBY,
		WEBAPI_SEND_CUSTOMMATCH_GETLOBBYPLAYERS,
		WEBAPI_SEND_CUSTOMMATCH_SETSETTINGS,
		WEBAPI_SEND_CHANGECAMERA,
		WEBAPI_SEND_CUSTOMMATCH_SETTEAMNAME,
		WEBAPI_SEND_PAUSETOGGLE,
		WEBAPI_SEND_CUSTOMMATCH_GETSETTINGS,
		WEBAPI_SEND_CUSTOMMATCH_SETSPAWNPOINT,
		WEBAPI_SEND_CUSTOMMATCH_SETENDRINGEXCLUSION,
		WEBAPI_SEND_CUSTOMMATCH_GETLEGENDBANSTATUS,
		WEBAPI_SEND_CUSTOMMATCH_SETLEGENDBAN,

		// 途中取得系
		WEBAPI_LIVEDATA_GET_GAME = 0x60u,
		WEBAPI_LIVEDATA_GET_TEAMS,
		WEBAPI_LIVEDATA_GET_TEAM_PLAYERS,
		WEBAPI_LIVEDATA_GET_OBSERVERS_CAMERA,

		// ローカルパラメータ取得
		WEBAPI_LOCALDATA_SET_OBSERVER = 0x70u,
		WEBAPI_LOCALDATA_GET_OBSERVER,
		WEBAPI_LOCALDATA_GET_OBSERVERS,
		WEBAPI_LOCALDATA_GET_TOURNAMENT_IDS,
		WEBAPI_LOCALDATA_SET_TOURNAMENT_NAME,
		WEBAPI_LOCALDATA_RENAME_TOURNAMENT_NAME,
		WEBAPI_LOCALDATA_SET_TOURNAMENT_PARAMS,
		WEBAPI_LOCALDATA_GET_TOURNAMENT_PARAMS,
		WEBAPI_LOCALDATA_GET_TOURNAMENT_RESULT,
		WEBAPI_LOCALDATA_GET_TOURNAMENT_RESULTS,
		WEBAPI_LOCALDATA_SET_TEAM_PARAMS,
		WEBAPI_LOCALDATA_GET_TEAM_PARAMS,
		WEBAPI_LOCALDATA_SET_PLAYER_PARAMS,
		WEBAPI_LOCALDATA_GET_PLAYER_PARAMS,
		WEBAPI_LOCALDATA_GET_PLAYERS,
		WEBAPI_LOCALDATA_GET_CURRENT_TOURNAMENT,
		WEBAPI_LOCALDATA_SET_TOURNAMENT_RESULT,
		WEBAPI_LOCALDATA_SET_LIVEAPI_CONFIG,
		WEBAPI_LOCALDATA_GET_LIVEAPI_CONFIG,
		WEBAPI_LOCALDATA_SET_CONFIG,
		WEBAPI_LOCALDATA_GET_CONFIG,

		// 画面状態
		WEBAPI_EVENT_TEAMBANNER_STATE = 0xc0,
		WEBAPI_EVENT_MAP_STATE,

		// その他
		WEBAPI_EVENT_LIVEAPI_SOCKET_STATS = 0xd0,
		WEBAPI_HTTP_GET_STATS_FROM_CODE,
		WEBAPI_MANUAL_POSTMATCH,

		// ブロードキャスト
		WEBAPI_BROADCAST_OBJECT = 0xF0,

		// バージョン取得
		WEBAPI_GET_VERSION = 0xFF,
	};

	// プレーヤーのステータス
	enum : uint8_t {
		WEBAPI_PLAYER_STATE_ALIVE = 0x00u,
		WEBAPI_PLAYER_STATE_DOWN,
		WEBAPI_PLAYER_STATE_KILLED,
		WEBAPI_PLAYER_STATE_COLLECTED
	};

	// アイテム
	enum : uint8_t {
		WEBAPI_ITEM_SYRINGE = 0x10,
		WEBAPI_ITEM_MEDKIT,
		WEBAPI_ITEM_SHIELDCELL,
		WEBAPI_ITEM_SHIELDBATTERY,
		WEBAPI_ITEM_PHOENIXKIT,
		WEBAPI_ITEM_ULTIMATEACCELERANT,

		WEBAPI_ITEM_THERMITEGRENADE = 0x30,
		WEBAPI_ITEM_FRAGGRENADE,
		WEBAPI_ITEM_ARCSTAR,

		WEBAPI_ITEM_BODYSHIELD = 0x35, // base
		WEBAPI_ITEM_BODYSHIELD_LV1, // White
		WEBAPI_ITEM_BODYSHIELD_LV2, // Blue
		WEBAPI_ITEM_BODYSHIELD_LV3, // Purple
		WEBAPI_ITEM_BODYSHIELD_LV4, // Gold
		WEBAPI_ITEM_BODYSHIELD_LV5, // Red

		WEBAPI_ITEM_BACKPACK = 0x40, // base
		WEBAPI_ITEM_BACKPACK_LV1, // White
		WEBAPI_ITEM_BACKPACK_LV2, // Blue
		WEBAPI_ITEM_BACKPACK_LV3, // Purple
		WEBAPI_ITEM_BACKPACK_LV4, // Gold

		WEBAPI_ITEM_KNOCKDOWNSHIELD = 0x50, // base
		WEBAPI_ITEM_KNOCKDOWNSHIELD_LV1, // White
		WEBAPI_ITEM_KNOCKDOWNSHIELD_LV2, // Blue
		WEBAPI_ITEM_KNOCKDOWNSHIELD_LV3, // Purple
		WEBAPI_ITEM_KNOCKDOWNSHIELD_LV4, // Gold

		WEBAPI_ITEM_MOBILERESPAWNBEACON = 0x60,
		WEBAPI_ITEM_HEATSHIELD,
		WEBAPI_ITEM_EVACTOWER,

		WEBAPI_ITEM_SHIELDCORE = 0x70,
	};

	// 拡張情報
	enum : uint8_t {
		WEBAPI_EXTENDED_KILL,
		WEBAPI_EXTENDED_KNOCKDOWN,
		WEBAPI_EXTENDED_DAMAGE,
		WEBAPI_EXTENDED_REVIVE,
		WEBAPI_EXTENDED_COLLECTED,
		WEBAPI_EXTENDED_RESPAWN,
		WEBAPI_EXTENDED_CHARACTERSELECTED,
	};

	class received_webapi_data {
	private:
		std::unique_ptr<std::vector<uint8_t>> buffer_;
		std::vector<size_t> offsets_;
	public:
		received_webapi_data();
		~received_webapi_data();

		bool set(std::unique_ptr<std::vector<uint8_t>>&& _data);

		uint8_t event_type();
		uint8_t size();
		bool get_bool(uint8_t _index);
		uint8_t get_uint8(uint8_t _index);
		uint16_t get_uint16(uint8_t _index);
		uint32_t get_uint32(uint8_t _index);
		uint64_t get_uint64(uint8_t _index);
		int8_t get_int8(uint8_t _index);
		int16_t get_int16(uint8_t _index);
		int32_t get_int32(uint8_t _index);
		int64_t get_int64(uint8_t _index);
		float get_float32(uint8_t _index);
		double get_float64(uint8_t _index);
		std::string get_string(uint8_t _index);
		std::string get_json(uint8_t _index);
	};

	class send_webapi_data {
	public:
		std::unique_ptr<std::vector<uint8_t>> buffer_;

		send_webapi_data(uint8_t _type);
		~send_webapi_data();

		bool append(bool _v);
		bool append(uint8_t _v);
		bool append(uint16_t _v);
		bool append(uint32_t _v);
		bool append(uint64_t _v);
		bool append(int8_t _v);
		bool append(int16_t _v);
		bool append(int32_t _v);
		bool append(int64_t _v);
		bool append(float _v);
		bool append(double _v);
		bool append(const std::string& _v);
		bool append_json(const std::string& _v);
	};
}
