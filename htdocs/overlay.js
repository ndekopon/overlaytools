import * as ApexWebAPI from "./apex-webapi.js";

class OverlayBase {
    static HIDE_CLASS = "hide";
    static FORCEHIDE_CLASS = "forcehide";
    ID;
    PREFIX;
    nodes;
    constructor(id, prefix) {
        this.ID = id;
        this.PREFIX = prefix;
        
        this.nodes = {
            base: document.createElement('div')
        }
        this.nodes.base.id = this.ID;
        document.body.appendChild(this.nodes.base);
    }

    addNode(name) {
        if (name in this.nodes) return;
        this.nodes[name] = document.createElement('div');
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

class LeaderBoard {
    static #FADEIN_CLASS = "lb_fadein";
    static #FADEOUT_CLASS = "lb_fadeout";
    static #RANK_CLASS = "lb_rank";
    static #NAME_CLASS = "lb_name";
    static #ALIVES_CLASS = "lb_alives";
    static #POINTS_CLASS = "lb_points";
    static #CHANGED_CLASS = "lb_changed";
    static #ELIMINATED_CLASS = "lb_eliminated";
    static #FADEIN_ANIMATION_NAME ="lb_fadein_animation";
    static #FADEOUT_ANIMATION_NAME ="lb_fadeout_animation";
    static #CHANGED_ANIMATION_NAME ="lb_changed_animation";
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
        div.classList.add(Overlay.HIDE_CLASS);
        div.children[0].classList.add(LeaderBoard.#RANK_CLASS);
        div.children[1].classList.add(LeaderBoard.#ALIVES_CLASS);
        div.children[2].classList.add(LeaderBoard.#NAME_CLASS);
        div.children[3].classList.add(LeaderBoard.#POINTS_CLASS);

        // CANVASサイズ設定
        div.children[1].width = 35;
        div.children[1].height = 37;
        this.box.appendChild(div);

        // 順位表示設定
        div.children[0].innerText = '#' + this.box.children.length;

        // 消えたらhide
        div.addEventListener('animationend', (ev) => {
            if (ev.animationName == LeaderBoard.#FADEIN_ANIMATION_NAME) {
                div.classList.remove(LeaderBoard.#FADEIN_CLASS);
            }
            if (ev.animationName == LeaderBoard.#FADEOUT_ANIMATION_NAME) {
                div.classList.add(Overlay.HIDE_CLASS);
                div.classList.remove(LeaderBoard.#FADEOUT_CLASS);
            }
            if (ev.animationName == LeaderBoard.#CHANGED_ANIMATION_NAME) {
                div.classList.remove(LeaderBoard.#CHANGED_CLASS);
            }
        });        
    }

    #countAlives() {
        let alives = this.box.children.length;
        for (const t of this.box.children) {
            if (t.classList.contains(LeaderBoard.#ELIMINATED_CLASS)) alives--;
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
        if (eliminated) div.classList.add(LeaderBoard.#ELIMINATED_CLASS);
        else div.classList.remove(LeaderBoard.#ELIMINATED_CLASS);
        
        // 残りチーム少ない際は表示状態を変える
        if (this.#countAlives() <= this.shownum && this.showcount == 0) {
            for (const child of this.box.children) {
                const t = child.classList;
                if (t.contains(LeaderBoard.#ELIMINATED_CLASS)) {
                    t.add(Overlay.HIDE_CLASS);
                } else {
                    t.remove(Overlay.HIDE_CLASS);
                }
            }
        }

        if (div.children[2].innerText != name) {
            const init = div.children[2].innerText == "";
            div.children[2].innerText = name;
            if (!init && !div.classList.contains(Overlay.HIDE_CLASS)) {
                div.classList.add(LeaderBoard.#CHANGED_CLASS);
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
                children[i].classList.add(LeaderBoard.#FADEIN_CLASS);
                children[i].classList.remove(Overlay.HIDE_CLASS);
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
                if (t.contains(LeaderBoard.#ELIMINATED_CLASS)) {
                    t.add(Overlay.HIDE_CLASS);
                } else {
                    t.add(LeaderBoard.#FADEIN_CLASS);
                    t.remove(Overlay.HIDE_CLASS);
                }
                this.showcount = 0;
            }
            this.timerid = null;
        }
    }

    startFadeOut() {
        for (const c of this.box.children) {
            if (!c.classList.contains(Overlay.HIDE_CLASS)) {
                c.classList.add(LeaderBoard.#FADEOUT_CLASS);
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
            c.classList.add(Overlay.HIDE_CLASS);
            c.classList.remove(LeaderBoard.#FADEIN_CLASS);
            c.classList.remove(LeaderBoard.#FADEOUT_CLASS);
        }
    }
    clear() {
        for (const c of this.box.children) {
            c.classList.add(Overlay.HIDE_CLASS);
            c.classList.remove(LeaderBoard.#ELIMINATED_CLASS);
            c.classList.remove(LeaderBoard.#FADEIN_CLASS);
            c.classList.remove(LeaderBoard.#FADEOUT_CLASS);
            c.classList.remove(LeaderBoard.#CHANGED_CLASS);
        }
    }
    show() {
        this.box.classList.remove(Overlay.HIDE_CLASS);
        this.#startAnimation();
    }
    hide() {
        this.#stopAnimation();
        this.box.classList.add(Overlay.HIDE_CLASS);
    }
    addForceHide() {
        this.box.classList.add(Overlay.FORCEHIDE_CLASS);
    }
    removeForceHide() {
        this.box.classList.remove(Overlay.FORCEHIDE_CLASS);
    }
}

class TeamBanner extends OverlayBase {
    static RANK_CLASS = "tb_rank";
    static TEAMNAME_CLASS = "tb_teamname";
    static POINTS_CLASS = "tb_points";

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

    #setRank(rank) {
        this.nodes.rank.innerText = '#' + rank;
    }

    #setTeamName(teamName) {
        this.nodes.teamname.innerText = teamName;
    }

    #setPoints(points) {
        this.nodes.points.innerText = points;
    }

    setText(rank, teamName, points) {
        this.#setRank(rank);
        this.#setTeamName(teamName);
        this.#setPoints(points);
    }
}

class PlayerBanner extends OverlayBase {
    static NAME_CLASS = "pb_name";
    
    constructor() {
        super("playerbanner", "pb_");
        super.addNode("name");

        // append
        this.nodes.base.appendChild(this.nodes.name);
    }

    setText(userName) {
        this.nodes.name.innerText(userName);
    }
}

class TeamKills extends OverlayBase {
    static ICON_CLASS = "tk_icon";
    static KILLS_CLASS = "tk_kills";

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
        this.nodes.kills.innerText(kills);
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
    static HIDE_CLASS = "hide";
    static FORCEHIDE_CLASS = "forcehide";
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
        this.#camera = { teamid: 0, playerid: 0 };

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
            this.#getallprocessing = true;
            this.#webapi.getAll().then((game) => {
                this.#webapi.getTournamentResults().then((event) => {
                    this.#getallprocessing = false;
                    this.#_game = game;
                    this.#_results = event.detail.results;
                    this.#calcAndDisplay();
                    this.updateGameInfo();
                    this.#showHideFromGameState(this.#_game.state);
                    this.#getAllOverlayForceHideState(); 
                }, () => {
                    this.getallprocessing = false;
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
            this.#squadeliminated.clear();
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

        this.#webapi.addEventListener("winnerdetermine", (ev) => {
            const name = this.#getTeamName(team.id);
            this.#championbanner.setTeamName(name);
            this.showChampionBanner();
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

        this.#webapi.addEventListener("squadeliminate", (ev) => {
            if (this.#_game == null) return;
            if (this.#getallprocessing) return;
            const placement = ev.detail.team.placement;
            const teamname = this.#getTeamName(ev.detail.team.id);
            if (placement <= 3) return; // 残り3チーム以下は表示しない
            this.#squadeliminated.set(placement, teamname);
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

    #getAllOverlayForceHideState() {
        this.#webapi.broadcastObject({type: "getalloverlaystate"}).then(() => {}, () => {});
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
