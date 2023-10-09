import * as ApexWebAPI from "./apex-webapi.js";

class OverlayBase {
    static HIDE_CLASS = "hide";
    static FORCEHIDE_CLASS = "forcehide";
    ID;
    PREFIX;
    nodes;
    constructor(id, prefix, root = document.body) {
        this.ID = id;
        this.PREFIX = prefix;

        this.nodes = {
            base: document.createElement('div')
        };

        this.nodes.base.id = this.ID;
        root.appendChild(this.nodes.base);
    }

    addNode(name, tag = "div") {
        if (name in this.nodes) return;
        this.nodes[name] = document.createElement(tag);
        this.nodes[name].classList.add(this.PREFIX + name);
    }

    hide() {
        this.nodes.base.classList.add(OverlayBase.HIDE_CLASS);
    }

    show() {
        this.nodes.base.classList.remove(OverlayBase.HIDE_CLASS);
    }

    addForceHide() {
        this.nodes.base.classList.add(OverlayBase.FORCEHIDE_CLASS);
    }

    removeForceHide() {
        this.nodes.base.classList.remove(OverlayBase.FORCEHIDE_CLASS);
    }
}

class LeaderBoardTeamNode extends OverlayBase {
    static #FADEIN_CLASS = "lb_fadein";
    static #FADEOUT_CLASS = "lb_fadeout";
    static #CHANGED_CLASS = "lb_changed";
    static #ELIMINATED_CLASS = "lb_eliminated";
    static #FADEIN_ANIMATION_NAME ="lb_fadein_animation";
    static #FADEOUT_ANIMATION_NAME ="lb_fadeout_animation";
    static #CHANGED_ANIMATION_NAME ="lb_changed_animation";

    constructor(id, prefix, root) {
        super(id, prefix, root);
        super.addNode("rank");
        super.addNode("alives", "canvas");
        super.addNode("name");
        super.addNode("points");

        // append
        this.nodes.base.appendChild(this.nodes.rank);
        this.nodes.base.appendChild(this.nodes.alives);
        this.nodes.base.appendChild(this.nodes.name);
        this.nodes.base.appendChild(this.nodes.points);
    
        // クラス設定
        this.nodes.base.classList.add(OverlayBase.HIDE_CLASS);
    
        // CANVASサイズ設定
        this.nodes.alives.width = 35;
        this.nodes.alives.height = 37;

        // CANVAS初期化
        for (let i = 0; i < 3; ++i) {
            this.setPlayerState(i, ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_ALIVE);
        }
    
        // 順位表示設定
        this.setRank(20);
    
        // アニメーション後の動作
        this.nodes.base.addEventListener('animationend', (ev) => {
            if (ev.animationName == LeaderBoardTeamNode.#FADEIN_ANIMATION_NAME) {
                this.nodes.base.classList.remove(LeaderBoardTeamNode.#FADEIN_CLASS);
            }
            if (ev.animationName == LeaderBoardTeamNode.#FADEOUT_ANIMATION_NAME) {
                super.hide();
                this.nodes.base.classList.remove(LeaderBoardTeamNode.#FADEOUT_CLASS);
            }
            if (ev.animationName == LeaderBoardTeamNode.#CHANGED_ANIMATION_NAME) {
                this.nodes.base.classList.remove(LeaderBoardTeamNode.#CHANGED_CLASS);
            }
        });
    }

    setRank(rank) {
        this.nodes.rank.innerText = '#' + rank;
    }

    setEliminated(eliminated) {
        if (eliminated) {
            this.nodes.base.classList.add(LeaderBoardTeamNode.#ELIMINATED_CLASS);
        } else {
            this.nodes.base.classList.remove(LeaderBoardTeamNode.#ELIMINATED_CLASS);
        }
    }

    setName(name) {
        this.nodes.name.innerText = name;
    }

    setPoints(points) {
        this.nodes.points.innerText = points;
    }

    isEliminated() {
        return this.nodes.base.classList.contains(LeaderBoardTeamNode.#ELIMINATED_CLASS);
    }

    isHidden() {
        return this.nodes.base.classList.contains(OverlayBase.HIDE_CLASS);
    }

    hasFadeOut() {
        return this.nodes.base.classList.contains(LeaderBoardTeamNode.#FADEOUT_CLASS);
    }
    
    setPlayerState(index, state) {
        if (index >= 3) return;
        const canvas = this.nodes.alives;
        const ctx = canvas.getContext('2d');

        if (this.isEliminated()) {
            // 敗退済みの場合は削除
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        // 色設定
        switch (state) {
            case ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_ALIVE: ctx.fillStyle = "#FFFFFF"; break;
            case ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_DOWN: ctx.fillStyle = "rgb(213, 25, 26)"; break;
            case ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_COLLECTED: ctx.fillStyle = "rgb(109, 198, 24)"; break;
        }

        // 描画
        // width: 35px 37px;
        const rect = [7 + index * 8, 8, 5, 23]; // SIZING
        if (state == ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_KILLED) {
            ctx.clearRect(rect[0], rect[1], rect[2], rect[3]);
        } else {
            ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);
        }
    }

    fadeIn() {
        super.show();
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#CHANGED_CLASS);
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#FADEOUT_CLASS);
        this.nodes.base.classList.add(LeaderBoardTeamNode.#FADEIN_CLASS);
    }

    fadeOut() {
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#CHANGED_CLASS);
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#FADEIN_CLASS);
        this.nodes.base.classList.add(LeaderBoardTeamNode.#FADEOUT_CLASS);
    }

    setChanged() {
        // fadeout中は何もしない
        if (this.hasFadeOut()) return;
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#FADEIN_CLASS);
        this.nodes.base.classList.add(LeaderBoardTeamNode.#CHANGED_CLASS);
        super.show();
    }

    stopAnimation() {
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#CHANGED_CLASS);
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#FADEIN_CLASS);
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#FADEOUT_CLASS);
    }
}

class LeaderBoard extends OverlayBase {
    #teamnodes;
    #currentshowindex;
    #nextshowindex;
    #timerid;
    #shownum;
    #showinterval;
    #alivesonly;
    constructor() {
        super("leaderboard", "lb_");
        this.#teamnodes = {};
        this.#timerid = null;
        this.#currentshowindex = 0;
        this.#nextshowindex = 0;
        this.#shownum = 5;
        this.#showinterval = 5000;
        this.#alivesonly = false;
    }

    #preprocessTeam(teamid) {
        if (typeof teamid == "number") teamid = teamid.toString();
        if (teamid in this.#teamnodes) return; // 既に存在
        this.#teamnodes[teamid] = new LeaderBoardTeamNode("leaderboardteam" + teamid, "lb_", this.nodes.base);
    }

    #countAlives() {
        let alives = 0;
        for (const [teamid, team] of Object.entries(this.#teamnodes)) {
            if (!team.isEliminated()) alives++;
        }
        return alives;
    }

    setTeamName(teamid, name) {
        this.#preprocessTeam(teamid);
        this.#teamnodes[teamid].setName(name);
    }

    setTeamPoints(teamid, points) {
        this.#preprocessTeam(teamid);
        this.#teamnodes[teamid].setPoints(points);
    }

    setTeamEliminated(teamid, eliminated) {
        this.#preprocessTeam(teamid);
        this.#teamnodes[teamid].setEliminated(eliminated);
        if (eliminated) {
            if (this.#countAlives() <= this.#shownum) {
                if (this.#alivesonly == false) {
                    this.#alivesonly = true;
                    this.#switchToAlivesOnly();
                } else {
                    this.#teamnodes[teamid].hide();
                }
            } else {
                if (this.#alivesonly) {
                    this.#alivesonly = false;
                }
            }
        }
    }

    setPlayerState(teamid, playerid, state) {
        this.#preprocessTeam(teamid);
        this.#teamnodes[teamid].setPlayerState(playerid, state);
    }

    #switchToAlivesOnly() {
        this.#stopAnimation();
        for (const [_, node] of Object.entries(this.#teamnodes)) {
            if (node.isEliminated()) {
                node.hide();
            } else {
                node.show();
            }
        }
    }

    setTeamRank(teamids) {
        for (let i = 0; i < teamids.length; ++i) {
            const teamid = teamids[i].id;
            const changed = teamids[i].changed;
            const node = this.#teamnodes[teamid];
            this.#preprocessTeam(teamid);
            if (this.nodes.base.children[i] != node.nodes.base) {
                const ref = i < this.nodes.base.children.length ? this.nodes.base.children[i] : null;
                this.nodes.base.insertBefore(node.nodes.base, ref);
            }

            if (!changed) continue;
            node.setRank(i + 1);

            // 表示非表示の変更
            if (this.#alivesonly) {
                if (!node.isEliminated()) {
                    node.setChanged();
                }
            } else {
                const f = this.#currentshowindex;
                const t = this.#currentshowindex + this.#shownum;
                if (f <= i && i < t) {
                    node.setChanged();
                } else {
                    node.hide();
                }
            }
        }
    }

    #getTeamNode(basenode) {
        for (const teamnode of Object.values(this.#teamnodes)) {
            if (teamnode.nodes.base == basenode) {
                return teamnode;
            }
        }
        return null;
    }

    #startFadeIn() {
        if (this.#alivesonly) return;

        const children = this.nodes.base.children;
        const length = children.length;
        this.#currentshowindex = this.#nextshowindex;
        let start = this.#currentshowindex;
        for (let i = start; i < length && i < start + this.#shownum; ++i) {
            const target = this.#getTeamNode(children[i]);
            target.fadeIn();
            this.#nextshowindex++;
        }
        if (this.#nextshowindex >= length) this.#nextshowindex = 0;

        // fadeoutを予約
        if (length > this.#shownum) {
            this.#timerid = setTimeout(() => {
                this.#startFadeOut();
            }, this.#showinterval);
        } else {
            this.#timerid = null;
        }
    }

    #startFadeOut() {
        this.#timerid = null;
        if (this.#alivesonly) return;
        if (this.nodes.base.children.length <= this.#shownum) return;

        for (const teamnode of Object.values(this.#teamnodes)) {
            if (!teamnode.isHidden()) {
                teamnode.fadeOut();
            }
        }
        this.#timerid = setTimeout(() => { this.#startFadeIn(); }, 500); // 次のfadeinを予約
    }

    #startAnimation() {
        if (this.#timerid != null) return;
        for (const teamnode of Object.values(this.#teamnodes)) {
            if (teamnode.hasFadeOut()) return;
        }
        // 全て隠す
        for (const teamnode of Object.values(this.#teamnodes)) {
            teamnode.hide();
        }
        this.#currentshowindex = 0;
        this.#nextshowindex = 0;
        this.#startFadeIn();
    }

    #stopAnimation() {
        if (this.#timerid != null) {
            clearTimeout(this.#timerid);
            this.#timerid = null;
        }
        for (const teamnode of Object.values(this.#teamnodes)) {
            teamnode.stopAnimation();
        }
    }

    clear() {
        this.#stopAnimation();
        while (this.nodes.base.lastChild != null) {
            this.nodes.base.removeChild(this.nodes.base.lastChild);
        }
        for (const key of Object.keys(this.#teamnodes)) {
            delete this.#teamnodes[key];
        }
        this.#alivesonly = false;
        this.#currentshowindex = 0;
        this.#nextshowindex = 0;
    }

    show() {
        super.show();
        this.#startAnimation();
    }

    hide() {
        this.#stopAnimation();
        super.hide();
    }
}

class TeamBanner extends OverlayBase {
    constructor() {
        super("teambanner", "tb_");
        super.addNode("rank");
        super.addNode("teamname");
        super.addNode("points");

        // append
        this.nodes.base.appendChild(this.nodes.rank);
        this.nodes.base.appendChild(this.nodes.teamname);
        this.nodes.base.appendChild(this.nodes.points);
    }

    setRank(rank) {
        this.nodes.rank.innerText = '#' + rank;
    }

    setTeamName(teamName) {
        this.nodes.teamname.innerText = teamName;
    }

    setPoints(points) {
        this.nodes.points.innerText = points;
    }
}

class PlayerBanner extends OverlayBase {
    constructor() {
        super("playerbanner", "pb_");
        super.addNode("name");

        // append
        this.nodes.base.appendChild(this.nodes.name);
    }

    setText(userName) {
        this.nodes.name.innerText = userName;
    }
}

class TeamKills extends OverlayBase {
    constructor() {
        super("teamkills", "tk_");
        super.addNode("icon");
        super.addNode("kills");
        
        // append
        this.nodes.base.appendChild(this.nodes.icon);
        this.nodes.base.appendChild(this.nodes.kills);

        // アイコン設定
        this.nodes.icon.innerText = `💀`;
    }

    setText(kills) {
        this.nodes.kills.innerText = kills;
    }
}

class OwnedItems extends OverlayBase {
    static ITEM_BACKPACK_LV0_CLASS = "oi_backpack_lv0";
    static ITEM_BACKPACK_LV1_CLASS = "oi_backpack_lv1";
    static ITEM_BACKPACK_LV2_CLASS = "oi_backpack_lv2";
    static ITEM_BACKPACK_LV3_CLASS = "oi_backpack_lv3";
    static ITEM_BACKPACK_LV4_CLASS = "oi_backpack_lv4";
    static TRANSPARENT_CLASS = "oi_transparent";
    constructor() {
        super("owneditems", "oi_");
        
        const ids = [
            "top", "middle", "bottom",
            "syringe", "medkit",
            "shieldcell", "shieldbattery",
            "phoenixkit", "ultimateaccelerant",
            "thermitgrenade", "fraggrenade", "arcstar",
            "backpack"
        ];
        for (const id of ids) {
            super.addNode(id);
        }

        /* append */
        this.nodes.base.appendChild(this.nodes.top);
        this.nodes.base.appendChild(this.nodes.middle);
        this.nodes.base.appendChild(this.nodes.bottom);
        this.nodes.top.appendChild(this.nodes.backpack);
        this.nodes.middle.appendChild(this.nodes.thermitgrenade);
        this.nodes.middle.appendChild(this.nodes.fraggrenade);
        this.nodes.middle.appendChild(this.nodes.arcstar);
        this.nodes.bottom.appendChild(this.nodes.syringe);
        this.nodes.bottom.appendChild(this.nodes.medkit);
        this.nodes.bottom.appendChild(this.nodes.shieldcell);
        this.nodes.bottom.appendChild(this.nodes.shieldbattery);
        this.nodes.bottom.appendChild(this.nodes.phoenixkit);
        this.nodes.bottom.appendChild(this.nodes.ultimateaccelerant);

        /* 文字表示用 */
        this.nodes.thermitgrenade.appendChild(document.createElement('div'));
        this.nodes.fraggrenade.appendChild(document.createElement('div'));
        this.nodes.arcstar.appendChild(document.createElement('div'));
        this.nodes.syringe.appendChild(document.createElement('div'));
        this.nodes.medkit.appendChild(document.createElement('div'));
        this.nodes.shieldcell.appendChild(document.createElement('div'));
        this.nodes.shieldbattery.appendChild(document.createElement('div'));
        this.nodes.phoenixkit.appendChild(document.createElement('div'));
        this.nodes.ultimateaccelerant.appendChild(document.createElement('div'));

        /* 追加のclass設定 */
        this.nodes.backpack.classList.add(OwnedItems.ITEM_BACKPACK_LV0_CLASS);
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
                const target = this.nodes[itemid];
                target.children[0].innerText = count;
                if (count == 0) {
                    target.classList.add(OwnedItems.TRANSPARENT_CLASS);
                } else {
                    target.classList.remove(OwnedItems.TRANSPARENT_CLASS);
                }
                break;
            case "backpack": {
                const target = this.nodes[itemid];
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
}

class GameInfo extends OverlayBase {
    constructor() {
        super("gameinfo", "gi_");
        super.addNode("gamecount");

        // append
        this.nodes.base.appendChild(this.nodes.gamecount);
    }

    setGameCount(count) {
        this.nodes.gamecount.innerText = 'Game ' + count;
    }
}

class ChampionBanner extends OverlayBase {
    static FADEIN_CLASS = "cb_fadein";
    static FADEOUT_CLASS = "cb_fadeout";
    static FADEIN_ANIMATION_NAME = "cb_fadein_animation";
    static FADEOUT_ANIMATION_NAME = "cb_fadeout_animation";

    constructor() {
        super("championbanner", "cb_");
        super.addNode("teamname");

        // append
        this.nodes.base.appendChild(this.nodes.teamname);

        // テスト用の名前を設定
        this.setTeamName('Display Test Team');

        this.nodes.base.addEventListener('animationend', (ev) => {
            if (ev.animationName == ChampionBanner.FADEIN_ANIMATION_NAME) {
                this.nodes.base.classList.remove(ChampionBanner.FADEIN_CLASS);
            }
            if (ev.animationName == ChampionBanner.FADEOUT_ANIMATION_NAME) {
                this.hide();
                this.nodes.base.classList.remove(ChampionBanner.FADEOUT_CLASS);
            }
        });
    }

    setTeamName(name) {
        this.nodes.teamname.innerText = name;
    }

    startFadeIn() {
        this.nodes.base.classList.add(ChampionBanner.FADEIN_CLASS);
        // 6秒で消える(5.7秒でフェードアウト開始)
        setTimeout(() => { this.startFadeOut(); }, 5700);
    }

    startFadeOut() {
        this.nodes.base.classList.add(ChampionBanner.FADEOUT_CLASS);
    }

    show() {
        this.startFadeIn();
        super.show();
    }

    hide() {
        super.hide();
        this.nodes.base.classList.remove(ChampionBanner.FADEIN_CLASS);
        this.nodes.base.classList.remove(ChampionBanner.FADEOUT_CLASS);
    }

    addForceHide() {
        super.addForceHide();
        this.nodes.base.classList.remove(ChampionBanner.FADEIN_CLASS);
        this.nodes.base.classList.remove(ChampionBanner.FADEOUT_CLASS);
    }
}

class SquadEliminated extends OverlayBase {
    static FADEIN_CLASS = "se_fadein";
    static FADEOUT_CLASS = "se_fadeout";
    static FADEIN_ANIMATION_NAME = "se_fadein_animation";
    static FADEOUT_ANIMATION_NAME = "se_fadeout_animation";
    #queue;
    #timerid;
    constructor() {
        super("squadeliminated", "se_");
        super.addNode("teamname");

        this.#queue = [];
        this.#timerid = -1;

        // append
        this.nodes.base.appendChild(this.nodes.teamname);

        this.nodes.base.addEventListener('animationend', (ev) => {
            if (ev.animationName == SquadEliminated.FADEIN_ANIMATION_NAME) {
                this.nodes.base.classList.remove(SquadEliminated.FADEIN_CLASS);
            }
            if (ev.animationName == SquadEliminated.FADEOUT_ANIMATION_NAME) {
                this.nodes.base.classList.remove(SquadEliminated.FADEOUT_CLASS);
                this.#checkNext();
            }
        });
    }

    set(placement, teamname) {
        // 非表示状態の場合は追加しない
        if (this.nodes.base.classList.contains(OverlayBase.FORCEHIDE_CLASS)) return;

        this.#queue.push({
            placement: placement,
            teamname: teamname
        });
        this.#checkNext();
    }

    startFadeIn() {
        this.nodes.base.classList.add(SquadEliminated.FADEIN_CLASS);
        super.show();
        // 4秒で消える(3.7秒でフェードアウト開始)
        this.#timerid = setTimeout(() => { this.startFadeOut(); }, 3700);
    }

    startFadeOut() {
        this.#timerid = -1;
        this.nodes.base.classList.add(SquadEliminated.FADEOUT_CLASS);
    }

    #checkNext() {
        if (this.#queue.length > 0) {
            if (this.#timerid > 0) return; // タイマー発火待ち
            if (this.nodes.base.classList.contains(SquadEliminated.FADEOUT_CLASS)) return; // フェードアウト待ち

            // 次のデータを表示
            const data = this.#queue.shift();
            this.nodes.teamname.innerText = '#' + data.placement + ' ' + data.teamname + ' eliminated';
            this.startFadeIn();
        } else {
            super.hide();
        }
    }
    
    clear() {
        this.#queue.splice(0);
    }

    show() {
        this.#checkNext();
    }

    hide() {
        if (this.#timerid > 0) {
            clearTimeout(this.#timerid);
            this.#timerid = -1;
        }
        super.hide();
        this.nodes.base.classList.remove(SquadEliminated.FADEIN_CLASS);
        this.nodes.base.classList.remove(SquadEliminated.FADEOUT_CLASS);
    }

    addForceHide() {
        super.addForceHide();
        this.nodes.base.classList.remove(SquadEliminated.FADEIN_CLASS);
        this.nodes.base.classList.remove(SquadEliminated.FADEOUT_CLASS);
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
    #championbanner;
    #squadeliminated;
    #camera;
    #getallprocessing;
    static points_table = [12, 9, 7, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];

    constructor() {
        this.#leaderboard = new LeaderBoard();
        this.#teambanner = new TeamBanner();
        this.#playerbanner = new PlayerBanner();
        this.#teamkills = new TeamKills();
        this.#owneditems = new OwnedItems();
        this.#gameinfo = new GameInfo();
        this.#championbanner = new ChampionBanner();
        this.#squadeliminated = new SquadEliminated();
        this.#getallprocessing = false;

        this.#setupApexWebAPI();

        this.#_game = null;
        this.#teams = {};
        this.#_results = [];
        this.#camera = { teamid: "0", playerid: 0, playerhash: "" };

        this.hideAll();
    }

    #setupApexWebAPI() {
        this.#webapi = new ApexWebAPI.ApexWebAPI("ws://127.0.0.1:20081/");

        // 接続時にすべてのデータを取得
        this.#webapi.addEventListener("open", (ev) => {
            this.#getallprocessing = true;
            this.#_game = ev.detail.game;
            this.#webapi.getAll().then(() => {
                this.#webapi.getTournamentResults().then(() => {
                    this.#getallprocessing = false;
                    this.#showHideFromGameState(this.#_game.state);
                    this.#getAllOverlayForceHideState(); 
                }, () => {
                    this.getallprocessing = false;
                });
            });
        });

        this.#webapi.addEventListener("clearlivedata", (ev) => {
            this.#_game = ev.detail.game;
            this.#teams = {};
            this.#calcresultsonly = false;
            this.#leaderboard.clear();
            this.#squadeliminated.clear();
            this.#calcAndDisplay();
        });

        this.#webapi.addEventListener("gamestatechange", (ev) => {
            const state = ev.detail.game.state;
            this.#showHideFromGameState(state);
            switch(state) {
                case "Resolution":
                case "Postmatch":
                    this.#calcresultsonly = true;
                    break;
                case "WaitingForPlayers":
                case "PickLoadout":
                case "Prematch":
                case "Playing":
                    this.#calcresultsonly = false;
                    break;
            }
        });

        // 結果の保存
        this.#webapi.addEventListener("saveresult", (ev) => {
            this.#calcresultsonly = true;
            if (ev.detail.gameid == this.#_results.length) {
                this.#_results.push(ev.detail.result);
                this.#calcAndDisplay();
                this.updateGameInfo();
            } else {
                this.#webapi.getTournamentResults();
            }
        });

        this.#webapi.addEventListener("gettournamentresults", (ev) => {
            this.#_results = ev.detail.results;
            this.#calcAndDisplay();
            this.updateGameInfo();
        });

        // 勝者確定
        this.#webapi.addEventListener("winnerdetermine", (ev) => {
            // 全てのUIを隠す
            this.hideAll();

            // ChampionBannerの表示
            const name = this.#getTeamName(ev.detail.team.id);
            this.#championbanner.setTeamName(name);
            this.showChampionBanner();
        });

        /* SquadEliminated */
        this.#webapi.addEventListener("squadeliminate", (ev) => {
            if (this.#_game == null) return;
            if (this.#getallprocessing) return;
            const placement = ev.detail.team.placement;
            const teamname = this.#getTeamName(ev.detail.team.id);
            if (placement <= 3) return; // 残り3チーム以下は表示しない
            this.#squadeliminated.set(placement, teamname);
        });

        // チーム名系
        this.#webapi.addEventListener("teamname", (ev) => {
            this.#leaderboard.setTeamName(ev.detail.team.id, ev.detail.team.name);
            if (ev.detail.team.id.toString() == this.#camera.teamid) {
                this.#teambanner.setTeamName(ev.detail.team.name);
            }
        });

        this.#webapi.addEventListener("getteamparams", (ev) => {
            if (!('name' in ev.detail.params)) return;
            const teamid = ev.detail.teamid;
            this.#leaderboard.setTeamName(teamid, ev.detail.params.name);
            if (ev.detail.team.id.toString() == this.#camera.teamid) {
                this.#teambanner.setTeamName(ev.detail.params.name);
            }
        });
        
        this.#webapi.addEventListener("setteamparams", (ev) => {
            if (!('name' in ev.detail.params)) return;
            const teamid = ev.detail.teamid;
            this.#leaderboard.setTeamName(teamid, ev.detail.params.name);
            if (ev.detail.team.id.toString() == this.#camera.teamid) {
                this.#teambanner.setTeamName(ev.detail.params.name);
            }
        });

        // プレイヤー名系
        this.#webapi.addEventListener("playername", (ev) => {
            if (ev.detail.team.id.toString() == this.#camera.teamid &&
                ev.detail.player.id == this.#camera.playerid) {
                this.#playerbanner.setText(ev.detail.player.name);
            }
        });

        this.#webapi.addEventListener("getplayerparams", (ev) => {
            if (!('name' in ev.detail.params)) return;
            if (this.#camera.playerhash == "") return;
            if (ev.detail.hash != this.#camera.playerhash) return;
            this.#playerbanner.setText(ev.detail.params.name);
        });
        
        this.#webapi.addEventListener("setteamparams", (ev) => {
            if (!('name' in ev.detail.params)) return;
            if (this.#camera.playerhash == "") return;
            if (ev.detail.hash != this.#camera.playerhash) return;
            this.#playerbanner.setText(ev.detail.params.name);
        });

        this.#webapi.addEventListener("teamplacement", (ev) => {
            if (this.#_game == null) return;
            this.#calcAndDisplay();
        });

        this.#webapi.addEventListener("squadeliminate", (ev) => {
            if (this.#_game == null) return;
            const teamid = ev.detail.team.id;
            this.#leaderboard.setTeamEliminated(teamid, true);
            this.#calcAndDisplay();
        });
        
        this.#webapi.addEventListener("playerconnected", (ev) => {
            if (this.#_game == null) return;
            this.#calcAndDisplay();
        });

        // キル数変更
        this.#webapi.addEventListener("playerstats", (ev) => {
            if (this.#_game == null) return;
            this.#calcAndDisplay();
            if (ev.detail.team.id.toString() == this.#camera.teamid) {
                this.#teamkills.setText(ev.detail.team.kills);
            }
        });

        // プレーヤーステータス変更
        this.#webapi.addEventListener("statealive", (ev) => {
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            const state = ev.detail.player.state;
            this.#leaderboard.setPlayerState(teamid, playerid, state);
        });

        this.#webapi.addEventListener("statedown", (ev) => {
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            const state = ev.detail.player.state;
            this.#leaderboard.setPlayerState(teamid, playerid, state);
        });

        this.#webapi.addEventListener("statekilled", (ev) => {
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            const state = ev.detail.player.state;
            this.#leaderboard.setPlayerState(teamid, playerid, state);
        });

        this.#webapi.addEventListener("statecollected", (ev) => {
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            const state = ev.detail.player.state;
            this.#leaderboard.setPlayerState(teamid, playerid, state);
        });

        this.#webapi.addEventListener("observerswitch", (ev) => {
            if (!ev.detail.own) return;
            // カメラ変更
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            this.changeCamera(teamid, playerid);
        });

        this.#webapi.addEventListener("initcamera", (ev) => {
            // カメラ初期設定
            const teamid = ev.detail.teamid;
            const playerid = ev.detail.playerid;
            this.changeCamera(teamid, playerid);
        });

        this.#webapi.addEventListener("playeritem", (ev) => {
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            // カメラのユーザーイベントか確認する
            if (teamid.toString() == this.#camera.teamid && playerid == this.#camera.playerid) {
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
                        this.#leaderboard.addForceHide();
                    } else if (data.value === false) {
                        this.#leaderboard.removeForceHide();
                    }
                } else if (data.type === "forcehideteambanner") {
                    if (data.value === true) {
                        this.#teambanner.addForceHide();
                    } else if (data.value === false) {
                        this.#teambanner.removeForceHide();
                    }
                } else if (data.type === "forcehideteamkills") {
                    if (data.value === true) {
                        this.#teamkills.addForceHide();
                    } else if (data.value === false) {
                        this.#teamkills.removeForceHide();
                    }
                } else if (data.type === "forcehideplayerbanner") {
                    if (data.value === true) {
                        this.#playerbanner.addForceHide();
                    } else if (data.value === false) {
                        this.#playerbanner.removeForceHide();
                    }
                } else if (data.type === "forcehideowneditems") {
                    if (data.value === true) {
                        this.#owneditems.addForceHide();
                    } else if (data.value === false) {
                        this.#owneditems.removeForceHide();
                    }
                } else if (data.type === "forcehidegameinfo") {
                    if (data.value === true) {
                        this.#gameinfo.addForceHide();
                    } else if (data.value === false) {
                        this.#gameinfo.removeForceHide();
                    }
                } else if (data.type === "forcehidechampionbanner") {
                    if (data.value === true) {
                        this.#championbanner.addForceHide();
                    } else if (data.value === false) {
                        this.#championbanner.removeForceHide();
                    }
                } else if (data.type === "forcehidesquadeliminated") {
                    if (data.value === true) {
                        this.#squadeliminated.addForceHide();
                    } else if (data.value === false) {
                        this.#squadeliminated.removeForceHide();
                    }
                }
            }
        });
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

    #getAllOverlayForceHideState() {
        this.#webapi.broadcastObject({type: "getalloverlaystate"});
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

    #getCurrentRank() {
        return Object.keys(this.#teams).sort((a, b) => {
            if (this.#teams[a].rank > this.#teams[b].rank) return  1;
            if (this.#teams[a].rank < this.#teams[b].rank) return -1;
            return 0;
        });
    }
    
    #getCurrentPoints() {
        const points = {};
        for (const [key, team] of Object.entries(this.#teams)) {
            points[key] = team.points;
        }
        return points;
    }

    #calcAndDisplay() {
        // 計算前のポイント等を保持
        const prev_rank = this.#getCurrentRank();
        const prev_points = this.#getCurrentPoints();

        this.#calcPoints();
        this.#calcRank();

        // 計算後
        const curr_rank = this.#getCurrentRank();
        const curr_points = this.#getCurrentPoints();

        // 変わった部分に変更をかける
        const rank = [];
        for (let i = 0; i < curr_rank.length; ++i) {
            let changed = false;
            if (i >= prev_rank.length || prev_rank[i] != curr_rank[i]) {
                changed = true;
            }
            rank.push({id: curr_rank[i], changed: changed});

            // カメラのランク表示
            if (curr_rank[i] == this.#camera.teamid && changed) {
                this.#teambanner.setRank(i + 1);
            }
        }

        // リーダーボードに反映
        this.#leaderboard.setTeamRank(rank);

        for (const teamid of Object.keys(curr_points)) {
            let changed = false;
            if (!(teamid in prev_points) || prev_points[teamid] != curr_points[teamid]) {
                changed = true;
            }
            if (changed) {
                this.#leaderboard.setTeamPoints(teamid, curr_points[teamid]);

                // カメラのポイント表示
                if (teamid == this.#camera.teamid) {
                    this.#teambanner.setPoints(curr_points[teamid]);
                }
            }
        }
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
        this.#leaderboard.show();
    }
    showTeamBanner() {
        this.#teambanner.show();
    }
    showPlayerBanner() {
        this.#playerbanner.show();
    }
    showTeamKills() {
        this.#teamkills.show();
    }
    showOwnedItems() {
        this.#owneditems.show();
    }
    showGameInfo() {
        this.#gameinfo.show();
    }
    showChampionBanner() {
        this.#championbanner.show();
    }
    setSquadEliminated(placement, teamname) {
        this.#squadeliminated.set(placement, teamname);
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
    hideChampionBanner() {
        this.#championbanner.hide();
    }
    hideSquadEliminated() {
        this.#squadeliminated.hide();
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
        this.hideChampionBanner();
        this.hideSquadEliminated();
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
        console.log(teamid);
        this.#camera.teamid = teamid.toString(); // Object index(string)
        this.#camera.playerid = playerid; // array index

        this.#teambanner.setTeamName(this.#getTeamName(teamid));
        this.#playerbanner.setText(this.#getPlayerName(teamid, playerid));

        if (this.#camera.teamid in this.#teams) {
            const team = this.#teams[teamid];

            if ('rank' in team) {
                this.#teambanner.setRank(team.rank + 1);
            }
            if ('points' in team) {
                this.#teambanner.setPoints(team.points);
            }
            if ('kills' in team) {
                this.#teamkills.setText(team.kills);  
            }
        }

        if (this.#_game && 'teams' in this.#_game) {
            if (teamid < this.#_game.teams.length) {
                this.updateAllItems(this.#_game.teams[teamid], playerid);

                if (playerid < this.#_game.teams[teamid].players.length) {
                    this.#camera.playerhash = this.#_game.teams[teamid].players[playerid].hash;
                }
            }
        }
    }
}
