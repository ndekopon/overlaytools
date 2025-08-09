#pragma once

#include "common.hpp"

#include <map>
#include <string>
#include <vector>

namespace livedata {

	class user_event {
		uint64_t timestamp;
		uint64_t receive_timestamp;
	};

	struct items {
		uint32_t syringe = 2;
		uint32_t medkit = 0;
		uint32_t shield_cell = 2;
		uint32_t shield_battery = 0;
		uint32_t phoenixkit = 0;
		uint32_t ultimateaccelerant = 0;
		uint32_t thermitegrenade = 0;
		uint32_t fraggrenade = 0;
		uint32_t arcstar = 0;
		uint32_t bodyshield = 1;
		uint32_t backpack = 0;
		uint32_t knockdownshield = 1;
		uint32_t mobilerespawnbeacon = 0;
		uint32_t heatshield = 0;
		uint32_t evactower = 0;
		uint32_t shieldcore = 0;
		uint32_t amp = 0;
	};

	struct perkinfo {
		std::string name = "";
		std::string desc = "";
	};

	struct player {
		std::string id = "";
		std::string name = "";
		std::string character = "";
		uint8_t state = 0;
		int32_t level = 0; // level 0～
		uint32_t kills = 0;
		uint32_t assists = 0;
		uint32_t knockdowns = 0;
		uint32_t revives = 0;
		uint32_t respawns = 0;
		uint32_t damage_dealt = 0;
		uint32_t damage_taken = 0;
		uint32_t hp = 0;
		uint32_t hp_max = 0;
		uint32_t shield = 0;
		uint32_t shield_max = 0;
		uint32_t killed = 0; // TDM等用
		float x = 0.0f;
		float y = 0.0f;
		float angle = 0.0f;
		bool disconnected = false;
		bool canreconnect = false;
		bool characterselected = false;
		items items;
		std::map<int32_t, perkinfo> perks{};
		std::string weapon;
	};

	struct team {
		std::vector<player> players{};
		std::string name = "";
		uint32_t place = 0;
		bool eliminated = false;
	};

	struct ringinfo {
		uint64_t timestamp = 0;
		uint32_t stage = 0;
		float x = 0.0f;
		float y = 0.0f;
		float current = 0.0f;
		float end = 0.0f;
		float shrinkduration = 0.0f;
	};

	struct loadout_info {
		items items;
	};

	struct game {
		std::vector<team> teams{};
		std::string matchendreason = "";
		std::string gamestate = "";
		std::string map = "";
		std::string playlistname = "";
		std::string playlistdesc = "";
		std::string datacenter = "";
		bool aimassiston = false;
		bool anonymousmode = false;
		std::string serverid = "";
		uint64_t start = 0;
		uint64_t end = 0;
		std::vector<ringinfo> rings{};
		loadout_info loadout;
	};

	/* 保存するリザルト */
	struct player_result {
		uint32_t kills = 0;
		uint32_t damage_dealt = 0;
		uint32_t damage_taken = 0;
		uint32_t assists = 0;
		std::string id = "";
		std::string name = "";
		std::string character = "";
		std::map<std::string, uint32_t> items;
	};

	struct team_result {
		std::vector<player_result> players{};
		uint32_t kills = 0;
		uint32_t placement = 0;
		uint16_t id = 0;
		std::string name = "";
	};

	struct result {
		std::map<uint8_t, team_result> teams{};
		std::uint64_t start = 0;
		std::uint64_t end = 0;
		std::string serverid = "";
		std::string map = "";
		std::string playlistname = "";
		std::string playlistdesc = "";
		std::string datacenter = "";
		bool aimassiston = false;
		bool anonymousmode = false;
		std::vector<ringinfo> rings{};
	};

	struct tournament {
		std::vector<result> results{};
		std::string id = "";
		std::string name = "";
		std::string param = "";
	};
}
