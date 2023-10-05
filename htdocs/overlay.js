import * as ApexWebAPI from "./apex-webapi.js";

class LeaderBoard {
    static #HIDECLASS = "lb_hide";
    static #FADEINCLASS = "lb_fadein";
    static #FADEOUTCLASS = "lb_fadeout";
    static #RANKCLASS = "lb_rank";
    static #NAMECLASS = "lb_name";
    static #ALIVESCLASS = "lb_alives";
    static #POINTSCLASS = "lb_points";
    static #CHANGEDCLASS = "lb_changed";
    static #ELIMINATEDCLASS = "lb_eliminated";
    static #FADEINANIMATION ="lbfadein";
    static #FADEOUTANIMATION ="lbfadeout";
    static #CHANGEDANIMATION ="lbchanged";
    static STATUS_PLAYER_ALIVE = 0;
    static STATUS_PLAYER_DOWN = 1;
    static STATUS_PLAYER_KILLED = 2;
    static STATUS_BANNER_COLLECTED = 3;
    constructor() {
        // bodyに追加
        this.box = document.createElement('div');
        this.box.id = 'leaderboard';
        document.body.appendChild(this.box);

        this.timerid = null;
        this.showcount = 0;
        this.shownum = 5;
        this.showinterval = 5000;
        this.alivesonly = true;
    }
    #appendTeam() {
        const div = document.createElement('div');
        div.appendChild(document.createElement('div'));
        div.appendChild(document.createElement('canvas'));
        div.appendChild(document.createElement('div'));
        div.appendChild(document.createElement('div'));

        // クラス設定
        div.classList.add(LeaderBoard.#HIDECLASS);
        div.children[0].classList.add(LeaderBoard.#RANKCLASS);
        div.children[1].classList.add(LeaderBoard.#ALIVESCLASS);
        div.children[2].classList.add(LeaderBoard.#NAMECLASS);
        div.children[3].classList.add(LeaderBoard.#POINTSCLASS);

        // CANVASサイズ設定
        div.children[1].width = 35;
        div.children[1].height = 37;
        this.box.appendChild(div);

        // 順位表示設定
        div.children[0].innerText = '#' + this.box.children.length;

        // 消えたらhide
        div.addEventListener('animationend', (ev) => {
            if (ev.animationName == LeaderBoard.#FADEINANIMATION) {
                div.classList.remove(LeaderBoard.#FADEINCLASS);
            }
            if (ev.animationName == LeaderBoard.#FADEOUTANIMATION) {
                div.classList.add(LeaderBoard.#HIDECLASS);
                div.classList.remove(LeaderBoard.#FADEOUTCLASS);
            }
            if (ev.animationName == LeaderBoard.#CHANGEDANIMATION) {
                div.classList.remove(LeaderBoard.#CHANGEDCLASS);
            }
        });        
    }

    #countAlives() {
        let alives = this.box.children.length;
        for (const t of this.box.children) {
            if (t.classList.contains(LeaderBoard.#ELIMINATEDCLASS)) alives--;
        }
        return alives;
    }

    setTeamParam(index, name, points, eliminated, status) {
        if (typeof(index) != "number") return;
        if (index < 0 || 60 <= index) return;
        if (typeof(status) != "object" || (!Array.isArray(status))) return;

        for (let i = this.box.children.length; i < index + 1; ++i) {
            this.#appendTeam();
        }

        const div = this.box.children[index];

        // クラスの設定
        if (eliminated) div.classList.add(LeaderBoard.#ELIMINATEDCLASS);
        else div.classList.remove(LeaderBoard.#ELIMINATEDCLASS);
        
        // 残りチーム少ない際は表示状態を変える
        if (this.#countAlives() <= this.shownum && this.showcount == 0) {
            for (const child of this.box.children) {
                const t = child.classList;
                if (t.contains(LeaderBoard.#ELIMINATEDCLASS)) {
                    t.add(LeaderBoard.#HIDECLASS);
                } else {
                    t.remove(LeaderBoard.#HIDECLASS);
                }
            }
        }

        if (div.children[2].innerText != name) {
            const init = div.children[2].innerText == "";
            div.children[2].innerText = name;
            if (!init && !div.classList.contains(LeaderBoard.#HIDECLASS)) {
                div.classList.add(LeaderBoard.#CHANGEDCLASS);
            }
        }
        div.children[3].innerText = points;

        // 生存状況の記入
        {
            const canvas = div.children[1];
            const ctx = canvas.getContext('2d');
            if (eliminated) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            } else {
                for (let i = 0; i < status.length; ++i) {
                    // COLOR
                    switch (status[i]) {
                        case LeaderBoard.STATUS_PLAYER_ALIVE: ctx.fillStyle = "#FFFFFF"; break;
                        case LeaderBoard.STATUS_PLAYER_DOWN: ctx.fillStyle = "rgb(213, 25, 26)"; break;
                        case LeaderBoard.STATUS_BANNER_COLLECTED: ctx.fillStyle = "rgb(109, 198, 24)"; break;
                    }
                    // width: 35px 37px;
                    const rect = [7 + i * 8, 8, 5, 23]; // SIZING
                    if (status[i] == LeaderBoard.STATUS_PLAYER_KILLED) {
                        ctx.clearRect(rect[0], rect[1], rect[2], rect[3]);
                    } else {
                        ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);
                    }
                }
            }
        }
    }

    startFadeIn() {
        if (this.#countAlives() > this.shownum) {
            const children = this.box.children;
            const length = children.length;
            let start = this.showcount;
            for (let i = start; i < length && i < start + this.shownum; ++i) {
                const target = children[i].classList;
                children[i].classList.add(LeaderBoard.#FADEINCLASS);
                children[i].classList.remove(LeaderBoard.#HIDECLASS);
                this.showcount++;
            }
            if (this.showcount >= length) this.showcount = 0;

            // fadeoutを予約
            if (start != 0 || length > this.shownum) {
                this.timerid = setTimeout(() => { this.startFadeOut(); }, this.showinterval);
            } else {
                this.timerid = null;
            }
        } else {
            for (const child of this.box.children) {
                const t = child.classList;
                if (t.contains(LeaderBoard.#ELIMINATEDCLASS)) {
                    t.add(LeaderBoard.#HIDECLASS);
                } else {
                    t.add(LeaderBoard.#FADEINCLASS);
                    t.remove(LeaderBoard.#HIDECLASS);
                }
                this.showcount = 0;
            }
            this.timerid = null;
        }
    }

    startFadeOut() {
        for (const c of this.box.children) {
            if (!c.classList.contains(LeaderBoard.#HIDECLASS)) {
                c.classList.add(LeaderBoard.#FADEOUTCLASS);
            }
        }
        this.timerid = setTimeout(() => { this.startFadeIn(); }, 500); // fadeinを予約
    }

    #startAnimation() {
        if (this.timerid == null) {
            this.showcount = 0;
            this.startFadeIn();
        }
    }
    #stopAnimation() {
        if (this.timerid != null) {
            clearTimeout(this.timerid);
            this.timerid = null;
        }
        for (const c of this.box.children) {
            c.classList.add(LeaderBoard.#HIDECLASS);
            c.classList.remove(LeaderBoard.#FADEINCLASS);
            c.classList.remove(LeaderBoard.#FADEOUTCLASS);
        }
    }
    clear() {
        for (const c of this.box.children) {
            c.classList.add(LeaderBoard.#HIDECLASS);
            c.classList.remove(LeaderBoard.#ELIMINATEDCLASS);
            c.classList.remove(LeaderBoard.#FADEINCLASS);
            c.classList.remove(LeaderBoard.#FADEOUTCLASS);
            c.classList.remove(LeaderBoard.#CHANGEDCLASS);
        }
    }
    show() {
        this.box.classList.remove(LeaderBoard.#HIDECLASS);
        this.#startAnimation();
    }
    hide() {
        this.#stopAnimation();
        this.box.classList.add(LeaderBoard.#HIDECLASS);
    }
}

class TeamBanner {
    static RANK_CLASS = "tb_rank";
    static TEAMNAME_CLASS = "tb_teamname";
    static POINTS_CLASS = "tb_points";
    static HIDE_CLASS = "tb_hide";

    constructor() {
        // bodyに追加
        this.box = document.createElement('div');
        this.box.id = 'teambanner';
        document.body.appendChild(this.box);

        this.box.appendChild(document.createElement('div'));
        this.box.appendChild(document.createElement('div'));
        this.box.appendChild(document.createElement('div'));
        this.box.children[0].classList.add(TeamBanner.RANK_CLASS);
        this.box.children[1].classList.add(TeamBanner.TEAMNAME_CLASS);
        this.box.children[2].classList.add(TeamBanner.POINTS_CLASS);
    }

    #setRank(rank) {
        this.box.children[0].innerText = '#' + rank;
    }

    #setTeamName(teamName) {
        this.box.children[1].innerText = teamName;
    }

    #setPoints(points) {
        this.box.children[2].innerText = points;
    }

    setText(rank, teamName, points) {
        this.#setRank(rank);
        this.#setTeamName(teamName);
        this.#setPoints(points);
    }

    show() {
        this.box.classList.remove(TeamBanner.HIDE_CLASS);
    }
    hide() {
        this.box.classList.add(TeamBanner.HIDE_CLASS);
    }
}

class PlayerBanner {
    static NAME_CLASS = "pb_name";
    static HIDE_CLASS = "pb_hide";
    
    constructor() {
        // bodyに追加
        this.box = document.createElement('div');
        this.box.id = 'playerbanner';
        document.body.appendChild(this.box);

        this.box.appendChild(document.createElement('div'));
        this.box.children[0].classList.add(PlayerBanner.NAME_CLASS);
    }

    #setUserName(userName) {
        this.box.children[0].innerText = userName;
    }

    setText(userName) {
        this.#setUserName(userName);
    }

    show() {
        this.box.classList.remove(PlayerBanner.HIDE_CLASS);
    }
    hide() {
        this.box.classList.add(PlayerBanner.HIDE_CLASS);
    }
}

class TeamKills {
    static ICON_CLASS = "tk_icon";
    static KILLS_CLASS = "tk_kills";
    static HIDE_CLASS = "tk_hide";

    constructor() {
        // bodyに追加
        this.box = document.createElement('div');
        this.box.id = 'teamkills';
        document.body.appendChild(this.box);
        
        this.box.appendChild(document.createElement('div'));
        this.box.appendChild(document.createElement('div'));
        this.box.children[0].classList.add(TeamKills.ICON_CLASS);
        this.box.children[1].classList.add(TeamKills.KILLS_CLASS);
        this.box.children[0].innerHTML = `💀`;
    }

    #setTeamKills(kills) {
        this.box.children[1].innerText = kills;
    }

    setText(kills) {
        this.#setTeamKills(kills);
    }

    show() {
        this.box.classList.remove(TeamKills.HIDE_CLASS);
    }
    hide() {
        this.box.classList.add(TeamKills.HIDE_CLASS);
    }
}

class OwnedItems {
    static ITEM_SYRINGE_CLASS = "oi_syringe";
    static ITEM_MEDKIT_CLASS = "oi_medkit";
    static ITEM_SHIELDCELL_CLASS = "oi_shieldcell";
    static ITEM_SHIELDBATTERY_CLASS = "oi_shieldbattery";
    static ITEM_PHOENIXKIT_CLASS = "oi_phoenixkit";
    static ITEM_ULTIMATEACCELERANT_CLASS = "oi_ultimateaccelerant";
    static ITEM_THERMITEGRENADE_CLASS = "oi_thermitgrenade";
    static ITEM_FRAGGRENADE_CLASS = "oi_fraggrenade";
    static ITEM_ARCSTAR_CLASS = "oi_arcstar";
    static ITEM_BACKPACK_CLASS = "oi_backpack";
    static ITEM_BACKPACK_LV0_CLASS = "oi_backpack_lv0";
    static ITEM_BACKPACK_LV1_CLASS = "oi_backpack_lv1";
    static ITEM_BACKPACK_LV2_CLASS = "oi_backpack_lv2";
    static ITEM_BACKPACK_LV3_CLASS = "oi_backpack_lv3";
    static ITEM_BACKPACK_LV4_CLASS = "oi_backpack_lv4";
    static TRANSPARENT_CLASS = "oi_transparent";
    static HIDE_CLASS = "oi_hide";
    #nodes;
    constructor() {
        // bodyに追加
        this.box = document.createElement('div');
        this.box.id = 'owneditems';
        document.body.appendChild(this.box);
        
        this.#nodes = {
            top: document.createElement('div'),
            middle: document.createElement('div'),
            bottom: document.createElement('div'),
            syringe: document.createElement('div'),
            medkit: document.createElement('div'),
            shieldcell: document.createElement('div'),
            shieldbattery: document.createElement('div'),
            phoenixkit: document.createElement('div'),
            ultimateaccelerant: document.createElement('div'),
            thermitgrenade: document.createElement('div'),
            fraggrenade: document.createElement('div'),
            arcstar: document.createElement('div'),
            backpack: document.createElement('div')
        };

        /* append */
        this.box.appendChild(this.#nodes.top);
        this.box.appendChild(this.#nodes.middle);
        this.box.appendChild(this.#nodes.bottom);
        this.#nodes.top.appendChild(this.#nodes.backpack);
        this.#nodes.middle.appendChild(this.#nodes.thermitgrenade);
        this.#nodes.middle.appendChild(this.#nodes.fraggrenade);
        this.#nodes.middle.appendChild(this.#nodes.arcstar);
        this.#nodes.bottom.appendChild(this.#nodes.syringe);
        this.#nodes.bottom.appendChild(this.#nodes.medkit);
        this.#nodes.bottom.appendChild(this.#nodes.shieldcell);
        this.#nodes.bottom.appendChild(this.#nodes.shieldbattery);
        this.#nodes.bottom.appendChild(this.#nodes.phoenixkit);
        this.#nodes.bottom.appendChild(this.#nodes.ultimateaccelerant);

        /* 文字表示用 */
        this.#nodes.thermitgrenade.appendChild(document.createElement('div'));
        this.#nodes.fraggrenade.appendChild(document.createElement('div'));
        this.#nodes.arcstar.appendChild(document.createElement('div'));
        this.#nodes.syringe.appendChild(document.createElement('div'));
        this.#nodes.medkit.appendChild(document.createElement('div'));
        this.#nodes.shieldcell.appendChild(document.createElement('div'));
        this.#nodes.shieldbattery.appendChild(document.createElement('div'));
        this.#nodes.phoenixkit.appendChild(document.createElement('div'));
        this.#nodes.ultimateaccelerant.appendChild(document.createElement('div'));

        /* class設定 */
        this.#nodes.backpack.classList.add(OwnedItems.ITEM_BACKPACK_CLASS);
        this.#nodes.backpack.classList.add(OwnedItems.ITEM_BACKPACK_LV0_CLASS);
        this.#nodes.thermitgrenade.classList.add(OwnedItems.ITEM_THERMITEGRENADE_CLASS);
        this.#nodes.fraggrenade.classList.add(OwnedItems.ITEM_FRAGGRENADE_CLASS);
        this.#nodes.arcstar.classList.add(OwnedItems.ITEM_ARCSTAR_CLASS);
        this.#nodes.syringe.classList.add(OwnedItems.ITEM_SYRINGE_CLASS);
        this.#nodes.medkit.classList.add(OwnedItems.ITEM_MEDKIT_CLASS);
        this.#nodes.shieldcell.classList.add(OwnedItems.ITEM_SHIELDCELL_CLASS);
        this.#nodes.shieldbattery.classList.add(OwnedItems.ITEM_SHIELDBATTERY_CLASS);
        this.#nodes.phoenixkit.classList.add(OwnedItems.ITEM_PHOENIXKIT_CLASS);
        this.#nodes.ultimateaccelerant.classList.add(OwnedItems.ITEM_ULTIMATEACCELERANT_CLASS);
    }

    procUpdateItem(itemid, count) {
        switch(itemid) {
            case "syringe":
            case "medkit":
            case "shieldcell":
            case "shieldbattery":
            case "phoenixkit":
            case "ultimateaccelerant":
            case "thermitgrenade":
            case "fraggrenade":
            case "arcstar":
                const target = this.#nodes[itemid];
                target.children[0].innerText = count;
                if (count == 0) {
                    target.classList.add(OwnedItems.TRANSPARENT_CLASS);
                } else {
                    target.classList.remove(OwnedItems.TRANSPARENT_CLASS);
                }
                break;
            case "backpack": {
                const target = this.#nodes[itemid];
                const lists = [
                    OwnedItems.ITEM_BACKPACK_LV0_CLASS,
                    OwnedItems.ITEM_BACKPACK_LV1_CLASS,
                    OwnedItems.ITEM_BACKPACK_LV2_CLASS,
                    OwnedItems.ITEM_BACKPACK_LV3_CLASS,
                    OwnedItems.ITEM_BACKPACK_LV4_CLASS,
                ];
                for (let i = 0; i < lists.length; ++i) {
                    if (i == count) {
                        target.classList.add(lists[i]);
                    } else {
                        target.classList.remove(lists[i]);
                    }
                }
                break;
            }
        }
    }

    show() {
        this.box.classList.remove(OwnedItems.HIDE_CLASS);
    }
    hide() {
        this.box.classList.add(OwnedItems.HIDE_CLASS);
    }
}

class GameInfo {
    static GAMEINFO_ID = "gameinfo";
    static GAMECOUNT_CLASS = "gi_gamecount";
    static HIDE_CLASS = "gi_hide";
    #nodes;
    constructor() {
        // bodyに追加
        this.#nodes = {
            base: document.createElement('div'),
            gamecount: document.createElement('div')
        };

        // set id
        this.#nodes.base.id = GameInfo.GAMEINFO_ID;
        
        // set class
        this.#nodes.gamecount.classList.add(GameInfo.GAMECOUNT_CLASS);

        // append
        document.body.appendChild(this.#nodes.base);
        this.#nodes.base.appendChild(this.#nodes.gamecount);
    }

    setGameCount(count) {
        this.#nodes.gamecount.innerText = 'Game ' + count;
    }

    show() {
        this.#nodes.base.classList.remove(GameInfo.HIDE_CLASS);
    }
    hide() {
        this.#nodes.base.classList.add(GameInfo.HIDE_CLASS);
    }
}

export class Overlay {
    #webapi;
    #teams; // 計算用
    #_game; // WebAPIのゲームオブジェクト(変更しない)
    #_results; // WebAPIから取得したリザルト(変更しない、追加のみ)
    #calcresultsonly;
    #leaderboard;
    #teambanner;
    #playerbanner;
    #teamkills;
    #owneditems;
    #gameinfo;
    #camera;
    #forcehide;
    static points_table = [12, 9, 7, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];

    constructor() {
        this.#leaderboard = new LeaderBoard();
        this.#teambanner = new TeamBanner();
        this.#playerbanner = new PlayerBanner();
        this.#teamkills = new TeamKills();
        this.#owneditems = new OwnedItems();
        this.#gameinfo = new GameInfo();

        this.#setupApexWebAPI();

        this.#_game = null;
        this.#teams = {};
        this.#camera = { teamid: 0, playerid: 0 };
        this.#forcehide = {
            leaderboard: false,
            teambanner: false,
            teamkills: false,
            playerbanner: false,
            owneditems: false,
            gameinfo: false
        };

        this.hideAll();
    }

    #showHideFromGameState(state) {
        switch(state) {
        case "WaitingForPlayers":
        case "PickLoadout":
        case "Prematch":
        case "Resolution":
        case "Postmatch":
            this.hideAll();
            break;
        case "Playing":
            this.showAll();
            break;
        }
    }

    #setupApexWebAPI() {
        this.#webapi = new ApexWebAPI.ApexWebAPI("ws://127.0.0.1:20081/");
        this.#webapi.addEventListener("open", () => {
            this.#webapi.getAll().then((game) => {
                this.#webapi.getTournamentResults().then((event) => {
                    this.#_game = game;
                    this.#_results = event.detail.results;
                    this.#calcAndDisplay();
                    this.updateGameInfo();
                    this.#showHideFromGameState(this.#_game.state);
                });
            });
        });

        this.#webapi.addEventListener("clearlivedata", (ev) => {
            if (this.#_game == null) return;
            this.#_game = ev.detail.game;
            this.#teams = {};
            this.#calcresultsonly = false;
            this.#calcAndDisplay();
            this.#leaderboard.clear();
        });

        this.#webapi.addEventListener("gamestatechange", (ev) => {
            if (this.#_game == null) return;
            this.#showHideFromGameState(this.#_game.state);
            if (this.#_game.state == "Postmatch") {
                this.#webapi.getTournamentResults().then((event) => {
                    this.#_results = event.detail.results;
                    this.#calcAndDisplay();
                });
            }
        });

        this.#webapi.addEventListener("saveresult", (ev) => {
            if (this.#_game == null) return;
            if (ev.detail.gameid == this.#_results.length) {
                this.#_results.push(ev.detail.result);
                this.#calcresultsonly;
                this.#calcAndDisplay();
                this.updateGameInfo();
            } else {
                this.#webapi.getTournamentResults().then((event) => {
                    this.#_results = event.detail.results;
                    this.#calcresultsonly;
                    this.#calcAndDisplay();
                    this.updateGameInfo();
                });
            }
        });

        this.#webapi.addEventListener("winnerdetermine", (ev) => {
            if (this.#_game == null) return;
            this.hideAll();
        });

        this.#webapi.addEventListener("squadeliminate", (ev) => {
            if (this.#_game == null) return;
            this.#calcAndDisplay();
        });
        
        this.#webapi.addEventListener("playerconnected", (ev) => {
            if (this.#_game == null) return;
            this.#calcAndDisplay();
        });

        this.#webapi.addEventListener("playerstats", (ev) => {
            if (this.#_game == null) return;
            this.#calcAndDisplay();
        });
        
        this.#webapi.addEventListener("statealive", (ev) => {
            if (this.#_game == null) return;
            this.#calcAndDisplay();
        });
        
        this.#webapi.addEventListener("statedown", (ev) => {
            if (this.#_game == null) return;
            this.#calcAndDisplay();
        });
        
        this.#webapi.addEventListener("statekilled", (ev) => {
            if (this.#_game == null) return;
            this.#calcAndDisplay();
        });
        
        this.#webapi.addEventListener("statecollected", (ev) => {
            if (this.#_game == null) return;
            this.#calcAndDisplay();
        });

        this.#webapi.addEventListener("observerswitch", (ev) => {
            if (this.#_game == null) return;
            if (!ev.detail.own) return;
            // カメラ変更
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            this.changeCamera(teamid, playerid);
        });

        this.#webapi.addEventListener("playeritem", (ev) => {
            if (this.#_game == null) return;
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            // カメラのユーザーイベントか確認する
            if (teamid == this.#camera.teamid && playerid == this.#camera.playerid) {
                const itemid = ev.detail.item;
                const count = this.#_game.teams[teamid].players[playerid].items[itemid];
                this.#owneditems.procUpdateItem(itemid, count);
            }
        });

        this.#webapi.addEventListener("broadcastobject", (ev) => {
            const data = ev.detail.data;
            if ('type' in data && 'value' in data) {
                if (data.type === 'forcehideleaderboard') {
                    if (data.value === true) {
                        this.#forcehide.leaderboard = true;
                        this.hideLeaderBoard();
                    } else if (data.value === false) {
                        this.#forcehide.leaderboard = false;
                        this.showLeaderBoard();
                    }
                } else if (data.type === "forcehideteambanner") {
                    if (data.value === true) {
                        this.#forcehide.teambanner = true;
                        this.hideTeamBanner();
                    } else if (data.value === false) {
                        this.#forcehide.teambanner = false;
                        this.showTeamBanner();
                    }
                } else if (data.type === "forcehideteamkills") {
                    if (data.value === true) {
                        this.#forcehide.teamkills = true;
                        this.hideTeamKills();
                    } else if (data.value === false) {
                        this.#forcehide.teamkills = false;
                        this.showTeamKills();
                    }
                } else if (data.type === "forcehideplayerbanner") {
                    if (data.value === true) {
                        this.#forcehide.playerbanner = true;
                        this.hidePlayerBanner();
                    } else if (data.value === false) {
                        this.#forcehide.playerbanner = false;
                        this.showPlayerBanner();
                    }
                } else if (data.type === "forcehideowneditems") {
                    if (data.value === true) {
                        this.#forcehide.owneditems = true;
                        this.hideOwnedItems();
                    } else if (data.value === false) {
                        this.#forcehide.owneditems = false;
                        this.showOwnedItems();
                    }
                } else if (data.type === "forcehidegameinfo") {
                    if (data.value === true) {
                        this.#forcehide.gameinfo = true;
                        this.hideGameInfo();
                    } else if (data.value === false) {
                        this.#forcehide.gameinfo = false;
                        this.showGameInfo();
                    }
                }
            }
        });
    }

    #calcPoints() {
        // 計算用に必要なデータをteamsに格納
        for (let i = 0; i < this.#_game.teams.length; ++i) {
            const src = this.#_game.teams[i];
            if (!(i.toString() in this.#teams)) {
                this.#teams[i] = {};
            } 
            const dst = this.#teams[i];
            if (this.#calcresultsonly) {
                dst.points = 0;
            } else {
                dst.eliminated = src.eliminated;
                dst.placement = src.placement;
                dst.kills = src.kills;
                dst.points = Overlay.points_table[dst.placement - 1];
                dst.points += src.kills;
                dst.status = [];

                for (const player of src.players) {
                    dst.status.push(player.state);
                }
            }

            // 過去のゲームのポイントを加算
            for (const result of this.#_results) {
                if ('teams' in result && i.toString() in result.teams) {
                    const pteam = result.teams[i];
                    dst.points += pteam.kills + Overlay.points_table[pteam.placement - 1];
                }
            }
        }
    }

    #calcRank() {
        // 計算対象のteamid配列格納
        const p = Object.keys(this.#teams);

        p.sort((a, b) => {
            // 現在のトータルポイント比較
            if (this.#teams[a].points > this.#teams[b].points) return -1;
            if (this.#teams[a].points < this.#teams[b].points) return  1;
            
            // 過去のゲームから比較用のポイントを抜き出す
            const points = {};
            const place = {};
            const kills = {};
            points[a] = [];
            points[b] = [];
            place[a] = [];
            place[b] = [];
            kills[a] = [];
            kills[b] = [];
            for (const result of this.#_results) {
                for (const tid of [a, b]) {
                    if (tid in result.teams) {
                        const team = result.teams[tid];
                        if ('points' in team) points[tid].push(team.points);
                        if ('placement' in team) place[tid].push(team.placement);
                        if ('kills' in team) points[tid].push(team.kills);
                    }
                }
            }

            // ソート
            points[a].reverse();
            points[b].reverse();
            place[a].sort();
            place[b].sort();
            kills[a].reverse();
            kills[b].reverse();

            // 同点の場合は、過去のゲームの最高ポイント
            for (let i = 0; i < points[a].length && i < points[b].length; ++i) {
                if (points[a][i] > points[b][i]) return -1;
                if (points[a][i] < points[b][i]) return  1;
            }

            // 同点の場合は、過去のゲームの最高順位
            for (let i = 0; i < place[a].length && i < place[b].length; ++i) {
                if (place[a][i] > place[b][i]) return  1;
                if (place[a][i] < place[b][i]) return -1;
            }

            // 同点の場合は、過去のゲームの最高キル数
            for (let i = 0; i < kills[a].length && i < kills[b].length; ++i) {
                if (kills[a][i] > kills[b][i]) return -1;
                if (kills[a][i] < kills[b][i]) return  1;
            }

            // イレギュラー: 試合数多いほうが勝ち(比較対象が多い)
            if (points[a].length > points[b].length) return -1;
            if (points[a].length < points[b].length) return  1;

            return 0;
        });

        // 計算した順番を保存
        for (let i = 0; i < p.length; ++i) {
            const teamid = p[i];
            const team = this.#teams[teamid];
            team.rank = i;
        }
    }

    #display() {
        // LeaderBorad用に順位でソート
        const p = Object.keys(this.#teams);
        p.sort((a, b) => {
            if (this.#teams[a].rank > this.#teams[b].rank) return  1;
            if (this.#teams[a].rank < this.#teams[b].rank) return -1;
            return 0;
        });

        // LeaderBoard表示に反映
        for (let i = 0; i < p.length; ++i) {
            const teamid = p[i];
            const team = this.#teams[teamid];
            this.#leaderboard.setTeamParam(i, this.#getTeamName(teamid), team.points, team.eliminated, team.status);
        }

        // LeaderBoard以外の表示更新
        if (this.#camera.teamid < this.#_game.teams.length) {
            const teamid = this.#camera.teamid;
            const playerid = this.#camera.playerid;
            const team = this.#_game.teams[teamid];
            if (playerid < team.players.length) {
                this.changeCamera(teamid, playerid);
            }
        }
    }

    #calcAndDisplay() {
        this.#calcPoints();
        this.#calcRank();
        this.#display();
    }

    #getTeamName(teamid) {
        if (typeof teamid == "string") teamid = parseInt(teamid, 10);
        if (teamid < this.#_game.teams.length) {
            const team = this.#_game.teams[teamid];
            if ('params' in team && 'name' in team.params) {
                return team.params.name;
            }
            if ('name' in team) {
                return team.name;
            }
        }
        return "チーム " + teamid;
    }

    #getPlayerName(teamid, playerid) {
        if (teamid < this.#_game.teams.length) {
            const team = this.#_game.teams[teamid];
            if ('players' in team && playerid < team.players.length) {
                const player = team.players[playerid];
                if ('params' in player && 'name' in player.params) {
                    return player.params.name;
                }
                if ('name' in player) {
                    return player.name;
                }
            }
        }
        return "tm" + teamid + " pl" + playerid;
    }

    #getGameCount() {
        if (!this.#_results) return 0;
        const result_count = this.#_results.length;
        return result_count + 1;
    }

    updateGameInfo(count = null) {
        if (count == null) {
            count = this.#getGameCount();
        }
        this.#gameinfo.setGameCount(count);
    }

    showLeaderBoard() {
        if (!this.#forcehide.leaderboard) this.#leaderboard.show();
    }
    showTeamBanner() {
        if (!this.#forcehide.teambanner) this.#teambanner.show();
    }
    showPlayerBanner() {
        if (!this.#forcehide.playerbanner) this.#playerbanner.show();
    }
    showTeamKills() {
        if (!this.#forcehide.teamkills) this.#teamkills.show();
    }
    showOwnedItems() {
        if (!this.#forcehide.owneditems) this.#owneditems.show();
    }
    showGameInfo() {
        if (!this.#forcehide.gameinfo) this.#gameinfo.show();
    }

    hideLeaderBoard() {
        this.#leaderboard.hide();
    }
    hideTeamBanner() {
        this.#teambanner.hide();
    }
    hidePlayerBanner() {
        this.#playerbanner.hide();
    }
    hideTeamKills() {
        this.#teamkills.hide();
    }
    hideOwnedItems() {
        this.#owneditems.hide();
    }
    hideGameInfo() {
        this.#gameinfo.hide();
    }

    showAll() {
        this.showLeaderBoard();
        this.showTeamBanner();
        this.showPlayerBanner();
        this.showTeamKills();
        this.showOwnedItems();
        this.showGameInfo();
    }

    hideAll() {
        this.hideLeaderBoard();
        this.hideTeamBanner();
        this.hidePlayerBanner();
        this.hideTeamKills();
        this.hideOwnedItems();
        this.hideGameInfo();
    }

    updateAllItems(team, playerid) {
        if (!('players' in team)) return;
        if (playerid >= team.players.length) return;
        const player = team.players[playerid];
        if (!('items' in player)) return;

        for (const [itemid, count] of Object.entries(player.items)) {
            this.#owneditems.procUpdateItem(itemid, count);
        }
    }

    changeCamera(teamid, playerid) {
        this.#camera.teamid = teamid;
        this.#camera.playerid = playerid;
        if (teamid.toString() in this.#teams) {
            const team = this.#teams[teamid];
            if ('rank' in team && 'points' in team) {
                this.#teambanner.setText(team.rank + 1, this.#getTeamName(teamid), team.points);
            }
            this.#playerbanner.setText(this.#getPlayerName(teamid, playerid));
            if ('kills' in team) {
                this.#teamkills.setText(team.kills);  
            }

            if (teamid < this.#_game.teams.length) {
                this.updateAllItems(this.#_game.teams[teamid], playerid);
            }
        }
    }
}
