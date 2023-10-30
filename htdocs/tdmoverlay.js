import { OverlayBase } from "./overlay-common.js";
import * as ApexWebAPI from "./apex-webapi.js";

class TDMScoreBoardPlayerNode extends OverlayBase {
    constructor(id, prefix, root) {
        super(id, prefix, root);

        super.addNode("playername");
        super.addNode("kills");
        super.addNode("killed");
        super.addNode("dealt");
        super.addNode("taken");

        this.nodes.base.appendChild(this.nodes.playername);
        this.nodes.base.appendChild(this.nodes.kills);
        this.nodes.base.appendChild(this.nodes.killed);
        this.nodes.base.appendChild(this.nodes.dealt);
        this.nodes.base.appendChild(this.nodes.taken);

        // クラス設定
        this.nodes.base.classList.add(prefix + "player");
    }
}

class TDMScoreBoardTeamNode extends OverlayBase {
    constructor(id, prefix, root) {
        super(id, prefix, root);
        super.addNode("teamname");
        super.addNode("label");
        super.addNode("players");
        super.addNode("label_name");
        super.addNode("label_kills");
        super.addNode("label_killed");
        super.addNode("label_damage_dealt");
        super.addNode("label_damage_taken");

        // append
        this.nodes.base.appendChild(this.nodes.teamname);
        this.nodes.base.appendChild(this.nodes.label);
        this.nodes.base.appendChild(this.nodes.players);
        this.nodes.label.appendChild(this.nodes.label_name);
        this.nodes.label.appendChild(this.nodes.label_kills);
        this.nodes.label.appendChild(this.nodes.label_killed);
        this.nodes.label.appendChild(this.nodes.label_damage_dealt);
        this.nodes.label.appendChild(this.nodes.label_damage_taken);

        this.nodes.label_name.innerText = "NAME";
        this.nodes.label_kills.innerText = "K";
        this.nodes.label_killed.innerText = "D";
        this.nodes.label_damage_dealt.innerText = "DMG";
        this.nodes.label_damage_taken.innerText = "TKN";
    }
}

class TDMScoreBoard extends OverlayBase {
    #id;
    #prefix;
    #playernodes;
    #teams;

    constructor() {
        const id = "tdmscoreboard";
        const prefix = "tdmsb_";
        super(id, prefix);

        this.#id = id;
        this.#prefix = prefix;
        this.#teams = [];
        this.#playernodes = {};

        for (const i of [0, 1]) {
            this.#teams.push(new TDMScoreBoardTeamNode(id + "_team_" + i, prefix, this.nodes.base));
        }
    }

    setHash(teamid, hash) {
        const id = (teamid % 2);
        if (hash in this.#playernodes) return;

        // 生成
        this.#playernodes[hash] = new TDMScoreBoardPlayerNode(this.#id + "_player_" + hash, this.#prefix, this.#teams[id].nodes.players);

        // 初期テキスト設定
        this.setKills(hash, 0);
        this.setKilled(hash, 0);
        this.setDamage(hash, 0, 0);
    }
    
    setTeamName(id, name) {
        const target = (id % 2);
        this.#teams[target].nodes.teamname.innerText = name;
    }

    setPlayerName(hash, name) {
        if (!(hash in this.#playernodes)) return;
        this.#playernodes[hash].nodes.playername.innerText = name;
    }

    setKills(hash, kills) {
        if (!(hash in this.#playernodes)) return;
        this.#playernodes[hash].nodes.kills.innerText = kills;
    }

    setKilled(hash, killed) {
        if (!(hash in this.#playernodes)) return;
        this.#playernodes[hash].nodes.killed.innerText = killed;
    }

    setDamage(hash, dealt, taken) {
        if (!(hash in this.#playernodes)) return;
        this.#playernodes[hash].nodes.dealt.innerText = dealt;
        this.#playernodes[hash].nodes.taken.innerText = taken;
    }

    setAlive(hash, alive) {
        if (!(hash in this.#playernodes)) return;
        const node = this.#playernodes[hash];
        if (alive) {
            node.removeClass("statekilled");
        } else {
            node.addClass("statekilled");
        }
    }

    select(hash) {
        if (!(hash in this.#playernodes)) return;
        const classname = this.#prefix + "selected";
        for (const node of document.querySelectorAll('.' + classname)) {
            node.classList.remove(classname);
        }
        this.#playernodes[hash].addClass("selected");
    }

    clear() {
        for (const i of [0, 1]) {
            this.#teams[i].nodes.players.innerHTML = '';
        }
        this.#playernodes = {};
    }
}

class ErrorStatus extends OverlayBase {
    /**
     * コンストラクタ
     */
    constructor() {
        super("errorstatus", "es_");
        super.addNode("webapi");
        super.addNode("liveapi");
        
        // append
        this.nodes.base.appendChild(this.nodes.webapi);
        this.nodes.base.appendChild(this.nodes.liveapi);

        // テキスト設定
        this.nodes.webapi.innerText = "Overlay is not connected via WebAPI.";
        this.nodes.liveapi.innerText = "ApexLegends is not connected via LiveAPI.";

        // 初期状態
        this.setWebAPIStatus(false);
        this.setLiveAPIStatus(true);
    }

    /**
     * WebAPIの接続状況によってメッセージを表示する
     * @param {boolean} connected true=接続済,false=未接続
     */
    setWebAPIStatus(connected) {
        if (connected) {
            this.nodes.webapi.classList.add('hide');
        } else {
            this.nodes.webapi.classList.remove('hide');
        }
    }

    /**
     * LiveAPIの接続状況によってメッセージを表示する
     * @param {boolean} connected true=接続済,false=未接続
     */
    setLiveAPIStatus(connected) {
        if (connected) {
            this.nodes.liveapi.classList.add('hide');
        } else {
            this.nodes.liveapi.classList.remove('hide');
        }
    }
}

export class TDMOverlay {
    #webapi;
    #_game; // WebAPIのゲームオブジェクト(変更しない)
    #scoreboard;
    #errorstatus;

    constructor(url = "ws://127.0.0.1:20081/") {
        this.#scoreboard = new TDMScoreBoard();
        this.#errorstatus = new ErrorStatus();

        this.#setupApexWebAPI(url);

        this.#_game = null;
    }

    #setupApexWebAPI(url) {
        this.#webapi = new ApexWebAPI.ApexWebAPI(url);
        this.#webapi.addEventListener("open", () => {
            this.#errorstatus.setWebAPIStatus(true);
            this.#webapi.getAll().then((game) => {
                this.#_game = game;
                this.#webapi.getTournamentParams();
            });
        });

        this.#webapi.addEventListener("close", () => {
            this.#errorstatus.setWebAPIStatus(false);
        })

        this.#webapi.addEventListener("error", () => {
            this.#errorstatus.setWebAPIStatus(false);
        })

        this.#webapi.addEventListener("clearlivedata", (ev) => {
            this.#_game = ev.detail.game;
            this.#scoreboard.clear();
        });

        this.#webapi.addEventListener("playerhash", (ev) => {
            const teamid = ev.detail.team.id;
            const hash = ev.detail.player.hash;
            if (teamid > 3) return; // TDMは0,1,2,3のみ
            this.#scoreboard.setHash(teamid, hash);
        });

        // プレイヤー名前関係
        this.#webapi.addEventListener("playername", (ev) => {
            const hash = ev.detail.player.hash;
            const name = ev.detail.player.name;
            this.#scoreboard.setPlayerName(hash, name);
        });

        this.#webapi.addEventListener("getplayerparams", (ev) => {
            const hash = ev.detail.hash;
            if ('name' in ev.detail.params) {
                const name = ev.detail.params.name;
                this.#scoreboard.setPlayerName(hash, name);
            }
        });
        
        this.#webapi.addEventListener("setplayerparams", (ev) => {
            const hash = ev.detail.hash;
            if (ev.detail.result && 'name' in ev.detail.params) {
                const name = ev.detail.params.name;
                this.#scoreboard.setPlayerName(hash, name);
            }
        });

        // チーム名関係
        this.#webapi.addEventListener("teamname", (ev) => {
            const id = ev.detail.team.id;
            const name = ev.detail.team.name;
            if (id > 1) return; // 0,1のみ反映
            this.#scoreboard.setTeamName(id, name);
        });

        this.#webapi.addEventListener("getteamparams", (ev) => {
            const id = ev.detail.teamid;
            if (id > 1) return; // 0,1のみ反映
            if ('name' in ev.detail.params) {
                const name = ev.detail.params.name;
                this.#scoreboard.setTeamName(id, name);
            }
        });
        
        this.#webapi.addEventListener("setteamparams", (ev) => {
            const id = ev.detail.teamid;
            if (id > 1) return; // 0,1のみ反映
            if (ev.detail.result && 'name' in ev.detail.params) {
                const name = ev.detail.params.name;
                this.#scoreboard.setTeamName(id, name);
            }
        });

        // スタッツ更新
        this.#webapi.addEventListener("playerstats", (ev) => {
            const hash = ev.detail.player.hash;
            const kills = ev.detail.player.kills;
            this.#scoreboard.setKills(hash, kills);
        });
        
        this.#webapi.addEventListener("playerkilledcount", (ev) => {
            const hash = ev.detail.player.hash;
            const killed = ev.detail.player.killed;
            this.#scoreboard.setKilled(hash, killed);
        });

        this.#webapi.addEventListener("playerdamage", (ev) => {
            const hash = ev.detail.player.hash;
            const dealt = ev.detail.player.damage_dealt;
            const taken = ev.detail.player.damage_taken;
            this.#scoreboard.setDamage(hash, dealt, taken);
        });
        
        this.#webapi.addEventListener("statealive", (ev) => {
            const hash = ev.detail.player.hash;
            this.#scoreboard.setAlive(hash, true);
        });
        
        this.#webapi.addEventListener("statekilled", (ev) => {
            const hash = ev.detail.player.hash;
            this.#scoreboard.setAlive(hash, false);
        });

        this.#webapi.addEventListener("observerswitch", (ev) => {
            if (this.#_game == null) return;
            if (!ev.detail.own) return;
            if (ev.detail.player) {
                this.#scoreboard.select(ev.detail.player.hash);
            }
        });

        // LiveAPI側の接続状況
        this.#webapi.addEventListener("liveapisocketstats", (ev) => {
            const connection_count = ev.detail.conn;
            this.#errorstatus.setLiveAPIStatus(connection_count > 0);
        });

        // Overlayの表示状態
        this.#webapi.addEventListener("gettournamentparams", (ev) => {
            if (!('forcehide' in ev.detail.params)) return;
            if (!('tdmscoreboard' in ev.detail.params.forcehide)) return;
            if (ev.detail.params.forcehide.tdmscoreboard) this.#scoreboard.addForceHide();
            else this.#scoreboard.removeForceHide();
        });

        this.#webapi.addEventListener("settournamentparams", (ev) => {
            if (!('forcehide' in ev.detail.params)) return;
            if (!('tdmscoreboard' in ev.detail.params.forcehide)) return;
            if (ev.detail.params.forcehide.tdmscoreboard) this.#scoreboard.addForceHide();
            else this.#scoreboard.removeForceHide();
        });
    }

    showScoreBoard() {
        this.#scoreboard.show();
    }

    hideScoreBoard() {
        this.#scoreboard.hide();
    }

    showAll() {
        this.showLeaderBoard();
    }

    hideAll() {
        this.hideScoreBoard();
    }
}
