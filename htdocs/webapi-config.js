import * as ApexWebAPI from "./apex-webapi.js";
import {
    calcPoints,
    OverlayBase,
    appendToTeamResults,
    resultsToTeamResults,
    setRankParameterToTeamResults,
} from "./overlay-common.js";

class WebAPIConfigBase {
    /** @type {Object.<string, HTMLElement>} 関連するノードを格納 */
    nodes;
    /** @type {string} getElementByIdを行う際の接頭辞 */
    prefix;

    /**
     * コンストラクタ
     * @param {string} prefix getElementByIdを行う際の接頭辞
     */
    constructor(prefix) {
        this.nodes = {};
        this.prefix = prefix;
    }

    /**
     * HTMLノードを取得し、nodesに格納する
     * @param {string} name 取得するノードのIDに含まれる文字列
     * @returns {HTMLElement|null} 取得したノード、失敗した場合はnull
     */
    getNode(name) {
        const node = document.getElementById(this.prefix + name);
        if (node) {
            this.nodes[name] = node;
            return node;
        }
        return null;
    }
}

class WebAPIConnectionStatus extends WebAPIConfigBase {
    /**
     * コンストラクタ
     */
    constructor() {
        super('connection-status-webapi-');
        this.getNode('state');
    }
    /**
     * WebAPIの接続ステータスを設定する
     * @param {string} state 接続状況
     */
    setStatus(state) {
        this.nodes.state.innerText = state;
    }
}

class LiveAPIConnectionStatus extends WebAPIConfigBase {
    /**
     * コンストラクタ
     */
    constructor() {
        super('connection-status-liveapi-');
        this.getNode('connection');
        this.getNode('recv');
        this.getNode('send');
    }
    /**
     * LiveAPIの接続ステータスを設定する
     * @param {number} conn コネクション数
     * @param {number} recv 受信パケット数
     * @param {number} send 送信パケット数
     */
    setStatus(conn, recv, send) {
        this.nodes.connection.innerText = conn;
        this.nodes.recv.innerText = recv;
        this.nodes.send.innerText = send;
    }
}

class ObserverConfig {
    #callback;
    #observers;
    #current;
    #base;

    constructor() {
        this.#observers = {};
        this.#current = "";
        this.#base = document.getElementById('observer-set-list');
    }

    #generateObserverNode(id) {
        const node = {
            base: document.createElement('tr'),
            id: document.createElement('td'),
            name: document.createElement('td')
        }

        /* append */
        node.base.appendChild(node.id);
        node.base.appendChild(node.name);

        /* draw */
        node.id.innerText = id;
        
        /* set current */
        if (this.#current != "" && id == this.#current) {
            node.base.classList.add('observer-set-selected');
        }

        /* set callback */
        node.base.addEventListener('click', () => {
            if (this.#current == id) return;
            if (typeof(this.#callback) != 'function') return;
            this.#callback(id);
        });

        return node;
    }

    drawObserverName(id, name) {
        if (id == '') return;
        if (!(id in this.#observers)) {
            this.#observers[id] = {};
        }
        const observer = this.#observers[id];
        if (!('name' in observer)) {
            observer.name = name;
        }

        if (!('node' in observer)) {
            observer.node = this.#generateObserverNode(id);
            this.#base.appendChild(observer.node.base);
        }

        observer.node.name.innerText = name;
    }

    setCurrentObserver(id) {
        this.#current = id;
        if (id == '') return;
        document.getElementById('current_observer_id').innerText = id;
        if (!(id in this.#observers)) return;
        const observer = this.#observers[id];
        if (!('node' in observer)) return;
        for (const node of document.querySelectorAll('tr.observer-set-selected')) {
            node.classList.remove('observer-set-selected');
        }
        observer.node.base.classList.add('observer-set-selected');
    }
    
    setClickCallback(func) {
        this.#callback = func;
    }
}

class PlayerName extends WebAPIConfigBase {
    /** @type {Object.<string, HTMLElement>} hashに対応するテーブル列を保持 */
    #players;
    /** @type {setPlayerNameCallback} */
    #callback;

    /**
     * コンストラクタ
     */
    constructor() {
        super('player-name-');
        this.getNode('list');
        this.#players = {};
        this.#callback = undefined;
    }

    /**
     * 新しいHTMLElementを作る
     * @param {string} hash プレイヤーID(hash)
     */
    #createTableRow(hash) {
        const tr = document.createElement('tr');
        this.#players[hash] = tr;
        this.nodes.list.appendChild(tr);
        tr.appendChild(document.createElement('td'));
        tr.appendChild(document.createElement('td'));
        tr.appendChild(document.createElement('td'));
        tr.appendChild(document.createElement('td'));
        // PlayerID格納
        tr.children[0].innerText = hash;

        // プレイヤー名更新用
        const input = document.createElement('input');
        const button = document.createElement('button')
        tr.children[3].appendChild(input);

        // ボタンの設定
        tr.children[3].appendChild(button);
        button.innerText = 'set';
        button.addEventListener('click', () => {
            const name = input.value.trim();
            const prev_name = this.#getName(hash);
            if (name != prev_name) {
                if (this.#callback) {
                    this.#callback(hash, name);
                }
            }
        });
    }

    /**
     * プレイヤー名の設定ボタンが押された場合のコールバック
     * @callback setPlayerNameCallback
     * @param {string} hash プレイヤーID(hash)
     * @param {string} name 設定するプレイヤー名
     */

    /**
     * コールバック関数
     * @param {setPlayerNameCallback} func コールバック関数
     */
    setCallback(func) {
        if (typeof func == 'function') {
            this.#callback = func;
        }
    }

    /**
     * 現在表示されているバナー用プレイヤー名取得
     * @param {string} hash プレイヤーID(hash)
     * @returns {string} プレイヤー名
     */
    #getName(hash) {
        if (hash in this.#players) {
            const tr = this.#players[hash];
            return tr.children[1].innerText;
        }
        return '';
    }

    /**
     * バナー用プレイヤー名設定
     * @param {string} hash プレイヤーID(hash)
     * @param {string} name プレイヤー名
     */
    setName(hash, name) {
        if (!(hash in this.#players)) {
            this.#createTableRow(hash);
        }
        if (hash in this.#players) {
            const tr = this.#players[hash];
            tr.children[1].innerText = name;
        }
    }

    /**
     * インゲーム名リストを設定
     * @param {string} hash プレイヤーID(hash)
     * @param {string[]} names ゲーム内プレイヤー名の配列
     */
    setInGameNames(hash, names) {
        if (!(hash in this.#players)) {
            this.#createTableRow(hash);
        }
        if (hash in this.#players) {
            const tr = this.#players[hash];
            tr.children[2].innerText = names.join();
        }
    }
}

class TeamName extends WebAPIConfigBase {
    /** @type {setPlayerNameCallback} */
    #callback;

    /**
     * コンストラクタ
     */
    constructor() {
        super('team-name-');
        this.getNode('num');
        this.getNode('text');
        this.getNode('output');

        this.nodes.text.addEventListener('change', (ev) => {
            this.#updateOutput(ev.target.value);
        });
    }

    /**
     * テキストエリアを更新する
     * @param {*} text テキストエリアに設定する文字列
     */
    updateText(text) {
        const prev_text = this.nodes.text.value;
        if (text != prev_text) {
            this.nodes.text.value = text;
            this.#updateOutput(text);
        }
    }

    /**
     * テキストエリアからチーム名の配列を作る
     * @returns {string[]} チーム名の入った配列
     */
    getLines() {
        const text = this.nodes.text.value;
        return text.split(/\r\n|\n/).map((line) => line.trim()).slice(0, 30);
    }

    /**
     * 1行毎に「TeamXX: 」をつけてoutput側のTextAreaに設定
     * @param {string} text 元のテキスト
     */
    #updateOutput(src) {
        let dst = '';
        const lines = src.split(/\r\n|\n/);
        for (let i = 0; i < 30 && i < lines.length; ++i) {
            const line = lines[i].trim();
            if (dst != '') dst += '\r\n';
            dst += (line == '' ? '' : 'Team' + (i + 1) + ': ' + line);
        }
        this.nodes.output.innerText = dst;
    }
}

class RealtimeView {
    #_game;
    #basenode;
    #gameinfonode;
    #nodes;
    #gameinfonodes;
    #callback;
    #playersnamenode;

    constructor() {
        this.#basenode = document.getElementById('realtime-teams');
        this.#nodes = [];
        this.#callback = null;
        this.#playersnamenode = {};

        // ゲーム情報の格納先作成
        this.#gameinfonode = document.getElementById('realtime-gameinfo');
        this.#gameinfonodes = {
            datacenter: document.createElement('div'),
            aimassiston: document.createElement('div'),
            serverid: document.createElement('div'),
            anonymousmode: document.createElement('div'),
            state: document.createElement('div'),
            start: document.createElement('div'),
            end: document.createElement('div'),
            map: document.createElement('div'),
            playlistname: document.createElement('div'),
            playlistdesc: document.createElement('div'),
        };
        this.#gameinfonode.appendChild(this.#gameinfonodes.datacenter);
        this.#gameinfonode.appendChild(this.#gameinfonodes.aimassiston);
        this.#gameinfonode.appendChild(this.#gameinfonodes.anonymousmode);
        this.#gameinfonode.appendChild(this.#gameinfonodes.serverid);
        this.#gameinfonode.appendChild(this.#gameinfonodes.state);
        this.#gameinfonode.appendChild(this.#gameinfonodes.start);
        this.#gameinfonode.appendChild(this.#gameinfonodes.end);
        this.#gameinfonode.appendChild(this.#gameinfonodes.map);
        this.#gameinfonode.appendChild(this.#gameinfonodes.playlistname);
        this.#gameinfonode.appendChild(this.#gameinfonodes.playlistdesc);

    }

    #precheckTeamID(teamid) {
        if (teamid < this.#basenode.children.length) return;
        for (let i = this.#basenode.children.length; i <= teamid; ++i) {
            this.#appendTeamNode(i);
        }
    }

    #precheckPlayerID(teamid, playerid) {
        if (playerid < this.#nodes[teamid].players.length) return;
        for (let i = this.#nodes[teamid].players.length; i <= playerid; ++i) {
            this.#appendPlayerNode(teamid, i);
        }
    }

    #drawBarHP(canvas, hp, hpmax) {
        const height = 8;
        canvas.width = hpmax + 2;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, hpmax + 2, height);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(1, 1, hp, height - 2);
    }
    
    #drawBarShield(canvas, shield, shieldmax, gold = false) {
        const height = 8;
        canvas.width = shieldmax + 2;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, shieldmax + 2, height);

        if (shieldmax == 125) {
            ctx.fillStyle = "#FF0000";
        } else if (shieldmax == 100) {
            if (gold) {
                ctx.fillStyle = "#E6B422";
            } else {
                ctx.fillStyle = "#A260BF";
            }
        } else if (shieldmax == 75) {
            ctx.fillStyle = "#7FCCE3";
        } else {
            ctx.fillStyle = "#FFFFFF";
        }
        ctx.fillRect(1, 1, shield, height - 2);
    }

    #generateTeamNode(teamid) {
        const teamnode = {};
        teamnode.base = document.createElement('div');
        teamnode.banner = document.createElement('div');
        teamnode.number = document.createElement('div');
        teamnode.name = document.createElement('div');
        teamnode.kills = document.createElement('div');
        teamnode.kills_header = document.createElement('div');
        teamnode.kills_value = document.createElement('div');
        teamnode.placement = document.createElement('div');
        teamnode.placement_header = document.createElement('div');
        teamnode.placement_value = document.createElement('div');
        teamnode.players = [];

        /* append */
        teamnode.banner.appendChild(teamnode.number);
        teamnode.banner.appendChild(teamnode.name);
        teamnode.banner.appendChild(teamnode.kills);
        teamnode.banner.appendChild(teamnode.placement);
        teamnode.kills.appendChild(teamnode.kills_header);
        teamnode.kills.appendChild(teamnode.kills_value);
        teamnode.placement.appendChild(teamnode.placement_header);
        teamnode.placement.appendChild(teamnode.placement_value);
        teamnode.base.appendChild(teamnode.banner);

        /* set class */
        teamnode.base.classList.add('realtime-team-base');
        teamnode.banner.classList.add('realtime-team-banner');
        teamnode.number.classList.add('realtime-team-number');
        teamnode.name.classList.add('realtime-team-name');
        teamnode.kills.classList.add('realtime-team-kills');
        teamnode.kills_header.classList.add('realtime-team-kills-header');
        teamnode.kills_value.classList.add('realtime-team-kills-value');
        teamnode.placement.classList.add('realtime-team-placement');
        teamnode.placement_header.classList.add('realtime-team-placement-header');
        teamnode.placement_value.classList.add('realtime-team-placement-value');

        /* set initial text */
        teamnode.number.innerText = (teamid + 1);
        teamnode.kills_header.innerText = 'kills';
        teamnode.kills_value.innerText = '0';
        teamnode.placement_header.innerText = 'place';
        teamnode.placement_value.innerText = '0';

        return teamnode;
    }

    #generatePlayerNode(teamid, playerid) {
        const playernode = {};
        playernode.base = document.createElement('div');
        playernode.left = document.createElement('div');
        playernode.right = document.createElement('div');
        playernode.name = document.createElement('div');
        playernode.character = document.createElement('div');
        playernode.hpshield = document.createElement('div');
        playernode.hp = document.createElement('div');
        playernode.hpbar = document.createElement('canvas');
        playernode.shield = document.createElement('div');
        playernode.shieldbar = document.createElement('canvas');
        playernode.kills = document.createElement('div');
        playernode.assists = document.createElement('div');
        playernode.damage_dealt = document.createElement('div');
        playernode.damage_taken = document.createElement('div');

        /* append */
        playernode.base.appendChild(playernode.left);
        playernode.base.appendChild(playernode.right);
        playernode.left.appendChild(playernode.name);
        playernode.left.appendChild(playernode.hpshield);
        playernode.left.appendChild(playernode.character);
        playernode.hpshield.appendChild(playernode.hp);
        playernode.hpshield.appendChild(playernode.hpbar);
        playernode.hpshield.appendChild(playernode.shield);
        playernode.hpshield.appendChild(playernode.shieldbar);
        playernode.right.appendChild(playernode.kills);
        playernode.right.appendChild(playernode.assists);
        playernode.right.appendChild(playernode.damage_dealt);
        playernode.right.appendChild(playernode.damage_taken);
        
        /* set class */
        playernode.base.classList.add('realtime-player-base');
        playernode.base.classList.add('realtime-player-state-alive'); // デフォルトは生存
        playernode.left.classList.add('realtime-player-left');
        playernode.right.classList.add('realtime-player-right');
        playernode.name.classList.add('realtime-player-name');
        playernode.character.classList.add('realtime-player-character');
        playernode.hpshield.classList.add('realtime-player-hpshield');
        playernode.hp.classList.add('realtime-player-hp');
        playernode.hpbar.classList.add('realtime-player-hpbar');
        playernode.shield.classList.add('realtime-player-shield');
        playernode.shieldbar.classList.add('realtime-player-shieldbar');
        playernode.kills.classList.add('realtime-player-kills');
        playernode.assists.classList.add('realtime-player-assists');
        playernode.damage_dealt.classList.add('realtime-player-damage-dealt');
        playernode.damage_taken.classList.add('realtime-player-damage-taken');

        /* set initial text */
        playernode.hp.innerText = 'HP:';
        playernode.shield.innerText = '🛡:';
        playernode.character.innerText = '';
        playernode.kills.innerText = 'kills:0';
        playernode.assists.innerText = 'assists:0';
        playernode.damage_dealt.innerText = 'dealt:0';
        playernode.damage_taken.innerText = 'taken:0';

        /* set canvas size */
        playernode.hpbar.width = 1;
        playernode.hpbar.height = 1;
        playernode.shieldbar.width = 1;
        playernode.shieldbar.height = 1;

        /* set click callback */
        playernode.base.addEventListener('click', (ev) => {
            if (playernode.base.classList.contains('realtime-player-state-alive')) {
                if (typeof(this.#callback) == "function") {
                    this.#callback(teamid, playerid);
                }
            }
        });

        /* set animation clear */
        playernode.base.addEventListener('animationend', (ev) => {
            if (ev.animationName == 'realtime-player-changed-damage-dealt-animation') {
                playernode.base.classList.remove('realtime-player-changed-damage-dealt');
            }
        });

        return playernode;
    }

    #appendTeamNode(teamid) {
        const teamnode = this.#generateTeamNode(teamid);
        this.#nodes.push(teamnode);
        this.#basenode.appendChild(teamnode.base);
    }

    #appendPlayerNode(teamid, playerid) {
        const playernode = this.#generatePlayerNode(teamid, playerid);
        this.#nodes[teamid].players.push(playernode);
        this.#nodes[teamid].base.appendChild(playernode.base);
    }

    #getDateString(timestamp) {
        if (timestamp == 0) return 'none';
        return (new Date(timestamp)).toLocaleString();
    }

    drawGameInfo() {
        if (this.#_game == null) return;
        this.#gameinfonodes.datacenter.innerText = 'datacenter:' + this.#_game.datacenter;
        this.#gameinfonodes.aimassiston.innerText = 'aimassiston:' + this.#_game.aimassiston;
        this.#gameinfonodes.anonymousmode.innerText = 'anonymousmode:' + this.#_game.anonymousmode;
        this.#gameinfonodes.serverid.innerText = 'serverid:' + this.#_game.serverid;
        this.#gameinfonodes.state.innerText = 'state:' + this.#_game.state;
        this.#gameinfonodes.start.innerText = 'start:' + this.#getDateString(this.#_game.start);
        this.#gameinfonodes.end.innerText = 'end:' + this.#getDateString(this.#_game.end);
        this.#gameinfonodes.map.innerText = 'map:' + this.#_game.map;
        // this.#gameinfonodes.playlistname.innerText = 'playlistname:' + this.#_game.playlistname;
        // this.#gameinfonodes.playlistdesc.innerText = 'playlistdesc:' + this.#_game.playlistdesc;
    }

    drawTeamName(teamid) {
        this.#precheckTeamID(teamid);
        if (teamid < this.#_game.teams.length) {
            const team = this.#_game.teams[teamid];
            let name = '';
            if ('params' in team && 'name' in team.params) {
                name = team.params.name;
            } else if ('name' in team) {
                name = team.name;
            }
            if (name != '') {
                this.#nodes[teamid].name.innerText = name;
                return true;
            }
        }
        return false;
    }

    drawTeamKills(teamid) {
        this.#precheckTeamID(teamid);
        if (teamid < this.#_game.teams.length) {
            const team = this.#_game.teams[teamid];
            if ('kills' in team) {
                this.#nodes[teamid].kills_value.innerText = team.kills;
                return true;
            }
        }
        return false;
    }

    drawTeamPlacement(teamid) {
        this.#precheckTeamID(teamid);
        if (teamid < this.#_game.teams.length) {
            const team = this.#_game.teams[teamid];
            if ('placement' in team) {
                this.#nodes[teamid].placement_value.innerText = team.placement;
                return true;
            }
        }
        return false;
    }
    
    drawTeamEliminated(teamid) {
        this.#precheckTeamID(teamid);
        if (teamid < this.#_game.teams.length) {
            const team = this.#_game.teams[teamid];
            if ('eliminated' in team) {
                if (team.eliminated) {
                    this.#nodes[teamid].base.classList.add('realtime-team-eliminated');
                } else {
                    this.#nodes[teamid].base.classList.remove('realtime-team-eliminated');
                }
                return true;
            }
        }
        return false;
    }

    drawTeam(teamid) {
        if (drawTeamName(teamid) &&
        drawTeamKills(teamid) &&
        drawTeamPlacement(teamid)) {
            return true;
        }
        return false;
    }

    static PLAYERNODE_NAME = 0x00;
    static PLAYERNODE_CHARACTER = 0x01;
    static PLAYERNODE_HP = 0x02;
    static PLAYERNODE_SHIELD = 0x03;
    static PLAYERNODE_KILLS = 0x04;
    static PLAYERNODE_ASSISTS = 0x05;
    static PLAYERNODE_DAMAGE_DEALT = 0x06;
    static PLAYERNODE_DAMAGE_TAKEN = 0x07;
    static PLAYERNODE_STATE = 0x08;
    static PLAYERNODE_SELECTED = 0x09;

    drawPlayerNode(teamid, playerid, nodetype = RealtimeView.PLAYERNODE_NAME) {
        this.#precheckTeamID(teamid);
        this.#precheckPlayerID(teamid, playerid);
        if (teamid >= this.#_game.teams.length) return false;
        if (playerid >= this.#_game.teams[teamid].length) return false;
        const player = this.#_game.teams[teamid].players[playerid];
        switch(nodetype) {
            case RealtimeView.PLAYERNODE_NAME: {
                const node = this.#nodes[teamid].players[playerid].name;
                this.#playersnamenode[player.hash] = node;
                if ('params' in player && 'name' in player.params) {
                    node.innerText = player.params.name;
                    return true;
                } else if ('name' in player) {
                    node.innerText = player.name;
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_CHARACTER: {
                const node = this.#nodes[teamid].players[playerid].character;
                if ('character' in player) {
                    node.innerText = player.character;
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_HP: {
                const node = this.#nodes[teamid].players[playerid].hpbar;
                if ('hp' in player && 'hp_max' in player) {
                    // node.innerText = 'HP:' + player.hp + '/' + player.hp_max;
                    this.#drawBarHP(node, player.hp, player.hp_max);
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_SHIELD: {
                const node = this.#nodes[teamid].players[playerid].shieldbar;
                if ('shield' in player && 'shield_max' in player) {
                    let gold = false;
                    if ('items' in player && 'bodyshield' in player.items && player.items.bodyshield == 4) gold = true;
                    this.#drawBarShield(node, player.shield, player.shield_max, gold);
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_KILLS: {
                const node = this.#nodes[teamid].players[playerid].kills;
                if ('kills' in player) {
                    node.innerText = 'kills:' + player.kills;
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_ASSISTS: {
                const node = this.#nodes[teamid].players[playerid].assists;
                if ('assists' in player) {
                    node.innerText = 'assists:' + player.assists;
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_DAMAGE_DEALT: {
                const node = this.#nodes[teamid].players[playerid].damage_dealt;
                if ('damage_dealt' in player) {
                    if (player.damage_dealt > 0 && node.innerText != ('dealt:' + player.damage_dealt)) {
                        // 背景色を変えるアニメーションをつける
                        this.#nodes[teamid].players[playerid].base.classList.remove('realtime-player-changed-damage-dealt');
                        this.#nodes[teamid].players[playerid].base.offsetWidth;
                        this.#nodes[teamid].players[playerid].base.classList.add('realtime-player-changed-damage-dealt');
                    }
                    node.innerText = 'dealt:' + player.damage_dealt;
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_DAMAGE_TAKEN: {
                const node = this.#nodes[teamid].players[playerid].damage_taken;
                if ('damage_taken' in player) {
                    node.innerText = 'taken:' + player.damage_taken;
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_STATE: {
                const node = this.#nodes[teamid].players[playerid].base;
                if ('state' in player) {
                    if (player.state == ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_DOWN) {
                        node.classList.remove('realtime-player-state-alive');
                        node.classList.add('realtime-player-state-down');
                        node.classList.remove('realtime-player-state-killed');
                        node.classList.remove('realtime-player-state-collected');
                    } else if (player.state == ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_KILLED) {
                        node.classList.remove('realtime-player-state-alive');
                        node.classList.remove('realtime-player-state-down');
                        node.classList.add('realtime-player-state-killed');
                        node.classList.remove('realtime-player-state-collected');
                    } else if (player.state == ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_COLLECTED) {
                        node.classList.remove('realtime-player-state-alive');
                        node.classList.remove('realtime-player-state-down');
                        node.classList.remove('realtime-player-state-killed');
                        node.classList.add('realtime-player-state-collected');
                    } else {
                        node.classList.add('realtime-player-state-alive');
                        node.classList.remove('realtime-player-state-down');
                        node.classList.remove('realtime-player-state-killed');
                        node.classList.remove('realtime-player-state-collected');
                    }
                    return true;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_SELECTED: {
                const node = this.#nodes[teamid].players[playerid].base;
                for (const t of document.querySelectorAll('.realtime-player-selected')) {
                    t.classList.remove('realtime-player-selected');
                }
                node.classList.add('realtime-player-selected');
                break;
            }
        }
        return false;
    }

    redrawPlayerName(hash, params) {
        if (hash in this.#playersnamenode) {
            const namenode = this.#playersnamenode[hash];
            if ('name' in params && params.name != '') {
                namenode.innerText = params.name;
            }
        }
    }

    drawPlayer(teamid, playerid) {
        let result = true;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_NAME)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_CHARACTER)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_HP)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_SHIELD)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_KILLS)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_ASSISTS)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_DAMAGE_DEALT)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_DAMAGE_TAKEN)) result = false;
        if (!drawPlayerNode(teamid, playerid, PLAYERNODE_STATE)) result = false;
        return result;
    }

    setGame(game) {
        this.#_game = game;
        this.drawGameInfo();
    }

    clear() {
        this.#basenode.innerHTML = '';
        this.#nodes.splice(0);
        for (const key in this.#playersnamenode) {
            delete this.#playersnamenode[key];
        }
    }

    setPlayerClickCallback(func) {
        this.#callback = func;
    }
}

class ResultView {
    #_game;
    #_results;
    #tournamentparams;
    #info;
    #all;
    #left;
    #right;
    #single;
    #nodes;
    #infonodes;
    #teams; // params保存用
    #players; // params保存用
    #current;
    #callback;
    #unknownidcallback;
    static points_table = [12, 9, 7, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1];

    constructor() {
        this.#info = document.getElementById('result-game-info');
        this.#all = document.getElementById('result-all-base');
        this.#left = document.getElementById('result-all-left');
        this.#right = document.getElementById('result-all-right');
        this.#single = document.getElementById('result-single');
        this.#tournamentparams = {};
        this.#nodes = [];
        this.#infonodes = [];
        this.#_game = null;
        this.#_results = null;
        this.#teams = {};
        this.#players = {};
        this.#current = "all";
        this.#callback = null;
        this.#unknownidcallback = null;
        this.clear();
    }
    
    #generateGameInfoNode(gameid) {
        const node = {
            base: document.createElement('div'),
            gamenumber: document.createElement('div'),
            datacenter: document.createElement('div'),
            serverid: document.createElement('div'),
            playlistname: document.createElement('div'),
            playlistdesc: document.createElement('div'),
            map: document.createElement('div'),
            start: document.createElement('div'),
            end: document.createElement('div'),
            anonymousmode: document.createElement('div'),
            aimassiston: document.createElement('div')
        }

        /* append */
        node.base.appendChild(node.gamenumber);
        node.base.appendChild(node.datacenter);
        node.base.appendChild(node.serverid);
        // node.base.appendChild(node.playlistname);
        // node.base.appendChild(node.playlistdesc);
        node.base.appendChild(node.map);
        node.base.appendChild(node.start);
        node.base.appendChild(node.end);
        node.base.appendChild(node.anonymousmode);
        node.base.appendChild(node.aimassiston);

        /* class */
        node.gamenumber.classList.add('result-game-info-number');

        /* callback */
        node.base.addEventListener('click', () => {
            if (typeof(this.#callback) == 'function') {
                this.#callback(gameid);
            }
        });

        return node;
    }

    #generateTeamNodeForAll() {
        const node = {
            base: document.createElement('div'),
            banner: document.createElement('div'),
            rank: document.createElement('div'),
            name: document.createElement('div'),
            placement: document.createElement('div'),
            placement_label: document.createElement('div'),
            placement_value: document.createElement('div'),
            kills: document.createElement('div'),
            kills_label: document.createElement('div'),
            kills_value: document.createElement('div'),
            points: document.createElement('div'),
            points_label: document.createElement('div'),
            points_value: document.createElement('div'),
        }

        /* append */
        node.base.appendChild(node.banner);
        node.banner.appendChild(node.rank);
        node.banner.appendChild(node.name);
        node.banner.appendChild(node.placement);
        node.banner.appendChild(node.kills);
        node.banner.appendChild(node.points);
        node.placement.appendChild(node.placement_label);
        node.placement.appendChild(node.placement_value);
        node.kills.appendChild(node.kills_label);
        node.kills.appendChild(node.kills_value);
        node.points.appendChild(node.points_label);
        node.points.appendChild(node.points_value);

        /* set class */
        node.base.classList.add('result-all-team-base');
        node.banner.classList.add('result-all-team-banner');
        node.rank.classList.add('result-all-team-rank');
        node.name.classList.add('result-all-team-name');
        node.placement.classList.add('result-all-team-placement');
        node.placement_label.classList.add('result-all-team-placement-label');
        node.kills.classList.add('result-all-team-kills');
        node.kills_label.classList.add('result-all-team-kills-label');
        node.points.classList.add('result-all-team-points');
        node.points_label.classList.add('result-all-team-kills-label');
        return node;
    }

    #drawTeamForAll(rank, total, team, placement = null) {
        // 要素が足りてなかったら埋める
        if (rank >= this.#nodes.length) {
            for (let i = this.#nodes.length; i <= rank; ++i) {
                const node = this.#generateTeamNodeForAll();
                this.#nodes.push(node);
                if (i < (total / 2)) {
                    this.#left.appendChild(node.base);
                } else {
                    this.#right.appendChild(node.base);
                }
            }
        }

        // テキスト設定
        const node = this.#nodes[rank];
        const kills = team.kills.reduce((a, c) => a + c, 0);
        const kill_points = team.kill_points.reduce((a, c) => a + c, 0);
        const placement_points = team.placement_points.reduce((a, c) => a + c, 0);
        node.rank.innerText = team.rank + 1;
        node.name.innerText = this.#getTeamName(team.id, team.name);
        node.placement_label.innerText = 'PP';
        node.placement_value.innerText = placement_points;
        if (placement != null) {
            node.placement_value.innerHTML += '<span>(' + placement + ')</span>';
        }
        node.kills_label.innerText = 'KP';
        node.kills_value.innerText = kill_points;
        if (kills != kill_points) {
            node.kills_value.innerHTML += '<span>(' + kills + ')</span>';
        }
        node.points_value.innerText = team.total_points;
        node.points_label.innerText = 'TOTAL';

        // 更新用に登録
        this.#saveTeamNode(team.id, node.name);
    }

    #generateTeamNodeForSingle() {
        const node = {
            base: document.createElement('div'),
            banner: document.createElement('div'),
            name: document.createElement('div'),
            placement: document.createElement('div'),
            placement_label: document.createElement('div'),
            placement_value: document.createElement('div'),
            kills: document.createElement('div'),
            kills_label: document.createElement('div'),
            kills_value: document.createElement('div'),
            points: document.createElement('div'),
            points_label: document.createElement('div'),
            points_value: document.createElement('div')
        }

        /* append */
        node.base.appendChild(node.banner);
        node.banner.appendChild(node.name);
        node.banner.appendChild(node.placement);
        node.banner.appendChild(node.kills);
        node.banner.appendChild(node.points);
        node.placement.appendChild(node.placement_label);
        node.placement.appendChild(node.placement_value);
        node.kills.appendChild(node.kills_label);
        node.kills.appendChild(node.kills_value);
        node.points.appendChild(node.points_label);
        node.points.appendChild(node.points_value);

        /* set class */
        node.base.classList.add('result-single-team-base');
        node.banner.classList.add('result-single-team-banner');
        node.name.classList.add('result-single-team-name');
        node.placement.classList.add('result-single-team-placement');
        node.placement_label.classList.add('result-single-team-placement-label');
        node.placement_value.classList.add('result-single-team-placement-value');
        node.kills.classList.add('result-single-team-kills');
        node.kills_label.classList.add('result-single-team-kills-label');
        node.kills_value.classList.add('result-single-team-kills-value');
        node.points.classList.add('result-single-team-points');
        node.points_label.classList.add('result-single-team-points-label');
        node.points_value.classList.add('result-single-team-points-value');

        /* set text */
        node.placement_label.innerText = 'place';
        node.kills_label.innerText = 'kills';
        node.points_label.innerText = 'points';
        return node;
    }

    #generatePlayerLabelNodeForSingle() {
        const node = {
            base: document.createElement('div'),
            name: document.createElement('div'),
            character: document.createElement('div'),
            kills: document.createElement('div'),
            assists: document.createElement('div'),
            damage: document.createElement('div')
        }

        /* append */
        node.base.appendChild(node.name);
        node.base.appendChild(node.character);
        node.base.appendChild(node.kills);
        node.base.appendChild(node.assists);
        node.base.appendChild(node.damage);

        /* set class */
        node.base.classList.add('result-single-player-label-base');
        node.name.classList.add('result-single-player-label-name');
        node.character.classList.add('result-single-player-label-character');
        node.kills.classList.add('result-single-player-label-kills');
        node.assists.classList.add('result-single-player-label-assists');
        node.damage.classList.add('result-single-player-label-damage');

        /* set text */
        node.name.innerText = 'name';
        node.character.innerText = 'CH';
        node.kills.innerText = 'K';
        node.assists.innerText = 'A';
        node.damage.innerText = 'DMG';

        return node;
    }

    #generatePlayerNodeForSingle() {
        const node = {
            base: document.createElement('div'),
            name: document.createElement('div'),
            character: document.createElement('div'),
            kills: document.createElement('div'),
            assists: document.createElement('div'),
            damage: document.createElement('div')
        }

        /* append */
        node.base.appendChild(node.name);
        node.base.appendChild(node.character);
        node.base.appendChild(node.kills);
        node.base.appendChild(node.assists);
        node.base.appendChild(node.damage);

        /* set class */
        node.base.classList.add('result-single-player-base');
        node.name.classList.add('result-single-player-name');
        node.character.classList.add('result-single-player-character');
        node.kills.classList.add('result-single-player-kills');
        node.assists.classList.add('result-single-player-assists');
        node.damage.classList.add('result-single-player-damage');

        return node;
    }

    #drawResult(gameid) {
        if (gameid >= this.#_results.length) return;
        const result = this.#_results[gameid];

        for (const [teamidstr, data] of Object.entries(result.teams)) {
            const teamid = parseInt(teamidstr, 10);
            const teamnode = this.#generateTeamNodeForSingle();
            
            // テキスト設定
            teamnode.name.innerText = this.#getTeamName(teamid, data.name);
            teamnode.placement_value.innerText = data.placement;
            teamnode.kills_value.innerText = data.kills;
            teamnode.points_value.innerText = data.kills + (data.placement - 1 < 15 ? ResultView.points_table[data.placement - 1] : 0);

            // ラベル
            const playerlabelnode = this.#generatePlayerLabelNodeForSingle();
            teamnode.base.appendChild(playerlabelnode.base);

            for (const player of data.players) {
                const playernode = this.#generatePlayerNodeForSingle();
                teamnode.base.appendChild(playernode.base);

                // テキスト設定
                playernode.name.innerText = this.#getPlayerName(player.id, player.name);
                playernode.character.innerText = player.character;
                playernode.kills.innerText = player.kills;
                playernode.assists.innerText = player.assists;
                playernode.damage.innerText = player.damage_dealt;

                // 更新用に登録
                this.#savePlayerNode(player.id, playernode.name);
            }
            // 更新用に登録
            this.#saveTeamNode(teamid, teamnode.name);

            this.#single.appendChild(teamnode.base);
        }
    }

    #drawGameInfo() {
        // infonodesの数を調整
        if (this.#infonodes.length > this.#_results.length) {
            // 削除
            for (let i = this.#infonodes.length; i <= this.#_results.length; --i) {
                this.#infonodes.pop(); // 最後の要素を削除
                this.#info.removeChild(this.#info.lastChild()); // 最後の要素を削除
            }
        } else if (this.#infonodes.length < this.#_results.length) {
            // 追加
            for (let i = this.#infonodes.length; i < this.#_results.length; ++i) {
                const node = this.#generateGameInfoNode(i);
                this.#infonodes.push(node);
                this.#info.appendChild(node.base);
            }
        }
        
        // テキスト設定
        for (let i = 0; i < this.#_results.length; ++i) {
            const result = this.#_results[i];
            const node = this.#infonodes[i];
            node.gamenumber.innerText = 'Game ' + (i + 1);
            node.datacenter.innerText = 'datacenter: ' + result.datacenter;
            node.serverid.innerText = 'serverid: '+ result.serverid;
            node.playlistname.innerText = 'playlistname: ' + result.playlistname;
            node.playlistdesc.innerText = 'playlistdesc: ' + result.playlistdesc;
            node.map.innerText = 'map: ' + result.map;
            node.start.innerText = 'start: ' + (new Date(result.start)).toLocaleString();
            node.end.innerText = 'end: ' + (new Date(result.end)).toLocaleString();
            node.anonymousmode.innerText = 'anonymousmode: ' + (result.anonymousmode ? 'true' : 'false');
            node.aimassiston.innerText = 'aimassiston: ' + (result.aimassiston ? 'true' : 'false');
        }
    }

    #drawResults(target) {
        // 計算用
        let data;

        // 過去のゲームのポイントを加算
        if (target == 'all') {
            data = resultsToTeamResults(this.#_results);
        } else if (typeof target == 'number') {
            if (target < this.#_results.length) {
                const results = [this.#_results[target]];
                data = resultsToTeamResults(results);
            } else {
                return;
            }
        } else {
            return;
        }

        // ポイントを計算して追加
        for (const [_, team] of Object.entries(data)) {
            for (let i = 0; i < team.kills.length; ++i) {
                let points;
                if (target == 'all') {
                    points = calcPoints(i, team.placements[i], team.kills[i], this.#tournamentparams);
                } else {
                    points = calcPoints(target, team.placements[i], team.kills[i], this.#tournamentparams);
                }
                team.points.push(points.total);
                team.kill_points.push(points.kills);
                team.placement_points.push(points.placement);
                team.other_points.push(points.other);
            }
            team.total_points = team.points.reduce((a, c) => a + c, 0);
        }

        // results -> table
        const p = setRankParameterToTeamResults(data);

        // 表示
        for (let i = 0; i < p.length; ++i) {
            const teamid = p[i];
            const team = data[teamid];
            
            // 描画
            if (target == 'all') {
                this.#drawTeamForAll(i, p.length, team);
            } else {
                this.#drawTeamForAll(i, p.length, team, this.#_results[target].teams[p[i]].placement);
            }
        }
    }

    #selectCurrentGame(gameid) {
        if (gameid < this.#infonodes.length) {
            const node = this.#infonodes[gameid];
            node.base.classList.add('result-game-info-selected');
        }
    }

    #clearCurrentGame() {
        for(const node of document.querySelectorAll('.result-game-info-selected')) {
            node.classList.remove('result-game-info-selected');
        }
    }

    #getTeamName(id, fallback) {
        if (typeof(id) == 'number') id = id.toString();
        if (!(id in this.#teams)) return fallback;
        const team = this.#teams[id];
        if (!('params' in team)) return fallback;
        if (!('name' in team.params)) return fallback;
        return team.params.name;
    }

    #getPlayerName(id, fallback) {
        if (id in this.#players) {
            const player = this.#players[id];
            if ('params' in player && 'name' in player.params && player.params.name != '') {
                return player.params.name;
            }
        } else {
            if (typeof(this.#unknownidcallback) == 'function') {
                this.#unknownidcallback(id);
            }
        }
        return fallback;
    }

    #savePlayerNode(id, node) {
        if (!(id in this.#players)) {
            this.#players[id] = {
                nodes: [],
            };
        }
        const player = this.#players[id];
        player.nodes.push(node);
    }

    savePlayerParams(id, params) {
        if (!(id in this.#players)) {
            this.#players[id] = {
                nodes: [],
            };
        }
        const player = this.#players[id];
        player.params = params;
        for (const node of player.nodes) {
            if ('name' in player.params) {
                node.innerText = player.params.name;
            }
        }
    }

    #saveTeamNode(id, node) {
        if (typeof(id) == 'number') id = id.toString();
        if (!(id in this.#teams)) {
            this.#teams[id] = {
                nodes: [],
            };
        }
        const team = this.#teams[id];
        if (team.nodes.indexOf(node) != -1) return;
        team.nodes.push(node);
    }

    /**
     * 表示用にチームparamsを保存・必要に応じて要素を更新する
     * @param {number|string} id チームID(0～)
     * @param {object} params チームparams
     */
    saveTeamParams(id, params) {
        if (!(id in this.#teams)) {
            this.#teams[id] = {
                nodes: [],
            };
        }
        const team = this.#teams[id];
        team.params = params;
        if ('name' in team.params) {
            for (const node of team.nodes) {
                    node.innerText = team.params.name;
            }
        }
    }

    clear() {
        this.#info.innerHTML = '';
        this.#left.innerHTML = '';
        this.#right.innerHTML = '';
        this.#single.innerHTML = '';
        this.#nodes.splice(0);
        this.#infonodes.splice(0);
        for (const [playerid, data] of Object.entries(this.#players)) {
            data.nodes.splice(0);
        }
        for (const [teamid, data] of Object.entries(this.#teams)) {
            data.nodes.splice(0);
        }
    }

    #hideSingleGameResult() {
        this.#single.classList.add('hide');
    }

    showSingleGameResult(gameid) {
        this.#current = gameid;

        // 内容表示
        this.clear();
        if (this.#_results != null) {
            this.#drawGameInfo();
            this.#clearCurrentGame();
            this.#selectCurrentGame(gameid);
            this.#drawResults(gameid);
            this.#drawResult(gameid);
        }

        // 表示切替
        this.#single.classList.remove('hide');
    }

    showAllResults() {
        this.#current = 'all';

        // 内容表示
        this.clear();
        if (this.#_results != null) {
            this.#drawGameInfo();
            this.#clearCurrentGame();
            this.#drawResults('all');
        }

        // 表示切替
        this.#hideSingleGameResult();
    }
    
    setResults(results) {
        this.#_results = results;
        if (this.#current == 'all') {
            this.showAllResults();
        } else {
            this.showSingleGameResult(this.#current);
        }
    }

    setGame(game) {
        console.log(game);
        this.#_game = game;
    }

    /**
     * ポイント計算用にトーナメントのparamsをセットする
     * @param {object} params トーナメントparams
     */
    setTournamentParams(params) {
        this.#tournamentparams = params;
    }

    setGameClickCallback(func) {
        this.#callback = func;
    }
    setUnknownIDCallback(func) {
        this.#unknownidcallback = func;
    }
}

export class WebAPIConfig {
    #webapi;
    #_game;
    #webapiconnectionstatus;
    #liveapiconnectionstatus;
    #tournament_id;
    #tournament_name;
    #tournament_ids;
    #tournament_params;
    /** @type {Object.<string, object>} プレーヤーparamsの格納先 */
    #playerparams;
    /** @type {Object.<string, object>} チームparamsの格納先 */
    #teamparams;
    #realtimeview;
    #observerconfig;
    #playername;
    #teamname;
    #resultview;
    #firstproccurrenthash;

    constructor(url) {
        this.#tournament_id = "";
        this.#tournament_name = "noname";
        this.#tournament_ids = {};
        this.#tournament_params = {};
        this.#playerparams = {};
        this.#teamparams = {};
        this.#realtimeview = new RealtimeView();
        this.#observerconfig = new ObserverConfig();
        this.#resultview = new ResultView();
        this.#webapiconnectionstatus = new WebAPIConnectionStatus();
        this.#liveapiconnectionstatus = new LiveAPIConnectionStatus();
        this.#playername = new PlayerName();
        this.#teamname = new TeamName();
        this.#firstproccurrenthash = true;

        this.#setupWebAPI(url);
        this.#setupButton();
        this.#setupCallback();
        this.#setupMenuSelect();
        this.#setupLineNumber();
    }

    #setupWebAPI(url) {
        this.#webapi = new ApexWebAPI.ApexWebAPI(url);

        // 接続系
        this.#webapi.addEventListener('open', (ev) => {
            this.#_game = ev.detail.game;
            this.#realtimeview.setGame(ev.detail.game);
            this.#resultview.setGame(ev.detail.game);
            this.#webapiconnectionstatus.setStatus('open');

            /* 初回情報取得 */
            this.#webapi.getCurrentTournament();
            this.#webapi.getTournamentIDs();
            this.#webapi.getPlayers();
            this.#webapi.getAll();
            this.#webapi.getObserver();
            this.#webapi.getObservers();
            this.#webapi.sendGetLobbyPlayers();
            this.#webapi.getTournamentResults();
            this.#webapi.getTournamentParams();
            this.#getTeamNames();
        });

        this.#webapi.addEventListener('close', (ev) => {
            this.#webapiconnectionstatus.setStatus('close');
        });

        this.#webapi.addEventListener('error', (ev) => {
            this.#webapiconnectionstatus.setStatus('error');
        });

        /* 設定変更イベント */
        this.#webapi.addEventListener('getcurrenttournament', (ev) => {
            if (this.#firstproccurrenthash) {
                this.#procCurrentHash(location.hash);
                this.#firstproccurrenthash = false;
            }
            if (ev.detail.id != '' && this.#tournament_id != ev.detail.id) {
                // 現在のトーナメントIDが変わった場合
                this.#getTeamNames();
            }
            this.#tournament_id = ev.detail.id;
            this.#tournament_name = ev.detail.name;
            if (ev.detail.id == '') {
                this.#setCurrentTournament('none', 'noname');
                window.location.assign("#tournament-set");
            } else {
                this.#setCurrentTournament(ev.detail.id, ev.detail.name);
            }
            this.#updateResultMenuFromResultsCount(ev.detail.count);
        });

        this.#webapi.addEventListener('gettournamentids', (ev) => {
            this.#procTournamentIDs(event.detail.ids);
        });

        this.#webapi.addEventListener('settournamentname', (ev) => {
            this.#webapi.getCurrentTournament();
            this.#webapi.getTournamentIDs();
            this.#webapi.getTournamentResults();
            this.#webapi.getTournamentParams();
        });

        this.#webapi.addEventListener('renametournamentname', (ev) => {
            this.#webapi.getCurrentTournament();
            this.#webapi.getTournamentIDs();
        });

        this.#webapi.addEventListener('getplayers', (ev) => {
            for (const [hash, params] of Object.entries(ev.detail.players)) {
                this.#playerparams[hash] = params;
                this.#realtimeview.redrawPlayerName(hash, params); // RealtimeViewの再描画
                this.#resultview.savePlayerParams(hash, params); // ResultView用にも保存
                if ('name' in params) this.#playername.setName(hash, params.name);
                if ('ingamenames' in params) this.#playername.setInGameNames(hash, params.ingamenames);
            }
        });

        this.#webapi.addEventListener('lobbyplayer', (ev) => {
            this.#procPlayerInGameName(ev.detail.hash, ev.detail.name);
            if (ev.detail.observer) {
                this.#observerconfig.drawObserverName(ev.detail.hash, ev.detail.name);
            }
        });

        /* observer用 */
        this.#webapi.addEventListener('getobserver', (ev) => {
            this.#observerconfig.setCurrentObserver(ev.detail.hash); 
        });
        this.#webapi.addEventListener('getobservers', (ev) => {
            for (const observer of ev.detail.observers) {
                this.#observerconfig.drawObserverName(observer.hash, observer.name);
            }
        })

        /* realtime view 用 関連付け */
        this.#webapi.addEventListener('matchsetup', (ev) => {
            this.#realtimeview.drawGameInfo();
        })
        this.#webapi.addEventListener('gamestatechange', (ev) => {
            this.#realtimeview.drawGameInfo();
        })
        this.#webapi.addEventListener('clearlivedata', (ev) => {
            this.#_game = ev.detail.game;
            this.#realtimeview.setGame(ev.detail.game);
            this.#realtimeview.clear();
        });
        this.#webapi.addEventListener('teamname', (ev) => {
            this.#realtimeview.drawTeamName(ev.detail.team.id);
        });
        this.#webapi.addEventListener('playerstats', (ev) => {
            this.#realtimeview.drawTeamKills(ev.detail.team.id);
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_KILLS);
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_ASSISTS);
        });
        this.#webapi.addEventListener('squadeliminate', (ev) => {
            this.#realtimeview.drawTeamPlacement(ev.detail.team.id);
            this.#realtimeview.drawTeamEliminated(ev.detail.team.id);
        });
        this.#webapi.addEventListener('teamplacement', (ev) => {
            this.#realtimeview.drawTeamPlacement(ev.detail.team.id);
            this.#realtimeview.drawTeamEliminated(ev.detail.team.id);
        });
        this.#webapi.addEventListener('setteamparams', (ev) => {
            if (ev.detail.result) {
                const teamid = ev.detail.teamid;
                const params = ev.detail.params;
                this.#teamparams[teamid] = params;
                this.#resultview.saveTeamParams(teamid, params);
                if (teamid >= this.#_game.teams.length) return;
                if (!('name' in this.#_game.teams[teamid])) return;
                this.#realtimeview.drawTeamName(teamid);
            }
        });
        this.#webapi.addEventListener('getteamparams', (ev) => {
            const teamid = ev.detail.teamid;
            const params = ev.detail.params;
            this.#teamparams[teamid] = params;
            this.#resultview.saveTeamParams(teamid, params);
            if (teamid >= this.#_game.teams.length) return;
            if (!('name' in this.#_game.teams[teamid])) return;
            this.#realtimeview.drawTeamName(teamid);
        });
        this.#webapi.addEventListener('playername', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_NAME);
            this.#procPlayerInGameName(ev.detail.player.hash, ev.detail.player.name);
        });
        this.#webapi.addEventListener('playercharacter', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_CHARACTER);
        });
        this.#webapi.addEventListener('playerhp', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_HP);
        });
        this.#webapi.addEventListener('playershield', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_SHIELD);
        });
        this.#webapi.addEventListener('playerdamage', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_DAMAGE_DEALT);
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_DAMAGE_TAKEN);
        });
        this.#webapi.addEventListener('statealive', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_STATE);
        });
        this.#webapi.addEventListener('statedown', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_STATE);
        });
        this.#webapi.addEventListener('statekilled', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_STATE);
        });
        this.#webapi.addEventListener('statecollected', (ev) => {
            this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_STATE);
        });
        this.#webapi.addEventListener('observerswitch', (ev) => {
            if (ev.detail.own) {
                this.#realtimeview.drawPlayerNode(ev.detail.team.id, ev.detail.player.id, RealtimeView.PLAYERNODE_SELECTED);
            }
        });
        this.#webapi.addEventListener('playeritem', (ev) => {
        });

        /* result用 */
        this.#webapi.addEventListener('gettournamentresults', (ev) => {
            this.#resultview.setResults(ev.detail.results);
            this.#procPlayerInGameNameFromResults(ev.detail.results);
        });
        this.#webapi.addEventListener('saveresult', (ev) => {
            this.#webapi.getTournamentResults();
            this.#updateResultMenuFromResultsCount(ev.detail.gameid + 1);
        });

        this.#webapi.addEventListener('getplayerparams', (ev) => {
            const hash = ev.detail.hash;
            const params = ev.detail.params;
            this.#resultview.savePlayerParams(hash, params);
            this.#realtimeview.redrawPlayerName(hash, params); // RealtimeViewの再描画
            if ('name' in params) this.#playername.setName(hash, params.name);
            if ('ingamenames' in params) this.#playername.setInGameNames(hash, params.ingamenames);
        });

        this.#webapi.addEventListener('setplayerparams', (ev) => {
            if (ev.detail.result) {
                const hash = ev.detail.hash;
                const params = ev.detail.params;
                this.#resultview.savePlayerParams(hash, params);
                this.#realtimeview.redrawPlayerName(hash, params); // RealtimeViewの再描画
                if ('name' in params) this.#playername.setName(hash, params.name);
                if ('ingamenames' in params) this.#playername.setInGameNames(hash, params.ingamenames);
            }
        });

        /* Overlay用 */
        this.#webapi.addEventListener('gettournamentparams', (ev) => {
            this.#tournament_params = ev.detail.params;
            this.#setOverlayStatusFromParams(ev.detail.params);
            this.#resultview.setTournamentParams(ev.detail.params);
        });

        this.#webapi.addEventListener('settournamentparams', (ev) => {
            if (ev.detail.result) {
                this.#tournament_params = ev.detail.params;
                this.#setOverlayStatusFromParams(ev.detail.params);
                this.#resultview.setTournamentParams(ev.detail.params);
            }
        });

        /** LiveAPI側の接続状況を表示 */
        this.#webapi.addEventListener('liveapisocketstats', (ev) => {
            this.#liveapiconnectionstatus.setStatus(ev.detail.conn, ev.detail.recv, ev.detail.send);
        });
    }

    #setupButton() {

        document.getElementById('connectbtn').addEventListener('click', (ev) => {
            this.#webapiconnectionstatus.setStatus('connecting...');
            this.#webapi.forceReconnect();
        });

        document.getElementById('tournament-set-button').addEventListener('click', (ev) => {
            const text = document.getElementById('tournament-set-text').value;
            if (text != '') {
                this.#webapi.setTournamentName(text);
            }
        });

        document.getElementById('tournament-rename-button').addEventListener('click', (ev) => {
            const text = document.getElementById('tournament-rename-text').value;
            if (text != '' || this.#tournament_id != '') {
                this.#webapi.renameTournamentName(this.#tournament_id, text);
            }
        });

        document.getElementById('observer-set-getfromlobby').addEventListener('click', (ev) => {
            this.#webapi.sendGetLobbyPlayers().then((ev) => {}, () => {});
        });

        document.getElementById('player-name-getfromresults').addEventListener('click', (ev) => {
            this.#webapi.getTournamentResults();
        });

        document.getElementById('player-name-getfromlivedata').addEventListener('click', (ev) => {

        });

        document.getElementById('player-name-getfromlobby').addEventListener('click', (ev) => {
            this.#webapi.sendGetLobbyPlayers();
        });

        document.getElementById('team-name-button').addEventListener('click', (ev) => {
            this.#setTeamNames().then((arr) => {
                this.#updateTeamNameTextArea();
            });
        });

        document.getElementById('team-ingamename-button').addEventListener('click', (ev) => {
            this.#setInGameTeamNames().then((arr) => {
            });
        });

        document.getElementById('announce-button').addEventListener('click', (ev) => {
            const text = document.getElementById('announce-text').value;
            if (text != "") {
            this.#webapi.sendChat(text).then(() => {}, () => {});
            }
        });

        // checkbox
        for (const id of ["leaderboard", "teambanner", "playerbanner", "teamkills", "owneditems", "gameinfo", "championbanner", "squadeliminated", "tdmscoreboard"]) {
            document.getElementById('overlay-hide-' + id).addEventListener('change', (ev) => {
                this.#updateOverlayStatus(id);
                this.#webapi.setTournamentParams(this.#tournament_params);
            });
        }
        document.getElementById('overlay-hide-teamplayerinfo').addEventListener('change', (ev) => {
            const teamplayeroverlays = ["teambanner", "playerbanner", "teamkills", "owneditems"];
            for (const id of teamplayeroverlays) {
                document.getElementById('overlay-hide-' + id).checked = ev.target.checked;
                this.#updateOverlayStatus(id);
            }
            this.#webapi.setTournamentParams(this.#tournament_params);
        });

        // show/hide matchresult
        document.getElementById('overlay-show-matchresult').addEventListener('click', (ev) => {
            let checked = "all";
            for (const node of document.getElementsByName("overlay-result-radio")) {
                if (node.checked) checked = node.value;
            }
            if (checked == "all") {
                this.#webapi.broadcastObject({
                    type: "showmatchresult",
                    gameid: 0,
                    all: true
                });
            } else {
                const gameid = document.getElementById("overlay-show-one-result-number").value;
                this.#webapi.broadcastObject({
                    type: "showmatchresult",
                    gameid: parseInt(gameid, 10),
                    all: false
                });
            }
        });

        document.getElementById('overlay-hide-matchresult').addEventListener('click', (ev) => {
            this.#webapi.broadcastObject({
                type: "hidematchresult"
            });
        });

        // Test
        document.getElementById('test-show-leaderboard').addEventListener('click', (ev) => {

        });
        document.getElementById('test-show-teambanner').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-teambanner-teamid").value, 10);
            if (teamid >= 0) {
                this.#webapi.broadcastObject({
                    type: "testteambanner",
                    teamid: teamid
                });
            }
        });
        document.getElementById('test-show-playerbanner').addEventListener('click', (ev) => {
            const name = document.getElementById("test-playerbanner-name").value;
            if (name != "") {
                this.#webapi.broadcastObject({
                    type: "testplayerbanner",
                    name: name
                });
            }
        });
        document.getElementById('test-show-teamkills').addEventListener('click', (ev) => {
            const kills = parseInt(document.getElementById("test-teamkills-kills").value, 10);
            if (kills >= 0) {
                this.#webapi.broadcastObject({
                    type: "testteamkills",
                    kills: kills
                });
            }
        });
        document.getElementById('test-show-owneditems').addEventListener('click', (ev) => {
            const items = ["backpack", "knockdownshield", "syringe", "medkit", "shieldcell", "shieldbattery", "phoenixkit", "ultimateaccelerant", "thermitgrenade", "thermitgrenade", "arcstar"];
            const data = {type: "testowneditems"};
            for (const item of items) {
                const v = parseInt(document.getElementById("test-owneditems-" + item).value, 10);
                switch(item) {
                    case "backpack":
                    case "knockdownshield":
                        if (v < 0) return;
                        if (v > 4) return;
                        break;
                    default:
                        if (v < 0) return;
                        break;
                }
                data[item] = v;
            }
            this.#webapi.broadcastObject(data);
        });
        document.getElementById('test-show-gameinfo').addEventListener('click', (ev) => {
            const gameid = parseInt(document.getElementById("test-gameinfo-gameid").value, 10);
            if (gameid >= 0) {
                this.#webapi.broadcastObject({
                    type: "testgameinfo",
                    gameid: gameid
                });
            }
        });
        document.getElementById('test-show-squadeliminated').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-squadeliminated-teamid").value, 10);
            if (teamid >= 0) {
                this.#webapi.broadcastObject({
                    type: "testsquadeliminated",
                    teamid: teamid
                });
            }
        });
        document.getElementById('test-show-championbanner').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-championbanner-teamid").value, 10);
            if (teamid >= 0) {
                this.#webapi.broadcastObject({
                    type: "testchampionbanner",
                    teamid: teamid
                });
            }
        });
        document.getElementById('test-hideall').addEventListener('click', (ev) => {
            this.#webapi.broadcastObject({
                type: "testhideall"
            });
        });

        document.getElementById('test-setteamname').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-setteamname-teamid").value, 10);
            const teamname = document.getElementById("test-setteamname-teamname").value;
            if (teamname && teamname != "") {
                this.#webapi.sendSetTeamName(teamid, teamname);
            }
        });

        document.getElementById('test-pausetoggle').addEventListener('click', (ev) => {
            const pretimer = parseFloat(document.getElementById("test-pausetoggle-pretimer").value);
            if (0.0 < pretimer && pretimer < 10.0) {
                this.#webapi.pauseToggle(pretimer);
            }
        });
    }

    #setupCallback() {
        this.#observerconfig.setClickCallback((id) => {
            this.#webapi.setObserver(id).then((ev) => {
                this.#observerconfig.setCurrentObserver(ev.detail.hash).then(() => {}, () => {});
            }, () => {});
        });

        this.#realtimeview.setPlayerClickCallback((teamid, playerid) => {
            if (teamid >= this.#_game.teams.length) return;
            const team = this.#_game.teams[teamid];
            if (playerid >= team.players.length) return;
            const player = team.players[playerid];
            if (!('name' in player)) return;
            if (!('state' in player)) return;
            if (player.name == '') return;
            if (player.state != ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_ALIVE) return;
            this.#webapi.changeCamera(player.name).then(() => {}, () => {});
        });

        this.#resultview.setGameClickCallback((gameid) => {
            location.assign('#result-' + gameid);
        });
        
        this.#resultview.setUnknownIDCallback((playerhash) => {
            this.#webapi.getPlayerParams(playerhash);
        });

        this.#playername.setCallback((hash, name) => {
            const params = this.#playerparams[hash];
            params.name = name;
            this.#webapi.setPlayerParams(hash, params);
        });
    }

    #setupMenuSelect() {
        window.addEventListener("hashchange", (ev) => {
            this.#procCurrentHash(location.hash);
        });
    }

    #setupLineNumber() {
        const targets = [
            document.getElementById('team-name-num')
        ];
        let dst = '';
        for(let i = 0; i < 30; ++i) {
            if (dst != '') dst += '\r\n';
            dst += (i + 1);
        }
        for (const t of targets) {
            t.innerText = dst;
        }
    }

    #getFragment(s) {
        const first = s.indexOf('#');
        return first >= 0 ? s.substring(first + 1) : '';
    }
    #getMainMenu(s) {
        const first = s.indexOf('-');
        return first >= 0 ? s.substring(0, first) : s;
    }
    #getSubMenu(s) {
        const first = s.indexOf('-');
        return first >= 0 ? s.substring(first + 1) : '';
    }

    #procCurrentHash(hash) {
        const fragment = this.#getFragment(hash);
        const mainmenu = this.#getMainMenu(fragment);
        const submenu = this.#getSubMenu(fragment);

        if (this.#tournament_id == '' && ["realtime", "tournament-rename", "tournament-params", "team-name", "team-params", "overlay"].indexOf(fragment) >= 0) {
            window.location.assign("#tournament-set");
            return;
        }

        if (mainmenu == 'result') {
            for (const c of document.getElementById('main').children) {
                if (c.id == 'result') {
                    c.classList.remove('hide');
                } else {
                    c.classList.add('hide');
                }
            }
            this.#showResult(submenu);
        } else {
            for (const c of document.getElementById('main').children) {
                if (c.id == fragment) {
                    c.classList.remove('hide');
                } else {
                    c.classList.add('hide');
                }
            }
        }

        /* 選択表示 */
        for (const node of document.querySelectorAll('.sidebar-selected')) {
            node.classList.remove('sidebar-selected');
        }
        for (const node of document.querySelectorAll('a[href="#' + fragment + '"]')) {
            node.classList.add('sidebar-selected');
        }

        /* ページ遷移起因でのデータ取得 */
        if (fragment == 'observer-set') {
            this.#webapi.getObserver();
            this.#webapi.getObservers();
        }
    }

    #procTournamentIDs(ids) {
        const tbody = document.getElementById('tournamentids');
        for (const [id, name] of Object.entries(ids)) {
            if (id in this.#tournament_ids) {
                const c = this.#tournament_ids[id];
                c.name = name;
                c.node.children[0].innerText = name;
            } else {
                this.#tournament_ids[id] = {
                    id: id,
                    name: name,
                    node: document.createElement('tr')
                };
                const c = this.#tournament_ids[id];
                c.node.appendChild(document.createElement('td'));
                c.node.appendChild(document.createElement('td'));
                c.node.children[0].innerText = name;
                c.node.children[1].innerText = id;
                tbody.appendChild(c.node);
                c.node.addEventListener('click', (ev) => {
                    this.#webapi.setTournamentName(c.node.children[0].innerText);
                });
                if (id == this.#tournament_id) {
                    c.node.classList.add('tournament-set-selected');
                }
            }
        }
    }

    #setInGameTeamNames() {
        const lines = this.#teamname.getLines();
        const jobs = [];
        for (let i = 0; i < 30; ++i) {
            if (i < lines.length) {
                const line = lines[i];
                jobs.push(this.#webapi.sendSetTeamName(i, line));
            } else {
                jobs.push(this.#webapi.sendSetTeamName(i, ''));
            }
        }
        return new Promise((resolve, reject) => {
            Promise.all(jobs).then(resolve, reject);
        });
    }

    #setTeamNames() {
        const lines = this.#teamname.getLines();
        const jobs = [];
        for (let i = 0; i < 30; ++i) {
            if (i < lines.length) {
                const line = lines[i];
                const params = this.#teamparams[i];
                if (line != '') {
                    if (!('name' in params) || line != params.name) {
                        jobs.push(this.#setTeamName(i, line));
                    }
                } else {
                    if ('name' in params) {
                        jobs.push(this.#removeTeamName(i));
                    }
                }
            } else {
                if ('name' in params) {
                    jobs.push(this.#removeTeamName(i));
                }
            }
        }
        return new Promise((resolve, reject) => {
            Promise.all(jobs).then(resolve, reject);
        });
    }

    /**
     * プレイヤーのハッシュとインゲームの名前を処理
     * @param {string} hash プレイヤーID(hash)
     * @param {string} ingamename プレイヤー名
     */
    #procPlayerInGameName(hash, ingamename) {
        let updated = false;
        if (!(hash in this.#playerparams)) {
            this.#playerparams[hash] = {};
        }
        const params = this.#playerparams[hash];
        if (!('ingamenames' in params)) {
            params.ingamenames = [];
        }
        if (params.ingamenames.indexOf(ingamename) == -1) {
            params.ingamenames.push(ingamename);
            updated = true;
        }
        if (updated) {
            // プレイヤーのパラメータを更新
            this.#webapi.setPlayerParams(hash, params);
        }
    }

    /**
     * リザルト配列からプレーヤーのハッシュとインゲームの名前を処理する
     * @param {object[]} results リザルト配列
     */
    #procPlayerInGameNameFromResults(results) {
        for (const result of results) {
            for (const [_, team] of Object.entries(result.teams)) {
                for (const player of team.players) {
                    this.#procPlayerInGameName(player.id, player.name);
                }
            }
        }
    }

    /**
     * オーバーレイの表示/非表示パラメータをトーナメントparamsに設定
     * @param {string} id オーバーレイの名前
     */
    #updateOverlayStatus(id) {
        const params = this.#tournament_params;
        const checked = document.getElementById('overlay-hide-' + id).checked;
        if (!'forcehide' in params) params.forcehide = {};
        const forcehide = params.forcehide;
        forcehide[id] = checked;
    }

    /**
     * トーナメントのparamsに含まれるパラメータからオーバーレイの強制非表示チェック状態を設定する
     * @param {object} params トーナメントparams
     */
    #setOverlayStatusFromParams(params) {
        if (!('forcehide' in params)) params.forcehide = {};
        const forcehide = params.forcehide;
        const ids = ["leaderboard", "teambanner", "playerbanner", "teamkills", "owneditems", "gameinfo", "championbanner", "squadeliminated", "tdmscoreboard"];
        for (const id of ids) {
            if (!(id in forcehide)) forcehide[id] = false;
            document.getElementById('overlay-hide-' + id).checked = forcehide[id];
        }

        // group [teamplayerinfo]
        if (forcehide.teambanner == forcehide.playerbanner &&
            forcehide.teambanner == forcehide.teamkills &&
            forcehide.teambanner == forcehide.owneditems) {
                document.getElementById('overlay-hide-teamplayerinfo').checked = forcehide.teambanner;
        }
    }

    /**
     * チーム用のparamsを取得し、nameキーに名前を設定して保存する
     * @param {number} teamid チームID(0～)
     * @param {string} name チーム名
     * @returns チーム用params
     */
    #setTeamName(teamid, name) {
        const params = this.#teamparams[teamid];
        params.name = name;
        return this.#webapi.setTeamParams(teamid, params);
    }

    /**
     * チーム用のparamsを取得し、nameキーを削除して保存する
     * @param {number} teamid チームID(0～)
     * @returns {Promise} チーム用params
     */
    #removeTeamName(teamid) {
        const params = this.#teamparams[teamid];
        if ('name' in params) delete params.name;
        return this.#webapi.setTeamParams(teamid, params);
    }

    /**
     * 0～29のチームparamsを取得する
     * @returns {object[]} チームのparamsが入った配列
     */
    #getAllTeamParams() {
        return new Promise((resolve, reject) => {
            const jobs = [];
            for (let i = 0; i < 30; ++i) {
                jobs.push(new Promise((nresolve, nreject) => {
                    return this.#webapi.getTeamParams(i).then((ev) => {
                        nresolve(ev.detail.params);
                    }, nreject);
                }));
            }
            Promise.all(jobs).then(resolve, reject);
        });
    }

    /**
     * チーム用のパラメータを取得してテキストエリアに反映する
     */
    #getTeamNames() {
        this.#getAllTeamParams().then((arr) => { this.#updateTeamNameTextArea(); }, () => {});
    }

    /**
     * チームのparamsからチーム名を取り出しtextareaに設定する
     */
    #updateTeamNameTextArea() {
        let text = '';
        for (const params of Object.values(this.#teamparams)) {
            if (text != '') text += '\r\n';
            if ('name' in params) {
                text += params.name;
            }
        }
        this.#teamname.updateText(text);
    }

    /**
     * リザルトを表示する
     * @param {string} submenu 'all'もしくは数字の文字列(1～)
     */
    #showResult(submenu) {
        if (submenu == 'all') {
            this.#resultview.showAllResults();
        } else {
            const gameid = parseInt(submenu, 10);
            if (submenu == gameid.toString()) {
                this.#resultview.showSingleGameResult(gameid);
            }
        }
    }

    /**
     * 現在のトーナメントの選択状況を設定する
     * @param {string} id トーナメントのID
     * @param {string} name トーナメントの名前
     */
    #setCurrentTournament(id, name) {
        document.getElementById('current_tournament_id').innerText = id;
        document.getElementById('current_tournament_name').innerText = name;
        document.getElementById('tournament-rename-text').value = name;
        for (const tr of document.querySelectorAll('tr.tournament-set-selected')) {
            tr.classList.remove('tournament-set-selected');
        }
        if (id != '' && id in this.#tournament_ids) {
            this.#tournament_ids[id].node.classList.add('tournament-set-selected');
        }
    }

    /**
     * リザルト数から左メニューのリザルトリンクを作成する
     * @param {number} count リザルト数(0～)
     */
    #updateResultMenuFromResultsCount(count) {
        const ul = document.getElementById('ulresult');
        if (count + 1 > ul.children.length) {
            // append
            for (let i = ul.children.length - 1; i < count; ++i) {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = '#result-' + i;
                a.innerText = "Game " + (i + 1);
                li.appendChild(a);
                ul.appendChild(li);

                // クラス設定
                if (this.#getFragment(location.hash) == ('result-' + i)) {
                    a.classList.add('sidebar-selected');
                }
            }
        } else if (count + 1 < ul.children.length) {
            // remove
            while (count + 1 < ul.children.length) {
                ul.removeChild(ul.lastChild);
            }
        }
    }
}
