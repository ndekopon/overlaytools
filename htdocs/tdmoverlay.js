import * as ApexWebAPI from "./apex-webapi.js";

class TDMScoreBoard {
    static #ID = "tdmscoreboard";
    static #PREFIX = "tdmsb_";
    static #HIDECLASS = TDMScoreBoard.#PREFIX + "hide";
    static #TEAM1CLASS = TDMScoreBoard.#PREFIX + "team1";
    static #TEAM2CLASS = TDMScoreBoard.#PREFIX + "team2";
    static #TEAMNAMECLASS = TDMScoreBoard.#PREFIX + "teamname";
    static #LABELCLASS = TDMScoreBoard.#PREFIX + "label";
    static #PLAYERCLASS = TDMScoreBoard.#PREFIX + "player";
    static #PLAYERNAMECLASS = TDMScoreBoard.#PREFIX + "name";
    static #KILLSCLASS = TDMScoreBoard.#PREFIX + "kills";
    static #KILLEDCLASS = TDMScoreBoard.#PREFIX + "killed";
    static #DAMAGEDEALTCLASS = TDMScoreBoard.#PREFIX + "damagedealt";
    static #DAMAGETAKENCLASS = TDMScoreBoard.#PREFIX + "damagetaken";
    static #STATEKILLEDCLASS = TDMScoreBoard.#PREFIX + "statekilled";
    static #PLAYERSELECTEDCLASS = TDMScoreBoard.#PREFIX + "selected";

    #nodes;
    #playernodes;
    
    constructor() {
        // nodeの生成
        this.#nodes = {
            base: document.createElement('div'),
            teams: []
        };
        for (const i of [0, 1]) {
            this.#nodes.teams.push({
                base: document.createElement('div'),
                name: document.createElement('div'),
                label: document.createElement('div'),
                players: document.createElement('div')
            });
        }
        this.#playernodes = {};

        // ID設定
        this.#nodes.base.id = TDMScoreBoard.#ID;

        // クラス設定
        this.#nodes.teams[0].base.classList.add(TDMScoreBoard.#TEAM1CLASS);
        this.#nodes.teams[1].base.classList.add(TDMScoreBoard.#TEAM2CLASS);
        this.#nodes.teams[0].name.classList.add(TDMScoreBoard.#TEAMNAMECLASS);
        this.#nodes.teams[1].name.classList.add(TDMScoreBoard.#TEAMNAMECLASS);
        this.#nodes.teams[0].label.classList.add(TDMScoreBoard.#LABELCLASS);
        this.#nodes.teams[1].label.classList.add(TDMScoreBoard.#LABELCLASS);

        // 追加
        document.body.appendChild(this.#nodes.base);
        for (const i of [0, 1]) {
            this.#nodes.base.appendChild(this.#nodes.teams[i].base);
            this.#nodes.teams[i].base.appendChild(this.#nodes.teams[i].name);
            this.#nodes.teams[i].base.appendChild(this.#nodes.teams[i].label);
            this.#nodes.teams[i].base.appendChild(this.#nodes.teams[i].players);

        }
        // ラベルテキスト設定
        this.appendLabel(0);
        this.appendLabel(1);
    }

    appendLabel(teamid) {
        for (const l of ["NAME", "K", "D", "DMG", "TKN"]) {
            const div = document.createElement('div');
            div.innerText = l;
            this.#nodes.teams[teamid].label.appendChild(div);
        }
    }

    setHash(teamid, hash) {
        const id = (teamid % 2);
        if (hash in this.#playernodes) return;

        // 生成
        this.#playernodes[hash] = {
            base: document.createElement('div'),
            name: document.createElement('div'),
            kills: document.createElement('div'),
            killed: document.createElement('div'),
            dealt: document.createElement('div'),
            taken: document.createElement('div'),
        };

        const nodes = this.#playernodes[hash];

        // クラス設定
        nodes.base.classList.add(TDMScoreBoard.#PLAYERCLASS);
        nodes.name.classList.add(TDMScoreBoard.#PLAYERNAMECLASS);
        nodes.kills.classList.add(TDMScoreBoard.#KILLSCLASS);
        nodes.killed.classList.add(TDMScoreBoard.#KILLEDCLASS);
        nodes.dealt.classList.add(TDMScoreBoard.#DAMAGEDEALTCLASS);
        nodes.taken.classList.add(TDMScoreBoard.#DAMAGETAKENCLASS);

        // 追加
        this.#nodes.teams[id].players.appendChild(nodes.base);
        nodes.base.appendChild(nodes.name);
        nodes.base.appendChild(nodes.kills);
        nodes.base.appendChild(nodes.killed);
        nodes.base.appendChild(nodes.dealt);
        nodes.base.appendChild(nodes.taken);

        // 初期テキスト設定
        nodes.kills.innerText = '0';
        nodes.killed.innerText = '0';
        nodes.dealt.innerText = '0';
        nodes.taken.innerText = '0';
    }
    
    setTeamName(id, name) {
        const target = (id % 2);
        this.#nodes.teams[target].name.innerText = name;
    }

    setPlayerName(hash, name) {
        if (!(hash in this.#playernodes)) return;
        this.#playernodes[hash].name.innerText = name;
    }

    setKills(hash, kills) {
        if (!(hash in this.#playernodes)) return;
        this.#playernodes[hash].kills.innerText = kills;
    }

    setKilled(hash, killed) {
        if (!(hash in this.#playernodes)) return;
        this.#playernodes[hash].killed.innerText = killed;
    }

    setDamage(hash, dealt, taken) {
        if (!(hash in this.#playernodes)) return;
        this.#playernodes[hash].dealt.innerText = dealt;
        this.#playernodes[hash].taken.innerText = taken;
    }

    setAlive(hash, alive) {
        if (!(hash in this.#playernodes)) return;
        const node = this.#playernodes[hash].base;
        if (alive) {
            node.classList.remove(TDMScoreBoard.#STATEKILLEDCLASS);
        } else {
            node.classList.add(TDMScoreBoard.#STATEKILLEDCLASS);
        }
    }

    select(hash) {
        if (!(hash in this.#playernodes)) return;
        for (const node of document.querySelectorAll('.' + TDMScoreBoard.#PLAYERSELECTEDCLASS)) {
            node.classList.remove(TDMScoreBoard.#PLAYERSELECTEDCLASS);
        }
        this.#playernodes[hash].base.classList.add(TDMScoreBoard.#PLAYERSELECTEDCLASS);
    }

    clear() {
        for (const i of [0, 1]) {
            this.#nodes.teams[i].players.innerHTML = '';
        }
        this.#playernodes = {};
    }
    show() {
        this.#nodes.base.classList.remove(TDMScoreBoard.#HIDECLASS);
    }
    hide() {
        this.#nodes.base.classList.add(TDMScoreBoard.#HIDECLASS);
    }
}

export class TDMOverlay {
    #webapi;
    #_game; // WebAPIのゲームオブジェクト(変更しない)
    #scoreboard;
    #forcehide;

    constructor() {
        this.#scoreboard = new TDMScoreBoard();

        this.#setupApexWebAPI();

        this.#_game = null;
        this.#forcehide = {
            leaderboard: false,
        };
        this.hideAll();
    }

    #setupApexWebAPI() {
        this.#webapi = new ApexWebAPI.ApexWebAPI("ws://127.0.0.1:20081/");
        this.#webapi.addEventListener("open", () => {
            this.#webapi.getAll().then((game) => {
                this.#_game = game;
            });
        });

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
                const name = ev.detail.params;
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

        this.#webapi.addEventListener("broadcastobject", (ev) => {
            const data = ev.detail.data;
            if ('type' in data && 'value' in data) {
                if (data.type === 'forcehidetdmscoreboard') {
                    if (data.value === true) {
                        this.#forcehide.scoreboard = true;
                        this.hideScoreBoard();
                    } else if (data.value === false) {
                        this.#forcehide.scoreboard = false;
                        this.showScoreBoard();
                    }
                }
            }
        });
    }

    showScoreBoard() {
        if (!this.#forcehide.scoreboard) this.#scoreboard.show();
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
