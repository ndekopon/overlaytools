// @ts-check
import * as ApexWebAPI from "./apex-webapi.js";
import {
    calcPoints,
    OverlayBase,
    appendToTeamResults,
    htmlToElement,
    resultsToTeamResults,
    setRankParameterToTeamResults,
    getAdvancePoints,
} from "./overlay-common.js";


/** @param {string} s */
function getFragment(s) {
    const first = s.indexOf('#');
    return first >= 0 ? s.substring(first + 1) : '';
}

/** @param {string} s */
function getMainMenu(s) {
    const first = s.indexOf('-');
    return first >= 0 ? s.substring(0, first) : s;
}

/** @param {string} s */
function getSubMenu(s) {
    const first = s.indexOf('-');
    return first >= 0 ? s.substring(first + 1) : '';
}

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

class WebAPIConnectionStatusView {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;

        document.getElementById('connectbtn').addEventListener('click', (ev) => {
            this.setWebAPIConnectionStatus('connecting...');
            handler.getWebAPI().forceReconnect();
        });
    }

    /** @param {string} state */
    setWebAPIConnectionStatus(state) {
        document.getElementById('connection-status-state').innerText = state;
    }
}

class LiveAPIConnectionStatusView extends WebAPIConfigBase {
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
    setLiveAPISocketStatus(conn, recv, send) {
        this.nodes.connection.innerText = conn;
        this.nodes.recv.innerText = recv;
        this.nodes.send.innerText = send;
    }
}

class LiveAPIConfigView extends WebAPIConfigBase {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #config = {};
    #url = '';

    /** @param {string} url */
    constructor(url) {
        super('liveapi-config-');
        this.getNode('connections');
        this.getNode('submit');
        this.getNode('current');

        this.#url = url;
    }

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
        const api = handler.getWebAPI();

        this.nodes.submit.addEventListener('click', (ev) => {
            if (!('settings' in this.#config)) this.#config.settings = {};
            const settings = this.#config.settings;
            settings.cl_liveapi_use_v2 = true;
            settings.cl_liveapi_use_websocket = true;
            settings.cl_liveapi_allow_requests = true;
            settings.cl_liveapi_ws_retry_count = 50;
            settings.cl_liveapi_ws_retry_time = 5;
            settings.cl_liveapi_ws_timeout = 3600;
            settings.cl_liveapi_ws_keepalive = 10;
            settings.cl_liveapi_use_protobuf = true;
            settings.cl_liveapi_pretty_print_log = false;
            if (!('servers' in this.#config)) this.#config.servers = [];
            const servers = this.#config.servers;
            if (servers.indexOf(this.#url) < 0) servers.push(this.#url);
            api.setLiveAPIConfig(this.#config);
        });
    }

    /**
     * configを設定する
     * @param {object} config 設定オブジェクト
     */
    setLiveAPIConfig(config) {
        this.#config = config;

        // 現在表示中の接続先をクリア
        while (this.nodes.connections.lastChild) {
            this.nodes.connections.removeChild(this.nodes.connections.lastChild);
        }

        // config中の接続先を追加
        if ('servers' in this.#config) {
            for (const server of this.#config.servers) {
                const div = document.createElement('div');
                div.classList.add("lc_connection");
                div.innerText = server;
                if (server == this.#url) {
                    div.classList.add("lc_connection_added");
                }
                this.nodes.connections.appendChild(div);
            }
        }

        this.nodes.current.innerText = JSON.stringify(this.#config, null, "  ");
    }
}

class LanguageSelectView extends WebAPIConfigBase {
    /** @type {HTMLElement[]} */
    #languages = [];

    constructor() {
        super('language-select-');

        // 言語ノードの取得
        for (const node of [...document.querySelectorAll('#lang-select > span')].filter(el => el instanceof HTMLElement)) {
            this.#languages.push(node);
        }

        for (const node of this.#languages) {
            const lang = node.innerText;
            node.addEventListener('click', (ev) => {
                this.#setLanguage(lang);
            });
        }

        // 保存されている言語選択による設定
        const savedlang = window.localStorage.getItem("lang");
        for (const node of this.#languages) {
            if (node.innerText == savedlang) {
                this.#setLanguage(savedlang);
                return;
            }
        }

        // ブラウザ言語設定による初期選択
        const browserlang = window.navigator.languages[0];
        for (const node of this.#languages) {
            if (node.innerText == browserlang) {
                this.#setLanguage(browserlang);
                return;
            }
        }

        this.#setLanguage('en');
    }

    /**
     * 表示言語を設定する
     * @param {string} lang 言語(en/ja)
     */
    #setLanguage(lang) {
        const display_none = [];
        const display_blank = [];

        for (const node of this.#languages) {
            if (lang == node.innerText) {
                display_blank.push("." + node.innerText);
                node.classList.add("lang_selected");
                window.localStorage.setItem("lang", lang);
            } else {
                display_none.push("." + node.innerText);
                node.classList.remove("lang_selected");
            }
        }

        // CSSに反映
        for (const sheet of document.styleSheets) {
            for (const rule of [...sheet.cssRules].filter(r => r instanceof CSSStyleRule)) {
                if (display_none.indexOf(rule.selectorText) >= 0) {
                    rule.style.display = "none";
                }
                if (display_blank.indexOf(rule.selectorText) >= 0) {
                    rule.style.display = "";
                }
            }
        }
    }
}

class TournamentSetView {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #tbody = document.querySelector('tbody#tournamentids');
    #tournament_id = '';
    #tournament_ids = new Map();

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
        const api = handler.getWebAPI();

        document.getElementById('tournament-set-button').addEventListener('click', (ev) => {
            const text = document.getElementById('tournament-set-text').value;
            if (text != '') {
                api.setTournamentName(text);
            }
        });
    }

    /** @param {Object} ids */
    setTournamentIDs(ids) {
        if (this.#tbody == null) return;
        const tbody = this.#tbody;
        for (const [id, name] of Object.entries(ids)) {
            if (this.#tournament_ids.has(id)) {
                const c = this.#tournament_ids.get(id);
                c.name = name;
                c.node.children[0].innerText = name;
            } else {
                this.#tournament_ids.set(id, {
                    id: id,
                    name: name,
                    node: document.createElement('tr')
                });
                const c = this.#tournament_ids.get(id);
                c.node.appendChild(document.createElement('td'));
                c.node.appendChild(document.createElement('td'));
                c.node.children[0].innerText = name;
                c.node.children[1].innerText = id;
                tbody.appendChild(c.node);
                c.node.addEventListener('click', (ev) => {
                    if (this.#handler) {
                        this.#handler.getWebAPI().setTournamentName(name);
                    }
                });
                if (id == this.#tournament_id) {
                    c.node.classList.add('tournament-set-selected');
                }
            }
        }

        // 名前でソートする
        const children = [...tbody.children].sort((a, b) => {
            const a_name = a.children[0].innerText;
            const b_name = b.children[0].innerText;
            if (a_name < b_name) return -1;
            if (a_name > b_name) return 1;
            return 0;
        });
        for (const node of children) {
            tbody.appendChild(node);
        }
    }

    /**
     * @param {string} id トーナメントID
     * @param {string} name トーナメント名
     * @param {number} count リザルトの数
     */
    setCurrentTournament(id, name, count) {
        this.#tournament_id = id;
        document.getElementById('current_tournament_id').innerText = id;
        document.getElementById('current_tournament_name').innerText = name;

        for (const tr of document.querySelectorAll('tr.tournament-set-selected')) {
            tr.classList.remove('tournament-set-selected');
        }

        if (id != '' && this.#tournament_ids.has(id)) {
            this.#tournament_ids.get(id).node.classList.add('tournament-set-selected');
        }
    }
}

class TournamentRenameView {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #tournament_id = '';
    #input = document.getElementById('tournament-rename-text');
    #button = document.getElementById('tournament-rename-button');

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
        const api = handler.getWebAPI();

        this.#button.addEventListener('click', (ev) => {
            const text = this.#input.value.trim();
            if (text != '' || this.#tournament_id != '') {
                console.log(`Renaming tournament ${this.#tournament_id} to ${text}`);
                api.renameTournamentName(this.#tournament_id, text);
            }
        });
    }

    /**
     * @param {string} id トーナメントID
     * @param {string} name トーナメント名
     * @param {number} count リザルトの数
     */
    setCurrentTournament(id, name, count) {
        this.#tournament_id = id;
        this.#input.value = name;
    }
}

class TournamentCalculationMethodView extends WebAPIConfigBase {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #forms = [];

    constructor() {
        super('tournament-calc-');
        this.getNode('list');
        this.getNode('count');
        this.getNode('send');
        this.getNode('advancepoints');
        this.getNode('matchpoints');
        this.#appendTableRow();

        // イベント
        this.nodes.count.addEventListener('change', (ev) => {
            this.#changeTableSize(this.#getMatchCount());
        });

        this.nodes.send.addEventListener('click', (ev) => {
            this.#dumpCalcMethod();
        });
    }

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
    }

    /**
     * テーブルの末尾に要素を追加する(初期状態)
     */
    #appendTableRow() {
        const form = {};
        const index = this.nodes.list.children.length + 1;
        const tr = document.createElement('tr');
        tr.appendChild(document.createElement('td'));
        tr.appendChild(document.createElement('td'));
        tr.children[0].innerText = index;

        // 設定
        const td = tr.children[1];

        {
            // KILLCAP
            const div = document.createElement('div');
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            const label_text = document.createElement('span');
            const input = document.createElement('input');

            // 設定
            checkbox.type = "checkbox";
            input.type = "number";
            input.min = 0;
            input.max = 60;

            // テキスト設定
            label_text.innerHTML =
                '<span class="en">kill points cap:</span>' +
                '<span class="ja">キルポイント上限:</span>';
            input.value = 9;

            // append
            label.appendChild(checkbox);
            label.appendChild(label_text);
            label.appendChild(input);
            div.appendChild(label);
            td.appendChild(div);

            form.killcap = checkbox;
            form.killcap_value = input;
        }

        {
            // KILLAMP
            const div = document.createElement('div');
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            const label_text = document.createElement('span');
            const input = document.createElement('input');

            // 設定
            checkbox.type = "checkbox";
            input.type = "number";
            input.min = 2;
            input.max = 4;

            // テキスト設定
            label_text.innerHTML = 
                '<span class="en">kill points amp:</span>' +
                '<span class="ja">キルポイント倍率:</span>';
            input.value = 2;
            // append
            label.appendChild(checkbox);
            label.appendChild(label_text);
            label.appendChild(input);
            div.appendChild(label);
            td.appendChild(div);

            form.killamp = checkbox;
            form.killamp_value = input;
        }

        {
            // POINTS TABLE
            const div = document.createElement('div');
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            const label_text = document.createElement('span');
            const input = document.createElement('input');

            // 設定
            checkbox.type = "checkbox";
            input.type = "text";
            input.placeholder = "comma spalated points [ex. 12, 9, 7, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1]";

            // テキスト設定
            label_text.innerHTML = 
                '<span class="en">custom placement points table:</span>' +
                '<span class="ja">カスタム順位ポイント:</span>';

            // append
            label.appendChild(checkbox);
            label.appendChild(label_text);
            label.appendChild(input);
            div.appendChild(label);
            td.appendChild(div);

            form.customtable = checkbox;
            form.customtable_value = input;
        }

        this.nodes.list.appendChild(tr);
        this.#forms.push(form);
    }

    /**
     * テーブルから末尾要素を削除する
     */
    #popTableRow() {
        this.#forms.pop();
        if (this.nodes.list.lastChild) {
            this.nodes.list.removeChild(this.nodes.list.lastChild);
        }
    }

    /**
     * テーブルの行数を変える
     * @param {number} count 列数
     */
    #changeTableSize(count) {
        while (true) {
            const children_count = this.nodes.list.children.length;
            if (count == children_count) break;
            if (count > children_count) {
                this.#appendTableRow();
            } else {
                this.#popTableRow();
            }
        }
    }

    /**
     * select要素からマッチ数を取得する
     * @returns {number} マッチ数(1～16)
     */
    #getMatchCount() {
        const value = parseInt(this.nodes.count.value, 10);
        if (value < 1) return 1;
        if (value > 16) return 16;
        return value;
    }

    /**
     * 現在の設定・選択状況をObjectにしてコールバック関数を呼ぶ
     */
    #dumpCalcMethod() {
        const dumpobject = {};

        // 先行ポイント
        {
            const text = this.nodes.advancepoints.value;
            const values = text.split(/,/).map((x) => {
                const v = parseInt(x.trim(), 10);
                if (Number.isNaN(v)) return 0;
                return v;
            }).slice(0, 30);
            dumpobject.advancepoints = values;
        }

        // マッチポイント
        {
            const text = this.nodes.matchpoints.value;
            let value = parseInt(text, 10);
            if (Number.isNaN(value)) value = 0;
            if (value < 0) value = 0;
            dumpobject.matchpoints = value;
        }

        for (let gameid = 0; gameid < this.#forms.length; ++gameid) {
            const form = this.#forms[gameid];
            const data = {};
            let dump_needed = false;

            if (form.killcap.checked) {
                dump_needed = true;
                const killcap = parseInt(form.killcap_value.value, 10);
                data.killcap = killcap < 0 ? 0 : killcap;
            }

            if (form.killamp.checked) {
                dump_needed = true;
                let killamp = parseInt(form.killamp_value.value, 10);
                if (killamp < 2) killamp = 2;
                if (killamp > 4) killamp = 4;
                data.killamp = killamp;
            }

            if (form.customtable.checked) {
                dump_needed = true;
                const text = form.customtable_value.value;
                const values = text.split(/,/).map((x) => {
                    const v = parseInt(x.trim(), 10);
                    if (Number.isNaN(v)) return 0;
                    return v;
                }).slice(0, 30);
                data.customtable = values;
            }

            if (dump_needed) {
                dumpobject[gameid] = data;
            }
        }

        this.#handler.setTournamentParamsCalcMethod(dumpobject);
    }

    /**
     * 選択状況をクリアする
     */
    #clear() {
        this.nodes.advancepoints.value = "";
        this.#changeTableSize(0);
        this.#changeTableSize(1);
        this.nodes.count.value = 1;
    }

    /**
     * @param {string} id トーナメントID
     * @param {string} name トーナメント名
     * @param {number} count リザルトの数
     */
    setCurrentTournament(id, name, count) {
        this.#clear();
    }

    /**
     * トーナメントparamsに含まれるパラメータから現在の設定を表示に反映する
     * @param {object} params 
     */
    setTournamentParams(params) {
        if (!params) return;
        if (!('calcmethod' in params)) return;
        /** @type {object} */
        const calcmethod = params.calcmethod;
        if (!calcmethod) return;

        if ('advancepoints' in calcmethod) {
            if (calcmethod.advancepoints instanceof Array) {
                this.nodes.advancepoints.value = calcmethod.advancepoints.join();
            }
        }

        if ('matchpoints' in calcmethod) {
            let value = parseInt(calcmethod.matchpoints, 10);
            if (Number.isNaN(value)) value = 0;
            if (value < 0) value = 0;
            this.nodes.matchpoints.value = value;
        } else {
            this.nodes.matchpoints.value = 0; // デフォルト値
        }

        for (const [k, v] of Object.entries(params)) {
            const gameid = parseInt(k, 10);
            if (Number.isNaN(gameid)) continue;
            if (gameid < 0) continue;
            if (15 < gameid) continue;
            if (gameid >= this.#getMatchCount()) {
                this.nodes.count.value = gameid + 1;
                this.#changeTableSize(gameid + 1);
            }
            const form = this.#forms[gameid];
            if ('killcap' in v) {
                form.killcap.checked = true;
                form.killcap_value.value = v.killcap;
            }
            if ('killamp' in v) {
                form.killamp.checked = true;
                form.killamp_value.value = v.killamp;
            }
            if ('customtable' in v) {
                form.customtable.checked = true;
                form.customtable_value.value = v.customtable.join();
            }
        }
    }
}

class ObserverConfigView {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #observers = new Map();
    #current = '';
    #base = document.getElementById('observer-set-list');

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
        const api = handler.getWebAPI();

        document.getElementById('observer-set-getfromlobby').addEventListener('click', (ev) => {
            api.sendGetLobbyPlayers();
        });
    }

    #generateObserverNode(hash) {
        const node = {
            base: document.createElement('tr'),
            hash: document.createElement('td'),
            name: document.createElement('td')
        }

        node.base.appendChild(node.hash);
        node.base.appendChild(node.name);

        node.hash.innerText = hash;
        
        if (this.#current != "" && hash == this.#current) {
            node.base.classList.add('observer-set-selected');
        }

        node.base.addEventListener('click', () => {
            if (this.#current == hash) return;
            this.#handler.getWebAPI().setObserver(hash);
        });

        return node;
    }

    setObserverName(hash, name) {
        if (hash == '') return;
        if (!this.#observers.has(hash)) {
            this.#observers.set(hash, {});
        }
        const observer = this.#observers.get(hash);
        if (!('name' in observer)) {
            observer.name = name;
        }

        if (!('node' in observer)) {
            observer.node = this.#generateObserverNode(hash);
            this.#base.appendChild(observer.node.base);
        }

        observer.node.name.innerText = name;
    }

    setCurrentObserver(hash) {
        this.#current = hash;
        if (hash == '') return;
        document.getElementById('current_observer_id').innerText = hash;
        if (!this.#observers.has(hash)) return;
        const observer = this.#observers.get(hash);
        if (!('node' in observer)) return;
        for (const node of document.querySelectorAll('tr.observer-set-selected')) {
            node.classList.remove('observer-set-selected');
        }
        observer.node.base.classList.add('observer-set-selected');
    }

    setURLHash(fragment, mainmenu, submenu) {
        if (fragment == 'observer-set') {
            if (this.#handler) {
                const api = this.#handler.getWebAPI();
                api.getObserver();
                api.getObservers();
            }
        }
    }
}

class PlayerNameView extends WebAPIConfigBase {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #players = new Map();

    constructor() {
        super('player-name-');
        this.getNode('list');
    }

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
        const api = handler.getWebAPI();

        document.getElementById('player-name-getfromresults').addEventListener('click', (ev) => {
            api.getTournamentResults();
        });

        document.getElementById('player-name-getfromlivedata').addEventListener('click', (ev) => {

        });

        document.getElementById('player-name-getfromlobby').addEventListener('click', (ev) => {
            api.sendGetLobbyPlayers();
        });
    }

    #createPlayer(hash) {
        if (this.#players.has(hash)) return;
        const tr = document.createElement('tr');
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
            const prev_name = this.#players.get(hash).name;
            if (name != prev_name) {
                this.#handler.setPlayerParamsName(hash, name);
            }
        });

        // テーブルに追加
        this.nodes.list.appendChild(tr);

        this.#players.set(hash, {
            node: tr,
            name: '',
            ingamenames: new Set(),
        });
    }

    /**
     * 現在表示されているバナー用プレイヤー名取得
     * @param {string} hash プレイヤーID(hash)
     * @returns {string} プレイヤー名
     */
    #getName(hash) {
        if (this.#players.has(hash)) {
            const player = this.#players.get(hash);
            return player.name;
        }
        return '';
    }

    setPlayerParamsName(hash, name) {
        if (!this.#players.has(hash)) {
            this.#createPlayer(hash);
        }
        if (this.#players.has(hash)) {
            const player = this.#players.get(hash);
            player.name = name;
            player.node.children[1].innerText = name;
        }
    }

    setPlayerIngameName(hash, teamid, ingamename) {
        if (!this.#players.has(hash)) {
            this.#createPlayer(hash);
        }

        if (this.#players.has(hash)) {
            const player = this.#players.get(hash);
            player.ingamenames.add(ingamename);
            player.node.children[2].innerText = Array.from(player.ingamenames).join();
        }
    }

    setPlayerParams(hash, params) {
        // paramsからingamenamesを取り出して表示に反映する
        if (!params) return;
        if (!('ingamenames' in params)) return;
        const names = params.ingamenames;

        if (!this.#players.has(hash)) {
            this.#createPlayer(hash);
        }

        if (this.#players.has(hash)) {
            const player = this.#players.get(hash);
            for (const name of names) {
                player.ingamenames.add(name);
            }
            player.node.children[2].innerText = Array.from(player.ingamenames).join();
        }
    }
}

class PlayerNameLobbyView extends WebAPIConfigBase {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #teams = [];
    #players = new Map();

    constructor() {
        super('player-lobbyview-');
        this.getNode('container');

        // チーム初期化
        for (let i = 0; i < 30; ++i) {
            const div = document.createElement('div');
            div.innerHTML = `
            <div class="player-lobbyview-team-info"><div class="team-id">${i + 1}</div><div class="team-name"></div></div>
            <div class="player-lobbyview-team-players"></div>
            `;
            div.classList.add('player-lobbyview-team');
            div.classList.add('hide');
            div.dataset.teamid = i + 1;
            this.nodes.container.appendChild(div);
            this.#teams.push(div);
        }
    }

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
        const api = handler.getWebAPI();

        document.getElementById('player-lobbyview-getfromlobby').addEventListener('click', (ev) => {
            api.sendGetLobbyPlayers();
        });
    }

    /** @param {string} hash プレイヤーID(hash) */
    #createPlayerDiv(hash) {
        const div = document.createElement('div');
        div.classList.add('player-lobbyview-player');
        div.dataset.hash = hash;
        div.innerHTML = `
            <div class="player-name-container">
                <span class="player-name"></span>
                <span class="player-ingame-name"></span>
            </div>
            <div class="player-actions">
                <input type="text" class="player-name-input">
                <button class="player-set-name">
                    <span class="en">set</span>
                    <span class="jp">設定</span>
                </button>
            </div>
        `;
        this.#players.set(hash, div);
        const button = div.querySelector('.player-set-name');
        button.addEventListener('click', () => {
            const input = div.querySelector('.player-name-input');
            const name = input.value.trim();
            const prev_name = div.querySelector('.player-name').innerText;
            if (name != prev_name) {
                this.#handler.setPlayerParamsName(hash, name);
            }
        });
    }

    lobbyEnumStart() {
        for (const team of this.#teams) {
            team.classList.remove('exists');
        }
        for (const player of this.#players.values()) {
            player.classList.remove('exists');
        }
    }

    lobbyEnumEnd() {
        for (const team of this.#teams) {
            if (team.classList.contains('exists')) {
                team.classList.remove('hide');
            } else {
                team.classList.add('hide');
            }
        }
        for (const player of this.#players.values()) {
            if (player.classList.contains('exists')) {
                player.classList.remove('hide');
            } else {
                player.classList.add('hide');
            }
        }
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {string} teamname チーム名
     */
    setTeamIngameName(teamid, teamname) {
        if (teamid < 0 || teamid >= this.#teams.length) return;
        const team = this.#teams[teamid];
        if (team) {
            const div = team.querySelector('.team-name');
            if (div) {
                div.innerText = teamname;
            }
        }
        team.classList.add('exists');
    }

    /**
     * @param {string} hash プレイヤーID(hash)
     * @param {number} teamid チームID(1～30)
     * @param {string} ingamename インゲーム名
     */
    setPlayerIngameName(hash, teamid, ingamename) {
        if (!this.#players.has(hash)) {
            this.#createPlayerDiv(hash);
        }
        if (this.#players.has(hash)) {
            const div = this.#players.get(hash);
            div.querySelector('.player-name').innerText = this.#handler.getPlayerName(hash);
            div.querySelector('.player-ingame-name').innerText = ingamename;
            div.classList.add('exists');

            // チームの枠に挿入
            const team = this.#teams[teamid];
            if (team && !team.contains(div)) {
                const container = team.querySelector('.player-lobbyview-team-players');
                if (container) {
                    container.appendChild(div);
                }
            }
        }
    }

    /**
     * @param {string} hash プレイヤーID(hash)
     * @param {string} name プレイヤー名
     */
    setPlayerParamsName(hash, name) {
        if (!this.#players.has(hash)) return;
        const div = this.#players.get(hash);
        div.querySelector('.player-name').innerText = name;
    }
}

class TeamNameView extends WebAPIConfigBase {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;

    constructor() {
        super('team-name-');
        this.getNode('num');
        this.getNode('text');
        this.getNode('output');

        // テキスト設定
        this.#setLineNumber();

        this.nodes.text.addEventListener('change', (ev) => {
            this.#updateOutput(ev.target.value);
        });
    }

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
        const api = handler.getWebAPI();

        document.getElementById('team-name-button').addEventListener('click', (ev) => {
            const text = this.nodes.text.value;
            this.#handler.setTeamParamsNamesFromText(text);
        });

        document.getElementById('team-ingamename-button').addEventListener('click', (ev) => {
            const text = this.nodes.text.value;
            this.#handler.setTeamIngameNamesFromText(text);
        });
    }
    /**
     * 行番号を設定する
     */
    #setLineNumber() {
        let dst = '';
        for(let i = 0; i < 30; ++i) {
            if (dst != '') dst += '\r\n';
            dst += (i + 1);
        }
        this.nodes.num.innerText = dst;
    }

    /** @param {string} text テキスト */
    setTeamParamsNameLines(text) {
        const prev_text = this.nodes.text.value;
        if (text != prev_text) {
            this.nodes.text.value = text;
            this.#updateOutput(text);
        }
    }

    /**
     * 1行毎に「TeamXX: 」をつけてoutput側のTextAreaに設定
     * @param {string} src 元のテキスト
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

class InGameSettingsView extends WebAPIConfigBase {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #base = document.getElementById('ingamesettings');
    #lobby = {};
    #customsettings = {};
    #presets = {};

    constructor() {
        super('ingamesettings-');
        this.getNode('num');
        this.getNode('teamnames');
        this.getNode('spawnpoints');
        this.getNode('teamsettings');
        this.getNode('currentplaylistname');
        this.getNode('currentadminchat');
        this.getNode('currentteamrename');
        this.getNode('currentselfassign');
        this.getNode('currentaimassist');
        this.getNode('currentanonmode');
        this.getNode('token');
        this.getNode('presets');

        // テキスト設定
        this.#setLineNumber();

        // テキスト変更時にチェックを入れる
        this.nodes.teamnames.addEventListener('change', (ev) => {
            this.#checkTeamSettings();
        });
        this.nodes.spawnpoints.addEventListener('change', (ev) => {
            this.#checkTeamSettings();
        });

        // 値の変更時にチェックを入れる
        this.#base.querySelector('#ingamesettings-customsettings-playlistname').addEventListener('change', (ev) => {
            this.#checkCustomSettings();
        });
        for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-adminchat]')) {
            node.addEventListener('change', (ev) => {
                this.#checkCustomSettings();
            });
        }
        for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-teamrename]')) {
            node.addEventListener('change', (ev) => {
                this.#checkCustomSettings();
            });
        }
        for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-selfassign]')) {
            node.addEventListener('change', (ev) => {
                this.#checkCustomSettings();
            });
        }
        for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-aimassist]')) {
            node.addEventListener('change', (ev) => {
                this.#checkCustomSettings();
            });
        }
        for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-anonmode]')) {
            node.addEventListener('change', (ev) => {
                this.#checkCustomSettings();
            });
        }

        // プリセットの保存
        this.#base.querySelector('#ingamesettings-preset-save').addEventListener('click', (ev) => {
            const name = this.#base.querySelector('#ingamesettings-preset-name').value.trim();
            if (name == '') return;
            this.#savePreset(name);
        });
    }

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
        const api = handler.getWebAPI();

        document.getElementById('ingamesettings-getfromlobby').addEventListener('click', ev => {
            api.sendGetLobbyPlayers();
            api.sendGetSettings();
        });

        document.getElementById('ingamesettings-teamnames-button').addEventListener('click', (ev) => {
            this.#setInGameTeamNames();
        });

        document.getElementById('ingamesettings-spawnpoints-button').addEventListener('click', (ev) => {
            this.#setInGameSpawnPoints();
        });

        document.getElementById('ingamesettings-customsettings-button').addEventListener('click', (ev) => {
            this.#setInGameSettings();
        });

        document.getElementById('ingamesettings-all-button').addEventListener('click', (ev) => {
            this.#setInGameTeamNames();
            this.#setInGameSpawnPoints();
            this.#setInGameSettings();
        });
    }

    #setInGameSpawnPoints() {
        const spawnpoints = this.getSpawnPoints();
        this.#handler.setTeamIngameSpawnPoints(spawnpoints);
    }

    #setInGameTeamNames() {
        const text = this.nodes.teamnames.value;
        this.#handler.setTeamIngameNamesFromText(text);
    }

    #setInGameSettings() {
        if (!this.#handler) return;
        const d = this.getCustomSettings();
        const api = this.#handler.getWebAPI();
        api.sendSetSettings(d.playlistname, d.adminchat, d.teamrename, d.selfassign, d.aimassist, d.anonmode);
        api.sendGetSettings();
    }

    /**
     * 行番号を設定する
     */
    #setLineNumber() {
        let dst = '';
        for(let i = 0; i < 30; ++i) {
            if (dst != '') dst += '\r\n';
            dst += (i + 1);
        }
        this.nodes.num.innerText = dst;
    }

    #getPlaylistName() {
        return this.#base.querySelector('#ingamesettings-customsettings-playlistname').value;
    }

    #getAdminChat() {
        return this.#base.querySelector('[name="ingamesettings-customsettings-adminchat"]:checked').value === '1';
    }

    #getTeamRename() {
        return this.#base.querySelector('[name="ingamesettings-customsettings-teamrename"]:checked').value === '1';
    }

    #getSelfAssign() {
        return this.#base.querySelector('[name="ingamesettings-customsettings-selfassign"]:checked').value === '1';
    }

    #getAimAssist() {
        return this.#base.querySelector('[name="ingamesettings-customsettings-aimassist"]:checked').value === '1';
    }

    #getAnonMode() {
        return this.#base.querySelector('[name="ingamesettings-customsettings-anonmode"]:checked').value === '1';
    }

    /**
     * テキストエリアからチーム名の配列を作る
     * @returns {string[]} チーム名の入った配列
     */
    getTeamNames() {
        const text = this.nodes.teamnames.value;
        return text.split(/\r\n|\n/).map((line) => line.trim()).slice(0, 30);
    }

    /**
     * テキストエリアからスポーン地点の配列を作る
     * @returns {number[]} スポーン地点の入った配列
     */
    getSpawnPoints() {
        const text = this.nodes.spawnpoints.value;
        return text.split(/\r\n|\n/).map((line) => line.trim()).slice(0, 30).map(x => {
            let n = parseInt(x, 10);
            if (Number.isNaN(n)) n = 0;
            if (n < 0) n = 0;
            if (30 < n) n = 0;
            return n;
        });
    }

    getCustomSettings() {
        return {
            playlistname: this.#getPlaylistName(),
            adminchat: this.#getAdminChat(),
            teamrename: this.#getTeamRename(),
            selfassign: this.#getSelfAssign(),
            aimassist: this.#getAimAssist(),
            anonmode: this.#getAnonMode()
        };
    }

    /**
     * インゲーム情報のチームテーブルを更新
     */
    #updateInGameTeamSettings() {
        while (this.nodes.teamsettings.firstChild) {
            this.nodes.teamsettings.removeChild(this.nodes.teamsettings.firstChild);
        }
        if ('token' in this.#lobby) {
            this.nodes.token.textContent = this.#lobby.token;
            if (this.#lobby.token.indexOf('c') == 0) {
                this.nodes.token.dataset.status = 'common';
            } else {
                this.nodes.token.dataset.status = 'special';
            }
        } else {
            this.nodes.token.textContent = 'xxxxxxxx';
            this.nodes.token.dataset.status = 'none';
        }
        if ('teams' in this.#lobby) {
            for (let i = 0; i < 30; ++i) {
                if (i in this.#lobby.teams) {
                    const t = this.#lobby.teams[i];
                    const tr = document.createElement('tr');
                    tr.dataset.teamid = i;
                    tr.dataset.name = t.name;
                    tr.dataset.spawnpoint = t.spawnpoint;
                    tr.appendChild(document.createElement('td')).textContent = (i + 1);
                    tr.appendChild(document.createElement('td')).textContent = t.name;
                    tr.appendChild(document.createElement('td')).textContent = t.spawnpoint;
                    this.nodes.teamsettings.appendChild(tr);
                } else {
                    break;
                }
            }
        }
    }

    #checkTeamSettings() {
        const teamnames = this.getTeamNames();
        const spawnpoints = this.getSpawnPoints();
        for (const node of this.nodes.teamsettings.children) {
            const teamid = parseInt(node.dataset.teamid, 10);
            if (Number.isNaN(teamid)) continue;
            if (teamid < 0 || 29 < teamid) continue;
            let teamname = '';
            let spawnpoint = 0;
            if (teamid < teamnames.length) {
                teamname = teamnames[teamid];
            }
            if (teamid < spawnpoints.length) {
                spawnpoint = spawnpoints[teamid];
            }
            if (node.dataset.name == teamname) {
                node.children[1].dataset.correct = 'true';
            } else {
                node.children[1].dataset.correct = 'false';
            }
            if (node.dataset.spawnpoint == String(spawnpoint)) {
                node.children[2].dataset.correct = 'true';
            } else {
                node.children[2].dataset.correct = 'false';
            }
        }
    }

    #updatedCustomSettings() {
        if ('playlistname' in this.#customsettings) {
            this.nodes.currentplaylistname.textContent = this.#customsettings.playlistname;
        } else {
            this.nodes.currentplaylistname.textContent = '';
        }
        if ('adminchat' in this.#customsettings) {
            this.nodes.currentadminchat.textContent = String(this.#customsettings.adminchat);
        } else {
            this.nodes.currentadminchat.textContent = '';
        }
        if ('teamrename' in this.#customsettings) {
            this.nodes.currentteamrename.textContent = String(this.#customsettings.teamrename);
        } else {
            this.nodes.currentteamrename.textContent = '';
        }
        if ('selfassign' in this.#customsettings) {
            this.nodes.currentselfassign.textContent = String(this.#customsettings.selfassign);
        } else {
            this.nodes.currentselfassign.textContent = '';
        }
        if ('aimassist' in this.#customsettings) {
            this.nodes.currentaimassist.textContent = String(this.#customsettings.aimassist);
        } else {
            this.nodes.currentaimassist.textContent = '';
        }
        if ('anonmode' in this.#customsettings) {
            this.nodes.currentanonmode.textContent = String(this.#customsettings.anonmode);
        } else {
            this.nodes.currentanonmode.textContent = '';
        }
    }

    #checkCustomSettings() {
        let playlistname = '';
        let adminchat = false;
        let teamrename = false;
        let selfassign = false;
        let aimassist = false;
        let anonmode = false;
        if ('playlistname' in this.#customsettings) {
            playlistname = this.#customsettings.playlistname;
        }
        if ('adminchat' in this.#customsettings) {
            adminchat = this.#customsettings.adminchat;
        }
        if ('teamrename' in this.#customsettings) {
            teamrename = this.#customsettings.teamrename;
        }
        if ('selfassign' in this.#customsettings) {
            selfassign = this.#customsettings.selfassign;
        }
        if ('aimassist' in this.#customsettings) {
            aimassist = this.#customsettings.aimassist;
        }
        if ('anonmode' in this.#customsettings) {
            anonmode = this.#customsettings.anonmode;
        }
        if (this.#getPlaylistName() == playlistname) {
            this.nodes.currentplaylistname.dataset.correct = 'true';
        } else {
            this.nodes.currentplaylistname.dataset.correct = 'false';
        }
        if (this.#getAdminChat() == adminchat) {
            this.nodes.currentadminchat.dataset.correct = 'true';
        } else {
            this.nodes.currentadminchat.dataset.correct = 'false';
        }
        if (this.#getTeamRename() == teamrename) {
            this.nodes.currentteamrename.dataset.correct = 'true';
        } else {
            this.nodes.currentteamrename.dataset.correct = 'false';
        }
        if (this.#getSelfAssign() == selfassign) {
            this.nodes.currentselfassign.dataset.correct = 'true';
        } else {
            this.nodes.currentselfassign.dataset.correct = 'false';
        }
        if (this.#getAimAssist() == aimassist) {
            this.nodes.currentaimassist.dataset.correct = 'true';
        } else {
            this.nodes.currentaimassist.dataset.correct = 'false';
        }
        if (this.#getAnonMode() == anonmode) {
            this.nodes.currentanonmode.dataset.correct = 'true';
        } else {
            this.nodes.currentanonmode.dataset.correct = 'false';
        }
    }

    /** @param {string} key プリセットのキー */
    #savePreset(key) {
        if (key == '') return;
        const preset = {};
        preset.teamnames = this.getTeamNames();
        preset.spawnpoints = this.getSpawnPoints();
        preset.customsettings = {
            playlistname: this.#getPlaylistName(),
            adminchat: this.#getAdminChat(),
            teamrename: this.#getTeamRename(),
            selfassign: this.#getSelfAssign(),
            aimassist: this.#getAimAssist(),
            anonmode: this.#getAnonMode()
        };
        this.#presets[key] = preset;
        this.#handler.setTournamentParamsPresets(this.#presets);
    }

    /** @param {string} key プリセットのキー */
    #loadPreset(key) {
        if (key in this.#presets) {
            this.#base.querySelector('#ingamesettings-preset-name').value = key;

            // load
            const preset = this.#presets[key];
            if ('teamnames' in preset) {
                if (preset.teamnames instanceof Array) {
                    this.nodes.teamnames.value = preset.teamnames.join('\r\n');
                }
            }
            if ('spawnpoints' in preset) {
                if (preset.spawnpoints instanceof Array) {
                    this.nodes.spawnpoints.value = preset.spawnpoints.join('\r\n');
                }
            }
            if ('customsettings' in preset) {
                const settings = preset.customsettings;
                if ('playlistname' in settings) {
                    this.#base.querySelector('#ingamesettings-customsettings-playlistname').value = settings.playlistname;
                }
                if ('adminchat' in settings) {
                    const value = settings.adminchat ? '1' : '0';
                    for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-adminchat]')) {
                        if (node.value == value) {
                            node.checked = true;
                        } else {
                            node.checked = false;
                        }
                    }
                }
                if ('teamrename' in settings) {
                    const value = settings.teamrename ? '1' : '0';
                    for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-teamrename]')) {
                        if (node.value == value) {
                            node.checked = true;
                        } else {
                            node.checked = false;
                        }
                    }
                }
                if ('selfassign' in settings) {
                    const value = settings.selfassign ? '1' : '0';
                    for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-selfassign]')) {
                        if (node.value == value) {
                            node.checked = true;
                        } else {
                            node.checked = false;
                        }
                    }
                }
                if ('aimassist' in settings) {
                    const value = settings.aimassist ? '1' : '0';
                    for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-aimassist]')) {
                        if (node.value == value) {
                            node.checked = true;
                        } else {
                            node.checked = false;
                        }
                    }
                }
                if ('anonmode' in settings) {
                    const value = settings.anonmode ? '1' : '0';
                    for (const node of this.#base.querySelectorAll('[name=ingamesettings-customsettings-anonmode]')) {
                        if (node.value == value) {
                            node.checked = true;
                        } else {
                            node.checked = false;
                        }
                    }
                }
            }

            // check
            this.#checkTeamSettings();
            this.#checkCustomSettings();
        }
    }

    /** @param {string} key プリセットのキー */
    #deletePreset(key) {
        if (key in this.#presets) {
            delete this.#presets[key];
            if (this.#handler) {
                this.#handler.setTournamentParamsPresets(this.#presets);
            }
        }
    }

    #updatedPresets() {
        while (this.nodes.presets.firstChild) {
            this.nodes.presets.removeChild(this.nodes.presets.firstChild);
        }
        const keys = Object.keys(this.#presets).sort((a, b) => a.localeCompare(b));
        for (const key of keys) {
            const preset = this.#presets[key];
            const playlistname = ('customsettings' in preset && 'playlistname' in preset.customsettings) ? preset.customsettings.playlistname : '';
            const tr = document.createElement('tr');
            tr.appendChild(document.createElement('td')).textContent = key;
            tr.appendChild(document.createElement('td')).textContent = playlistname;
            const action = tr.appendChild(document.createElement('td'));
            action.appendChild(document.createElement('button')).textContent = 'load';
            action.appendChild(document.createElement('button')).textContent = 'delete';
            action.children[0].addEventListener('click', () => {
                this.#loadPreset(key);
            });
            action.children[1].addEventListener('click', () => {
                this.#deletePreset(key);
            });
            this.nodes.presets.appendChild(tr);
        }
    }

    /** @param {object} params トーナメントパラメータ */
    setTournamentParams(params) {
        this.#presets = {};
        if (params && 'presets' in params) {
            this.#presets = structuredClone(params.presets);
        }
        this.#updatedPresets();
    }

    /** @param {object} lobby ロビー情報 */
    setLobby(lobby) {
        this.#lobby = lobby;
        this.#updateInGameTeamSettings();
        this.#checkTeamSettings();
    }

    /** @param {object} settings カスタムマッチ設定 */
    setCustomMatchSettings(settings) {
        this.#customsettings = settings;
        this.#updatedCustomSettings();
        this.#checkCustomSettings();
    }
}

class LegendBanView {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #tbody = document.getElementById('legendban-list');

    /** @param {WebAPIWorkerHandler} handler */
    setWebAPIHandler(handler) {
        this.#handler = handler;
        const api = this.#handler.getWebAPI();

        document.getElementById('legendban-get').addEventListener('click', () => {
            api.sendGetLegendBanStatus();
        });

        document.getElementById('legendban-set').addEventListener('click', () => {
            const legendrefs = this.#getLegendRefs();
            api.sendSetLegendBan(legendrefs);
        });

        document.getElementById('legendban-banall').addEventListener('click', () => {
            this.#setAll(true);
        });

        document.getElementById('legendban-unbanall').addEventListener('click', () => {
            this.#setAll(false);
        });

        api.addEventListener('legendbanenumstart', ev => {
            this.#clear();
        });

        api.addEventListener('legendbanstatus', ev => {
            const data = ev.detail;
            this.#add(data.name, data.legendref, data.banned);
        });

        api.addEventListener('legendbanenumend', ev => {
        });
    }

    #getLegendRefs() {
        const refs = [];
        for (const tr of this.#tbody.children) {
            if (tr.dataset.banned == 'true') {
                refs.push(tr.dataset.legendref);
            }
        }
        return refs.join(',');
    }

    /**
     * @param {string} name レジェンド名
     * @param {string} legendref レジェンドリファレンス
     * @param {boolean} banned バンされているか
     */
    #add(name, legendref, banned) {
        const tr = document.createElement('tr');
        tr.appendChild(document.createElement('td'));
        tr.appendChild(document.createElement('td'));
        tr.dataset.legendref = legendref;
        tr.dataset.banned = banned;
        tr.children[0].textContent = name;
        tr.children[1].textContent = banned;
        this.#tbody.appendChild(tr);

        tr.addEventListener('click', () => {
            if (tr.dataset.banned == 'true') {
                tr.dataset.banned = 'false';
                tr.children[1].textContent = 'false';
            } else {
                tr.dataset.banned = 'true';
                tr.children[1].textContent = 'true';
            }
        });
    }

    /** @param {boolean} banned バンするかどうか */
    #setAll(banned) {
        for (const tr of this.#tbody.children) {
            tr.dataset.banned = banned;
            tr.children[1].textContent = banned;
        }
    }

    #clear() {
        while (this.#tbody.firstChild) {
            this.#tbody.removeChild(this.#tbody.firstChild);
        }
    }
}

class RealtimeView {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #_game;
    #basenode;
    #gameinfonode;
    #nodes;
    #gameinfonodes;
    #playersnamenode = new Map();

    constructor() {
        this.#basenode = document.getElementById('realtime-teams');
        this.#nodes = [];

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

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
    }

    /** @param {number} teamid チームID(1～30) */
    #precheckTeamID(teamid) {
        if (teamid < this.#basenode.children.length) return;
        for (let i = this.#basenode.children.length; i <= teamid; ++i) {
            this.#appendTeamNode(i);
        }
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     */
    #precheckPlayerID(teamid, playerid) {
        const teamnode = this.#nodes[teamid];
        if (playerid < teamnode.players.length) return;
        for (let i = teamnode.players.length; i <= playerid; ++i) {
            this.#appendPlayerNode(teamid, i);
        }
    }

    /**
     * HPバーを描画する
     * @param {HTMLCanvasElement} canvas 描画先のCanvas
     * @param {number} hp 現在のHP
     * @param {number} hpmax 最大HP
     */
    #drawBarHP(canvas, hp, hpmax) {
        const height = 8;
        canvas.width = hpmax + 2;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, hpmax + 2, height);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(1, 1, hp, height - 2);
    }

    /**
     * シールドバーを描画する
     * @param {HTMLCanvasElement} canvas 描画先のCanvas
     * @param {number} shield 現在のシールド
     * @param {number} shieldmax 最大シールド
     * @param {boolean} gold ゴールドシールドかどうか
     */
    #drawBarShield(canvas, shield, shieldmax, gold = false) {
        const height = 8;
        canvas.width = shieldmax + 2;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
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

    /** @param {number} teamid チームID(1～30) */
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

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     */
    #generatePlayerNode(teamid, playerid) {
        const playernode = {};
        playernode.base = document.createElement('div');
        playernode.left = document.createElement('div');
        playernode.right = document.createElement('div');
        playernode.name = document.createElement('div');
        playernode.character = document.createElement('div');
        playernode.weapon = document.createElement('div');
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
        playernode.left.appendChild(playernode.weapon);
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
        playernode.weapon.classList.add('realtime-player-weapon');
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
        playernode.weapon.innerText = '';
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
                if (teamid >= this.#_game.teams.length) return;
                const team = this.#_game.teams[teamid];
                if (playerid >= team.players.length) return;
                const player = team.players[playerid];
                if (!('hash' in player)) return;
                if (!('state' in player)) return;
                if (player.hash == '') return;
                if (player.state != ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_ALIVE) return;
                if (!this.#handler) return;
                this.#handler.getWebAPI().changeCameraByHash(player.hash);
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

    /** @param {number} teamid チームID(1～30) */
    #appendTeamNode(teamid) {
        const teamnode = this.#generateTeamNode(teamid);
        this.#nodes.push(teamnode);
        this.#basenode.appendChild(teamnode.base);
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     */
    #appendPlayerNode(teamid, playerid) {
        const playernode = this.#generatePlayerNode(teamid, playerid);
        this.#nodes[teamid].players.push(playernode);
        this.#nodes[teamid].base.appendChild(playernode.base);
    }

    /** @param {number} timestamp タイムスタンプ */
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

    /** @param {number} teamid チームID(1～30) */
    setTeamId(teamid) {
        this.#precheckTeamID(teamid);
        const name = this.#handler.getTeamName(teamid);
        this.#nodes[teamid].name.innerText = name;
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {string} name チーム名
     */
    setTeamName(teamid, name) {
        if (teamid < this.#nodes.length) {
            this.#nodes[teamid].name.innerText = name;
        }
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} kills キル数
     */
    setTeamKills(teamid, kills) {
        if (teamid < this.#nodes.length) {
            this.#nodes[teamid].kills_value.innerText = kills;
        }
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} placement 順位
     */
    setTeamPlacement(teamid, placement) {
        if (teamid < this.#nodes.length) {
            this.#nodes[teamid].placement_value.innerText = placement;
        }
    }

    /** @param {number} teamid チームID(1～30) */
    setSquadEliminated(teamid) {
        if (teamid < this.#nodes.length) {
            this.#nodes[teamid].base.classList.add('realtime-team-eliminated');
        }
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
    static PLAYERNODE_WEAPON = 0x0a;

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     * @param {number} nodetype ノードの種類
     */
    #drawPlayerNode(teamid, playerid, nodetype = RealtimeView.PLAYERNODE_NAME) {
        this.#precheckTeamID(teamid);
        this.#precheckPlayerID(teamid, playerid);
        if (!this.#handler) return;
        if (teamid >= this.#_game.teams.length) return;
        if (playerid >= this.#_game.teams[teamid].length) return;
        const player = this.#_game.teams[teamid].players[playerid];
        switch(nodetype) {
            case RealtimeView.PLAYERNODE_NAME: {
                const node = this.#nodes[teamid].players[playerid].name;
                this.#playersnamenode.set(player.hash, node);
                node.innerText = this.#handler.getPlayerName(player.hash);
                break;
            }
            case RealtimeView.PLAYERNODE_CHARACTER: {
                const node = this.#nodes[teamid].players[playerid].character;
                if ('character' in player) {
                    node.innerText = player.character;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_HP: {
                const node = this.#nodes[teamid].players[playerid].hpbar;
                if ('hp' in player && 'hp_max' in player) {
                    // node.innerText = 'HP:' + player.hp + '/' + player.hp_max;
                    this.#drawBarHP(node, player.hp, player.hp_max);
                }
                break;
            }
            case RealtimeView.PLAYERNODE_SHIELD: {
                const node = this.#nodes[teamid].players[playerid].shieldbar;
                if ('shield' in player && 'shield_max' in player) {
                    let gold = false;
                    if ('items' in player && 'bodyshield' in player.items && player.items.bodyshield == 4) gold = true;
                    this.#drawBarShield(node, player.shield, player.shield_max, gold);
                }
                break;
            }
            case RealtimeView.PLAYERNODE_KILLS: {
                const node = this.#nodes[teamid].players[playerid].kills;
                if ('kills' in player) {
                    node.innerText = 'kills:' + player.kills;
                }
                break;
            }
            case RealtimeView.PLAYERNODE_ASSISTS: {
                const node = this.#nodes[teamid].players[playerid].assists;
                if ('assists' in player) {
                    node.innerText = 'assists:' + player.assists;
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
                }
                break;
            }
            case RealtimeView.PLAYERNODE_DAMAGE_TAKEN: {
                const node = this.#nodes[teamid].players[playerid].damage_taken;
                if ('damage_taken' in player) {
                    node.innerText = 'taken:' + player.damage_taken;
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
            case RealtimeView.PLAYERNODE_WEAPON: {
                const node = this.#nodes[teamid].players[playerid].weapon;
                if ('weapon' in player) {
                    node.innerText = player.weapon;
                }
                break;
            }
        }
    }

    /**
     * @param {string} hash プレイヤーのハッシュ
     * @param {string} name プレイヤー名
     */
    setPlayerName(hash, name) {
        if (this.#playersnamenode.has(hash)) {
            const namenode = this.#playersnamenode.get(hash);
            namenode.innerText = name;
        }
    }

    /**
     * @param {string} hash プレイヤーのハッシュ
     * @param {number} teamid チームID(1～30)
     * @param {string} name プレイヤー名
     * @param {number} playerid プレイヤーID(0～)
     */
    setPlayerIngameName(hash, teamid, name, playerid) {
        this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_NAME);
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     * @param {object} stats プレイヤーの状態
     */
    setPlayerStats(teamid, playerid, stats) {
        this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_KILLS);
        this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_ASSISTS);
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     * @param {string} character レジェンド名
     */
    setPlayerCharacter(teamid, playerid, character) {
        this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_CHARACTER);
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     * @param {number} hp 現在のHP
     * @param {number} hpmax 最大HP
     */
    setPlayerHP(teamid, playerid, hp, hpmax) {
        this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_HP);
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     * @param {number} shield 現在のシールド
     * @param {number} shieldmax 最大シールド
     */
    setPlayerShield(teamid, playerid, shield, shieldmax) {
        this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_SHIELD);
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     * @param {number} damage_dealt 与えたダメージ
     * @param {number} damage_taken 受けたダメージ
     */
    setPlayerDamage(teamid, playerid, damage_dealt, damage_taken) {
        this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_DAMAGE_DEALT);
        this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_DAMAGE_TAKEN);
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     * @param {string} weapon 武器名
     */
    setPlayerWeapon(teamid, playerid, weapon) {
        this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_WEAPON);
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     */
    setPlayerStateAlive(teamid, playerid) {
        this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_STATE);
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     */
    setPlayerStateDown(teamid, playerid) {
        this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_STATE);
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     */
    setPlayerStateKilled(teamid, playerid) {
        this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_STATE);
    }

    /**
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     */
    setPlayerStateCollected(teamid, playerid) {
        this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_STATE);
    }

    /**
     * @param {string} observerhash オブザーバーのハッシュ
     * @param {number} teamid チームID(1～30)
     * @param {number} playerid プレイヤーID(0～)
     * @param {boolean} own 自分の視点かどうか
     */
    callObserverSwitch(observerhash, teamid, playerid, own) {
        if (own) {
            this.#drawPlayerNode(teamid, playerid, RealtimeView.PLAYERNODE_SELECTED);
        }
    }

    /** @param {object} game ゲーム情報 */
    setGame(game) {
        this.#_game = game;
        this.clear();
        this.drawGameInfo();
    }

    /** @param {object} game ゲーム情報 */
    callMatchSetup(game) {
        this.drawGameInfo();
    }

    /** @param {object} game ゲーム情報 */
    callClearLiveData(game) {
        this.clear();
    }

    /** @param {string} state ゲーム状態 */
    setGameState(state) {
        this.drawGameInfo();
    }

    clear() {
        this.#basenode.innerHTML = '';
        this.#nodes.splice(0);s
        this.#playersnamenode.clear();
    }
}

class ResultView {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #_game = null;
    #_results = null;
    #tournamentparams = {};
    #info = document.getElementById('result-game-info');
    #all = document.getElementById('result-all-base');
    #left = document.getElementById('result-all-left');
    #right = document.getElementById('result-all-right');
    #single = document.getElementById('result-single');
    #nodes = [];
    #infonodes = [];
    #teams = new Map(); // params保存用
    #players = new Map(); // params保存用
    #current = "all";
    static points_table = [12, 9, 7, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1];

    constructor() {
        this.clear();
    }

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
    }

    /** @param {number} gameid ゲームID */
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
            location.assign('#result-' + gameid);
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

    /**
     * @param {number} rank 順位(0～)
     * @param {number} total チーム数
     * @param {object} team チーム情報
     * @param {number|null} placement 順位(オプション)
     */
    #drawTeamForAll(rank, total, team, placement = null) {
        if (!this.#handler) return;
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
        node.name.dataset.name = team.name;
        node.name.innerText = this.#handler.getTeamResultName(team.id, team.name);
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

        node.base.dataset.winner = team.winner;

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

    /** @param {number} gameid ゲームID */
    #drawResult(gameid) {
        if (!this.#handler) return;
        if (this.#_results == null) return;
        if (gameid >= this.#_results.length) return;
        const result = this.#_results[gameid];

        for (const [teamidstr, data] of Object.entries(result.teams)) {
            const teamid = parseInt(teamidstr, 10);
            const teamnode = this.#generateTeamNodeForSingle();
            
            // テキスト設定
            teamnode.name.dataset.name = data.name;
            teamnode.name.innerText = this.#handler.getTeamResultName(teamid, data.name);
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
                playernode.name.innerText = this.#handler.getPlayerName(player.id);
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
        if (this.#_results == null) return;
        if (this.#info == null) return;

        // infonodesの数を調整
        if (this.#infonodes.length > this.#_results.length) {
            // 削除
            for (let i = this.#infonodes.length; i <= this.#_results.length; --i) {
                this.#infonodes.pop(); // 最後の要素を削除
                if (this.#info.lastChild) {
                    this.#info.removeChild(this.#info.lastChild); // 最後の要素を削除
                }
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
            node.gamenumber.innerHTML = '<span class="en">Game</span><span class="ja">マッチ</span> ' + (i + 1);
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

    /** @param {string|number} target 対象ゲーム('all'またはゲームID) */
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

        // マッチポイント閾値を取得
        const matchpoints = ('calcmethod' in this.#tournamentparams && 'matchpoints' in this.#tournamentparams.calcmethod && this.#tournamentparams.calcmethod.matchpoints > 0) ? this.#tournamentparams.calcmethod.matchpoints : 0;

        // ポイントを計算して追加
        for (const [teamidstr, team] of Object.entries(data)) {
            const teamid = parseInt(teamidstr, 10);
            const advancepoint = getAdvancePoints(teamid, this.#tournamentparams);
            for (let gameid = 0; gameid < team.kills.length; ++gameid) {
                let points;
                if (target == 'all') {
                    points = calcPoints(gameid, team.placements[gameid], team.kills[gameid], this.#tournamentparams);
                } else {
                    points = calcPoints(target, team.placements[gameid], team.kills[gameid], this.#tournamentparams);
                }
                team.points.push(points.total);
                team.kill_points.push(points.kills);
                team.placement_points.push(points.placement);
                team.other_points.push(points.other);
                team.cumulative_points.push(advancepoint + team.points.reduce((p, c) => p + c, 0));
            }

            if (target == 'all') {
                team.total_points = advancepoint + team.points.reduce((a, c) => a + c, 0);
                // マッチポイント到達の確認
                if (matchpoints > 0 && team.total_points >= matchpoints) {
                    team.matchpoints = true;
                }
            } else {
                team.total_points = team.points.reduce((a, c) => a + c, 0);
            }
        }

        // マッチポイントの勝者決定
        if (target == 'all' && matchpoints > 0) {
            for (const i of [...Array(this.#_results.length).keys()]) {
                if (i == 0) continue;
                for (const team of Object.values(data)) {
                    const prev_points = team.cumulative_points[i - 1];
                    const placement = team.placements[i];
                    if (prev_points >= matchpoints && placement == 1) {
                        team.winner = true;
                        break;
                    }
                }
                // 勝者決定済
                if (Object.values(data).some(x => x.winner)) break;
            }
        }

        // results -> table
        const p = setRankParameterToTeamResults(data);

        // 表示
        for (let i = 0; i < p.length; ++i) {
            const teamid = parseInt(p[i], 10);
            const team = data[teamid];
            
            // 描画
            if (target == 'all') {
                this.#drawTeamForAll(i, p.length, team);
            } else {
                this.#drawTeamForAll(i, p.length, team, this.#_results[target].teams[teamid].placement);
            }
        }
    }

    /** @param {number} gameid ゲームID */
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

    /**
     * @param {string} hash プレイヤーのハッシュ
     * @param {object} node ノード情報
     */
    #savePlayerNode(hash, node) {
        if (!this.#players.has(hash)) {
            this.#players.set(hash, {
                nodes: new Set(),
            });
        }
        const player = this.#players.get(hash);
        player.nodes.add(node);
    }

    /**
     * @param {string} hash プレイヤーのハッシュ
     * @param {string} name プレイヤー名
     */
    setPlayerName(hash, name) {
        if (!this.#players.has(hash)) {
            this.#players.set(hash, {
                nodes: new Set(),
            });
        }
        const player = this.#players.get(hash);
        player.name = name;
        for (const node of player.nodes) {
            node.innerText = name;
        }
    }

    /**
     * @param {number} id チームID
     * @param {object} node ノード情報
     */
    #saveTeamNode(id, node) {
        if (!this.#teams.has(id)) {
            this.#teams.set(id, {
                nodes: new Set(),
            });
        }
        const team = this.#teams.get(id);
        team.nodes.add(node);
    }

    clear() {
        this.#info.innerHTML = '';
        this.#left.innerHTML = '';
        this.#right.innerHTML = '';
        this.#single.innerHTML = '';
        this.#nodes.splice(0);
        this.#infonodes.splice(0);
        for (const [playerid, data] of this.#players) {
            data.nodes.clear();
        }
        for (const [teamid, data] of this.#teams) {
            data.nodes.clear();
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
        this.#all.classList.remove('hide');
        this.#single.classList.remove('hide');
    }

    /**
     * リザルト部分を表示する
     */
    showBothResultView() {
        this.#all.classList.remove('hide');
        this.#single.classList.remove('hide');
    }

    /**
     * リザルト部分の表示を非表示にする
     */
    hideBothResultView() {
        this.#all.classList.add('hide');
        this.#single.classList.add('hide');
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
        this.#all.classList.remove('hide');
        this.#hideSingleGameResult();
    }

    /**
     * 表示対象のリザルトを設定する
     * @param {object[]} results 表示するリザルト
     */
    setResults(results) {
        this.#_results = results;
        if (this.#current == 'all') {
            this.showAllResults();
        } else {
            this.showSingleGameResult(this.#current);
        }
    }

    /**
     * 再度計算する
     */
    recalcAll() {
        this.#drawResults('all');
        if (this.#_results instanceof Array) {
            for (let i = 0; i < this.#_results.length; ++i) {
                this.#drawResults(i);
            }
        }
    }

    /**
     * リザルト表示用にゲームオブジェクトを設定する
     * @param {object} game webapiのゲームオブジェクト
     */
    setGame(game) {
        this.#_game = game;
    }

    /**
     * ポイント計算用にトーナメントのparamsをセットする
     * @param {object} params トーナメントparams
     */
    setTournamentParams(params) {
        this.#tournamentparams = params;
        this.recalcAll();
    }

    /**
     * @param {string} fragment URLのハッシュ部分
     * @param {string} mainmenu メインメニューの識別子
     * @param {string} submenu サブメニューの識別子
     */
    setURLHash(fragment, mainmenu, submenu) {
        if (mainmenu == 'result') {
            if (submenu == 'all') {
                this.showAllResults();
            } else {
                const gameid = parseInt(submenu, 10);
                if (submenu == gameid.toString()) {
                    this.showSingleGameResult(gameid);
                }
            }
        }
    }

    /**
     * @param {number} teamid チームID
     * @param {string} name チーム名
     */
    setTeamParamsName(teamid, name) {
        if (!this.#handler) return;
        if (this.#teams.has(teamid)) {
            const team = this.#teams.get(teamid);
            for (const node of team.nodes) {
                const resultname = node.dataset.name;
                node.innerText = this.#handler.getTeamResultName(teamid, resultname);
            }
        }
    }
}

class ResultFixView extends WebAPIConfigBase {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #gameid = 0;
    #result = null;
    #fixedresult = null;
    #dragging_teamid = 0;
    #statscodes = new Map();

    constructor() {
        super("result-fix-");
        this.getNode("buttons");
        this.getNode("placement-update-button");
        this.getNode("kills-update-button");
        this.getNode("from-stats-submit-button");
        this.getNode("placement");
        this.getNode("placementnodes");
        this.getNode("kills");
        this.getNode("killsnodes");
        this.getNode("from-stats-code");
        this.getNode("from-stats-code-lists");
        this.getNode("from-stats-code-diff-lists");

        this.nodes["placement-update-button"].addEventListener("click", (ev) => {
            this.#updatePlacement();
        });

        this.nodes["kills-update-button"].addEventListener("click", (ev) => {
            this.#updateKills();
        });
    }

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
        const api = handler.getWebAPI();

        this.nodes["from-stats-submit-button"].addEventListener("click", (ev) => {
            if (this.#fixedresult != null) {
                api.setTournamentResult(this.#gameid, this.#fixedresult);
            }
        });

        document.getElementById('result-fix-from-stats-code-button').addEventListener('click', (ev) => {
            const code = document.getElementById("result-fix-from-stats-code-input").value;
            if (code.match(/^[0-9a-f]+-[0-9a-f]+$/)) {
                api.getStatsFromCode(code);
            }
        });
    }

    hideAll() {
        this.hideFixPlacementView();
        this.hideFixKillsView();
    }

    /**
     * リザルトのコピーを保持する
     * @param {number} gameid ゲームID(0～)
     * @param {object} result リザルト
     */
    setResult(gameid, result) {
        this.#gameid = gameid;
        this.#result = JSON.parse(JSON.stringify(result));

        this.checkResultFromStats();
    }

    /**
     * @param {string} statscode statscode
     * @param {object[]} results statscodeに紐づくリザルトリスト
     */
    setStatsFromCode(statscode, results) {
        this.#statscodes.set(statscode, { update: Date.now(), matches: results });
        this.checkResultFromStats();
    }

    /**
     * 現在保存されているstatsから、リザルト修正の必要性を確認する
     */
    checkResultFromStats() {
        if (!this.#handler) return;
        if (!this.#result) return;

        // 保持しているstats概要を表示
        this.nodes["from-stats-code-lists"].innerText = "";
        for (const [statscode, v] of this.#statscodes) {
            const date = (new Date(v.update)).toLocaleString();
            const div = document.createElement('div');
            div.innerText = `${statscode}[${date}](${v.matches.length}matches)`;
            for (const m of v.matches.sort((a, b) => a.start - b.start)) {
                // jsonのリンクを作成
                const a = document.createElement('a');
                a.textContent = (new Date(m.start)).toLocaleString();
                const type = 'application/json';
                a.href = window.URL.createObjectURL(new Blob([JSON.stringify(m)], { type: type }));
                a.download = `${m.start}.json`;
                div.appendChild(a);
            }
            this.nodes["from-stats-code-lists"].appendChild(div);
        }

        // 既に適用済みか確認する
        let fixed = false;
        if (typeof(this.#gameid) == "number" && typeof(this.#result) == "object") {
            if ('matchid' in this.#result) {
                // 適用済み
                fixed = true;
            } else {
                // 未適用
                fixed = false;
            }
        }

        // 適用可能なデータがあるか確認
        const diff = [];
        this.#fixedresult = null;
        for (const [statscode, v] of this.#statscodes) {
            for (const m of v.matches) {
                const s = this.#result;
                if (s.start <= m.end && m.start <= s.end && m.map == s.map) {
                    if (this.#comparePlayers(s, m)) {
                        this.#fixedresult = JSON.parse(JSON.stringify(s));
                        this.#fixedresult.matchid = m.matchid;
                        this.#fixedresult.statscode = statscode;
                        for(const [k, t] of Object.entries(m.teams)) {
                            const st = this.#fixedresult.teams[k];
                            const teamname = this.#handler.getTeamResultName(k, st.name);
                            if (st.kills != t.kills) {
                                diff.push(`team [${teamname}] kills not match ${st.kills}=>${t.kills}`);
                                st.kills = t.kills;
                            }
                            if (st.placement != t.placement) {
                                diff.push(`team [${teamname}] placement not match ${st.placement}=>${t.placement}`);
                                st.placement = t.placement;
                            }
                            for (const p of t.players) {
                                const sp = st.players.find((t) => p.id == t.id);
                                if (sp) {
                                    const playername = this.#handler.getPlayerName(p.id);
                                    if (sp.assists != p.assists) {
                                        diff.push(`player [${playername}] assists not match ${sp.assists}=>${p.assists}`);
                                        sp.assists = p.assists;
                                    }
                                    sp.assists = p.assists;
                                    sp.character = p.character;
                                    if (sp.damage_dealt != p.damage_dealt) {
                                        diff.push(`player [${playername}] damage_dealt not match ${sp.damage_dealt}=>${p.damage_dealt}`);
                                        sp.damage_dealt = p.damage_dealt;
                                    }
                                    sp.hardware = p.hardware;
                                    sp.headshots = p.headshots;
                                    sp.hits = p.hits;
                                    if (sp.kills != p.kills) {
                                        diff.push(`player [${playername}] kills not match ${sp.kills}=>${p.kills}`);
                                        sp.kills = p.kills;
                                    }
                                    sp.knockdowns = p.knockdowns;
                                    sp.respawns_given = p.respawns_given;
                                    sp.revives_given = p.revives_given;
                                    sp.shots = p.shots;
                                    sp.survival_time = p.survival_time;
                                }
                            }
                        }
                    }
                }
            }
        }

        // 適用済みメッセージの表示
        if (fixed) {
            document.getElementById('rffs-already-fixed').classList.remove('hide');
        } else {
            document.getElementById('rffs-already-fixed').classList.add('hide');
        }

        // 適用可能データなしメッセージの表示
        if (this.#fixedresult == null) {
            document.getElementById('rffs-data-not-found').classList.remove('hide');
        } else {
            document.getElementById('rffs-data-not-found').classList.add('hide');
        }

        // 差分を表示する
        this.nodes["from-stats-code-diff-lists"].innerHTML = "";
        if (this.#fixedresult) {
            for (const txt of diff) {
                const div = document.createElement('div');
                div.innerText = txt;
                this.nodes["from-stats-code-diff-lists"].appendChild(div);
            }
            if (diff.length == 0) {
                this.nodes["from-stats-code-diff-lists"].innerText = "data is correct.";
            }
        }

        // 存在する場合は修正される差異を表示(修正ボタン表示)
        if (this.#fixedresult && (!fixed || diff.length > 0)) {
            document.getElementById('result-fix-from-stats-submit-area').classList.remove('hide');
        } else {
            document.getElementById('result-fix-from-stats-submit-area').classList.add('hide');
        }
    }

    /**
     * 2つのリザルトのプレイヤーに差異がないか確認する(IDのみ確認)
     * @param {object} a 比較対象のresult
     * @param {object} b 比較対象のresult
     * @returns {boolean} 差異がない場合はtrue
     */
    #comparePlayers(a, b) {
        for (const [a_k, a_t] of Object.entries(a.teams)) {
            if (!(a_k in b.teams)) return false;
            const b_t = b.teams[a_k];
            for (const a_p of a_t.players) {
                if (!b_t.players.find((t) => a_p.id == t.id)) return false;
            }
        }
        for (const [b_k, b_t] of Object.entries(b.teams)) {
            if (!(b_k in a.teams)) return false;
            const a_t = a.teams[b_k];
            for (const b_p of b_t.players) {
                if (!a_t.players.find((t) => b_p.id == t.id)) return false;
            }
        }
        return true;
    }

    /**
     * 順位修正用の画面を描画する
     */
    drawPlacement() {
        // 全要素削除
        const nodes = this.nodes.placementnodes;
        while (nodes.firstChild) {
            nodes.removeChild(nodes.firstChild);
        }
        // チームIDを抜き出す
        const p = Object.keys(this.#result.teams);
        p.sort((a, b) => {
            const pa = this.#result.teams[a].placement;
            const pb = this.#result.teams[b].placement;
            if (pa < pb) return -1;
            if (pa > pb) return  1;
            return 0;
        });

        // 表示
        for (let i = 0; i < p.length; ++i) {
            const teamid = parseInt(p[i], 10);
            const team = this.#result.teams[teamid];
            const teamname = this.#handler.getTeamResultName(teamid, team.name);
            const div = htmlToElement(
                `<div class="rf-placement-node" draggable="true">
                    <div class="rf-placement">
                        <div class="rf-placement-label">
                            <span class="en">rank</span>
                            <span class="ja">順位</span>
                        </div>
                        <div class="rf-placement-value">
                            ${i + 1}
                        </div>
                    </div>
                    <div class="rf-prev-placement">
                        <div class="rf-prev-placement-label">
                            <span class="en">before</span>
                            <span class="ja">修正前の順位</span>
                        </div>
                        <div class="rf-prev-placement-value">
                            ${team.placement}
                        </div>
                    </div>
                    <div class="rf-teamid">
                        <div class="rf-teamid-label">
                            <span class="en">team no.</span>
                            <span class="ja">チーム番号</span>
                        </div>
                        <div class="rf-teamid-value">
                            ${teamid + 1}
                        </div>
                    </div>
                    <div class="rf-teamname">
                        <div class="rf-teamname-label">
                            <span class="en">team name</span>
                            <span class="ja">チーム名</span>
                        </div>
                        <div class="rf-teamname-value">
                            ${teamname}
                        </div>
                    </div>
                </div>`
            );
            const getTeamIdFromNode = (node) => {
                return parseInt(node.children[2].children[1].innerText, 10) - 1;
            };
            const getNodeFromTeamId = (id) => {
                for (const node of nodes.children) {
                    const nid = getTeamIdFromNode(node);
                    if (id == nid) return node;
                }
                return null;
            };
            nodes.appendChild(div);
            {
                const n = nodes.lastChild;
                n.addEventListener('dragstart', (ev) => {
                    ev.dataTransfer.effectAllowed = "move";
                    this.#dragging_teamid = teamid;
                    n.classList.add('dragging');
                });
                n.addEventListener('dragenter', (ev) => {
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = "move";
                    if (teamid != this.#dragging_teamid) {
                        // 入れ替える
                        const node = getNodeFromTeamId(this.#dragging_teamid);
                        const children = [].slice.call(nodes.children);
                        const dragging_index = children.indexOf(node);
                        const target_index = children.indexOf(n);
                        if (target_index < dragging_index) {
                            nodes.insertBefore(node, n);
                        } else {
                            nodes.insertBefore(node, nodes.children[target_index + 1]);
                        }

                        // 入替後の順位確定
                        for (let i = 0; i < nodes.children.length; ++i) {
                            const node = nodes.children[i];
                            node.children[0].children[1].innerText = i + 1;
                            const curr = node.children[0].children[1].innerText;
                            const prev = node.children[1].children[1].innerText;
                            if (curr == prev) {
                                node.children[0].children[1].classList.remove('rf-changed');
                            } else {
                                node.children[0].children[1].classList.add('rf-changed');
                            }
                        }
                    }
                });
                n.addEventListener('dragleave', (ev) => {
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = "move";
                });
                n.addEventListener('dragover', (ev) => {
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = "move";
                });
                n.addEventListener('dragend', (ev) => {
                    ev.preventDefault();
                    n.classList.remove('dragging');
                    ev.dataTransfer.dropEffect = "move";
                });
                n.addEventListener('drop', (ev) => {
                    ev.preventDefault();
                    n.classList.remove('dragging');
                    ev.dataTransfer.dropEffect = "move";
                });
            }
        }
    }

    /**
     * キル数修正用の画面を表示する
     */
    drawKills() {
        // 全要素削除
        const nodes = this.nodes.killsnodes;
        while (nodes.firstChild) {
            nodes.removeChild(nodes.firstChild);
        }

        for (const [teamidstr, team] of Object.entries(this.#result.teams)) {
            const teamid = parseInt(teamidstr, 10);
            const teamname = this.#handler.getTeamResultName(teamid, team.name);
            const div = htmlToElement(
                `<div class="rf-kills-node">
                    <div class="rf-kills-teamheader">
                        <div class="rf-kills-teamid" data-teamid="${teamid}">
                            ${teamid + 1}
                        </div>
                        <div class="rf-kills-teamname">
                            ${teamname}
                        </div>
                        <div class="rf-kills-teamkills" data-prev="${team.kills}">
                            ${team.kills}
                        </div>
                    </div>
                    <div class="rf-kills-players">
                    </div>
                </div>`
            );
            nodes.appendChild(div);
            const tn = nodes.lastChild;
            const checkTeamKills = (node) => {
                let teamkills = 0;
                for (const pn of node.children[1].children) {
                    let kills = parseInt(pn.children[1].innerText, 10);
                    teamkills += kills;
                }
                node.children[0].children[2].innerText = teamkills;
                if (node.children[0].children[2].dataset.prev == teamkills.toString()) {
                    node.children[0].children[2].classList.remove('rf-changed');
                } else {
                    node.children[0].children[2].classList.add('rf-changed');
                }
            };

            for (const player of team.players) {
                const playername = this.#handler.getPlayerName(player.id);
                const div = htmlToElement(
                    `<div class="rf-kills-player-node" data-id="${player.id}">
                        <div class="rf-kills-player-name">
                            ${playername}
                        </div>
                        <div class="rf-kills-player-kills" data-prev="${player.kills}">
                            ${player.kills}
                        </div>
                        <div class="rf-kills-player-buttons">
                            <button>+</button><button>-</button>
                        </div>
                    </div>`
                );
                tn.children[1].appendChild(div);
                const pn = tn.children[1].lastChild;
                // 増加・減少操作
                pn.children[2].children[0].addEventListener('click', (ev) => {
                    // +
                    let kills = parseInt(pn.children[1].innerText, 10);
                    kills++;
                    pn.children[1].innerText = kills;
                    if (pn.children[1].dataset.prev == pn.children[1].innerText.trim()) {
                        pn.children[1].classList.remove('rf-changed');
                    } else {
                        pn.children[1].classList.add('rf-changed');
                    }
                    checkTeamKills(tn);
                });
                pn.children[2].children[1].addEventListener('click', (ev) => {
                    // -
                    let kills = parseInt(pn.children[1].innerText, 10);
                    if (kills > 0) kills--;
                    pn.children[1].innerText = kills;
                    if (pn.children[1].dataset.prev == pn.children[1].innerText.trim()) {
                        pn.children[1].classList.remove('rf-changed');
                    } else {
                        pn.children[1].classList.add('rf-changed');
                    }
                    checkTeamKills(tn);
                });
            }
        }
    }

    #updatePlacement() {
        const nodes = this.nodes.placementnodes;

        // 修正点の抜き出し
        const updates = [];
        for (const node of nodes.children) {
            const curr_rank = parseInt(node.children[0].children[1].innerText, 10);
            const prev_rank = parseInt(node.children[1].children[1].innerText, 10);
            const teamid = parseInt(node.children[2].children[1].innerText, 10) - 1;
            if (curr_rank != prev_rank) {
                updates.push({ id: teamid, placement: curr_rank });
            }
        }

        if (updates.length == 0) return;

        // コピー
        const result = JSON.parse(JSON.stringify(this.#result));

        // 修正
        for (const update of updates) {
            result.teams[update.id].placement = update.placement;
        }

        // 修正送信
        this.#handler.getWebAPI().setTournamentResult(this.#gameid, result);
    }

    #updateKills() {
        const nodes = this.nodes.killsnodes;
        // 修正点の抜き出し
        const updates = {};
        for (const node of nodes.children) {
            const curr_team_kills = parseInt(node.children[0].children[2].innerText, 10);
            const prev_team_kills = parseInt(node.children[0].children[2].dataset.prev, 10);
            const teamid = node.children[0].children[0].dataset.teamid;
            if (curr_team_kills != prev_team_kills) {
                const playerupdate = {};
                for (const pn of node.children[1].children) {
                    const curr_kills = parseInt(pn.children[1].innerText.trim(), 10);
                    const prev_kills = parseInt(pn.children[1].dataset.prev, 10);
                    if (curr_kills != prev_kills) {
                        const playerhash = pn.dataset.id;
                        playerupdate[playerhash] = curr_kills;
                    }
                }
                updates[teamid] = { kills: curr_team_kills, players: playerupdate };
            }
        }
        if (Object.keys(updates).length == 0) return;

        // コピー
        const result = JSON.parse(JSON.stringify(this.#result));

        // 修正
        for (const [teamid, data] of Object.entries(updates)) {
            const team = result.teams[teamid];
            team.kills = data.kills;
            for (const player of team.players) {
                if (player.id in data.players) {
                    player.kills = data.players[player.id];
                }
            }
        }

        // 修正送信
        this.#handler.getWebAPI().setTournamentResult(this.#gameid, result);
    }

    showSwitchViewButton() {
        this.nodes.buttons.classList.remove("hide");
    }

    hideSwitchViewButton() {
        this.nodes.buttons.classList.add("hide");
    }

    showFixPlacementView() {
        this.nodes.placement.classList.remove("hide");
    }

    hideFixPlacementView() {
        this.nodes.placement.classList.add("hide");
    }

    showFixKillsView() {
        this.nodes.kills.classList.remove("hide");
    }

    hideFixKillsView() {
        this.nodes.kills.classList.add("hide");
    }

    showFixFromStatsCodeView() {
        this.nodes["from-stats-code"].classList.remove("hide");
    }

    hideFixFromStatsCodeView() {
        this.nodes["from-stats-code"].classList.add("hide");
    }

    /**
     * @param {string} fragment URLのハッシュ部分
     * @param {string} mainmenu メインメニューの識別子
     * @param {string} submenu サブメニューの識別子
     */
    setURLHash(fragment, mainmenu, submenu) {
        if (mainmenu == 'result') {
            if (submenu == 'all') {
                this.hideSwitchViewButton();
                this.hideAll();
            } else {
                const gameid = parseInt(submenu, 10);
                if (submenu == gameid.toString()) {
                    this.showSwitchViewButton();
                    this.setResult(gameid, this.#handler.getResults()[gameid]);
                    this.hideAll();
                    this.showFixFromStatsCodeView();
                }
            }
        }
    }
}

class OverlayForceHideView {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #forcehide = {};
    #ids = new Set(["leaderboard", "mapleaderboard", "teambanner", "playerbanner", "teamkills", "owneditems", "gameinfo", "championbanner", "squadeliminated", "teamrespawned", "tdmscoreboard"]);
    #default_forcehide_ids = new Set(["playerbanner"]);

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
        const api = handler.getWebAPI();
        // checkbox
        for (const id of this.#ids) {
            document.getElementById('overlay-hide-' + id).addEventListener('change', (ev) => {
                this.#updateOverlayStatus(id);
                this.#handler.setTournamentParamsForceHide(this.#forcehide);
            });
        }

        document.getElementById('overlay-hide-teamplayerinfo').addEventListener('change', (ev) => {
            const teamplayeroverlays = ["teambanner", "playerbanner", "teamkills", "owneditems"];
            for (const id of teamplayeroverlays) {
                document.getElementById('overlay-hide-' + id).checked = ev.target.checked;
                this.#updateOverlayStatus(id);
            }
            this.#handler.setTournamentParamsForceHide(this.#forcehide);
        });
    }

    /**
     * オーバーレイの表示/非表示パラメータをトーナメントparamsに設定
     * @param {string} id オーバーレイの名前
     */
    #updateOverlayStatus(id) {
        const checked = document.getElementById('overlay-hide-' + id).checked;
        this.#forcehide[id] = checked;
    }

    /** @param {Object} params */
    setTournamentParams(params) {
        if (!('forcehide' in params)) {
            this.#forcehide = {};
        } else {
            this.#forcehide = structuredClone(params.forcehide);
        }
        for (const id of this.#ids) {
            if (!(id in this.#forcehide)) {
                this.#forcehide[id] = this.#default_forcehide_ids.has(id);
            }
            document.getElementById('overlay-hide-' + id).checked = this.#forcehide[id];
        }

        // group [teamplayerinfo]
        if (this.#forcehide.teambanner == this.#forcehide.playerbanner &&
            this.#forcehide.teambanner == this.#forcehide.teamkills &&
            this.#forcehide.teambanner == this.#forcehide.owneditems) {
                document.getElementById('overlay-hide-teamplayerinfo').checked = this.#forcehide.teambanner;
        }
    }
}

class TestView {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
        const api = handler.getWebAPI();

        document.getElementById('test-change-gamestate').addEventListener('click', (ev) => {
            const state_table = ["WaitingForPlayers", "PreGamePreview", "PickLoadout", "Prematch", "Playing", "Resolution", "Postmatch"];
            const current_state = document.getElementById('test-gamestate-current').innerText;
            const current_index = state_table.indexOf(current_state);
            const next_index = ((current_index + 1) % state_table.length);
            const next_state = state_table[next_index];
            document.getElementById('test-gamestate-current').innerText = next_state;
            api.broadcastObject({
                type: "testgamestate",
                state: next_state
            });
        });

        document.getElementById('test-show-teambanner').addEventListener('click', (ev) => {
            api.broadcastObject({
                type: "testteambanner"
            });
        });

        document.getElementById('test-show-mapleaderboard').addEventListener('click', (ev) => {
            api.broadcastObject({
                type: "testmapleaderboard"
            });
        });

        document.getElementById('test-show-camera-down').addEventListener('click', (ev) => {
            const teamid = (parseInt(document.getElementById("test-teambanner-teamid").value, 10) - 1 - 1 + 30) % 30;
            document.getElementById("test-teambanner-teamid").value = teamid + 1;
            api.broadcastObject({
                type: "testcamera",
                teamid: teamid
            });
        });

        document.getElementById('test-show-camera-up').addEventListener('click', (ev) => {
            const teamid = (parseInt(document.getElementById("test-teambanner-teamid").value, 10) - 1 + 1) % 30;
            document.getElementById("test-teambanner-teamid").value = teamid + 1;
            api.broadcastObject({
                type: "testcamera",
                teamid: teamid
            });
        });

        document.getElementById('test-show-playerbanner').addEventListener('click', (ev) => {
            const name = document.getElementById("test-playerbanner-name").value;
            if (name != "") {
                api.broadcastObject({
                    type: "testplayerbanner",
                    name: name
                });
            }
        });

        document.getElementById('test-show-teamkills-up').addEventListener('click', (ev) => {
            const kills = parseInt(document.getElementById("test-teamkills-kills").value, 10) + 1;
            document.getElementById("test-teamkills-kills").value = kills;
            if (kills >= 0) {
                api.broadcastObject({
                    type: "testteamkills",
                    kills: kills
                });
            }
        });

        document.getElementById('test-show-teamkills-down').addEventListener('click', (ev) => {
            const kills = parseInt(document.getElementById("test-teamkills-kills").value, 10);
            const downed_kills = kills <= 0 ? 0 : kills - 1;
            document.getElementById("test-teamkills-kills").value = downed_kills;
            api.broadcastObject({
                type: "testteamkills",
                kills: downed_kills
            });
        });

        document.getElementById('test-show-owneditems').addEventListener('click', (ev) => {
            const items = ["backpack", "knockdownshield", "syringe", "medkit", "shieldcell", "shieldbattery", "phoenixkit", "ultimateaccelerant", "fraggrenade", "thermitgrenade", "arcstar"];
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
            api.broadcastObject(data);
        });

        document.getElementById('test-show-gamecount-up').addEventListener('click', (ev) => {
            const count = parseInt(document.getElementById("test-gamecount").value, 10);
            const nextcount = count + 1;
            document.getElementById("test-gamecount").value = nextcount;
            api.broadcastObject({
                type: "testgamecount",
                count: nextcount
            });
        });

        document.getElementById('test-show-gamecount-down').addEventListener('click', (ev) => {
            const count = parseInt(document.getElementById("test-gamecount").value, 10);
            const nextcount = count <= 1 ? 1 : count - 1;
            document.getElementById("test-gamecount").value = nextcount;
            api.broadcastObject({
                type: "testgamecount",
                count: nextcount
            });
        });

        document.getElementById('test-show-squadeliminated').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-squadeliminated-teamid").value, 10);
            const placement = parseInt(document.getElementById("test-squadeliminated-placement").value, 10);
            if (teamid >= 1) {
                api.broadcastObject({
                    type: "testsquadeliminated",
                    placement: placement,
                    teamid: teamid - 1
                });
            }
        });

        document.getElementById('test-show-teamrespawned').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-teamrespawned-teamid").value, 10);
            const respawn_player = document.getElementById("test-teamrespawned-respawn-player").value;
            const respawned_players = document.getElementById("test-teamrespawned-respawned-players").value.split(',').map(x => x.trim());
            if (teamid >= 1) {
                api.broadcastObject({
                    type: "testteamrespawned",
                    teamid: teamid - 1,
                    respawn_player: respawn_player,
                    respawned_players: respawned_players
                });
            }
        });

        document.getElementById('test-show-winnerdetermine').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-winnerdetermine-teamid").value, 10);
            if (teamid >= 1) {
                api.broadcastObject({
                    type: "testwinnerdetermine",
                    teamid: teamid - 1
                });
            }
        });

        document.getElementById('test-show-winnerdetermine-reset').addEventListener('click', (ev) => {
            api.broadcastObject({
                type: "testwinnerdeterminereset"
            });
        });

        document.getElementById('test-reload').addEventListener('click', (ev) => {
            api.broadcastObject({
                type: "testreload"
            });
        });

        document.getElementById('test-setteamname').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-setteamname-teamid").value, 10);
            const teamname = document.getElementById("test-setteamname-teamname").value;
            if (teamname && teamname != "") {
                api.sendSetTeamName(teamid, teamname);
            }
        });

        document.getElementById('test-setspawnpoint').addEventListener('click', (ev) => {
            const teamid = parseInt(document.getElementById("test-setspawnpoint-teamid").value, 10);
            const spawnpoint = parseInt(document.getElementById("test-setspawnpoint-spawnpoint").value, 10);
            api.sendSetSpawnPoint(teamid, spawnpoint);
        });

        document.getElementById('test-pausetoggle').addEventListener('click', (ev) => {
            const pretimer = parseFloat(document.getElementById("test-pausetoggle-pretimer").value);
            if (0.0 < pretimer && pretimer < 10.0) {
                api.pauseToggle(pretimer);
            }
        });

        document.getElementById('test-setsettings-we').addEventListener('click', (ev) => {
            const set_settings = (ev) => {
                const d = ev.detail;
                api.sendSetSettings('des_hu_pm', d.adminchat, d.teamrename, d.selfassign, true, true).then(() => {
                    api.sendGetSettings();
                });
            };
            api.addEventListener('custommatchsettings', set_settings, { once: true });
            api.sendGetSettings().catch(() => {
                api.removeEventListener('custommatchsettings', set_settings, { once: true });
            });
        });

        document.getElementById('test-setsettings-sp').addEventListener('click', (ev) => {
            const set_settings = (ev) => {
                const d = ev.detail;
                api.sendSetSettings('tropic_mu2_pm', d.adminchat, d.teamrename, d.selfassign, true, true).then(() => {
                    api.sendGetSettings();
                });
            };
            api.addEventListener('custommatchsettings', set_settings, { once: true });
            api.sendGetSettings().catch(() => {
                api.removeEventListener('custommatchsettings', set_settings, { once: true });
            });
        });

        document.getElementById('test-getsettings').addEventListener('click', (ev) => {
            api.sendGetSettings();
        });

        document.getElementById('test-setendringexclusion').addEventListener('click', ev => {
            const sectionstr = document.getElementById('test-setendringexclusion-select').value;
            const section = parseInt(sectionstr, 10);
            api.sendSetEndRingExclusion(section);
        });

        document.getElementById('test-joinpartyserver').addEventListener('click', ev => {
            api.sendJoinPartyServer();
        });
    }

    /** @param {Object} settings */
    setCustomMatchSettings(settings) {
        document.getElementById('test-settings-we-adminchat').checked = settings.adminchat;
        document.getElementById('test-settings-we-teamrename').checked = settings.teamrename;
        document.getElementById('test-settings-we-selfassign').checked = settings.selfassign;
    }
}

class OverlayStatusView {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;
    #base = document.getElementById('overlay-status');
    #tbody = this.#base.querySelector('tbody');
    #lastcheck = 0;

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
    }

    #removeOldStatus() {
        const now = Date.now();
        for (const tr of this.#tbody.children) {
            const time = parseInt(tr.dataset.updated, 10);
            if (now - time > 5000) {
                this.#tbody.removeChild(tr);
            }
        }
    }

    /** @param {Object} obj */
    receiveBroadcastObject(obj) {
        if (!obj || !('data' in obj)) return;
        if (!('type' in obj.data)) return;
        if (!('data' in obj.data)) return;
        if (obj.data.type != 'overlaystatus') return;
        const status = obj.data.data;
        // 既存のステータスを更新
        let tr = this.#tbody.querySelector(`tr[data-id="${status.id}"]`);
        if (tr) {
            // ステータスの更新
            tr.dataset.updated = status.lastsendtime;
            tr.children[1].innerText = (new Date(status.inittime)).toLocaleString();
            tr.children[2].innerText = (new Date(status.lastsendtime)).toLocaleString();
        } else {
            // ステータスの追加
            tr = document.createElement('tr');
            tr.dataset.id = status.id;
            tr.dataset.updated = status.lastsendtime;
            tr.appendChild(document.createElement('td')).innerText = status.url;
            tr.appendChild(document.createElement('td')).innerText = (new Date(status.inittime)).toLocaleString();
            tr.appendChild(document.createElement('td')).innerText = (new Date(status.lastsendtime)).toLocaleString();
            const td_action = tr.appendChild(document.createElement('td'));

            // アクションの定義
            const btn_reload = document.createElement('button');
            btn_reload.innerHTML = '<span class="en">reload</span><span class="ja">再読込</span>';
            td_action.appendChild(btn_reload);
            btn_reload.addEventListener('click', (ev) => {
                this.#handler.getWebAPI().broadcastObject({
                    type: "reload",
                    id: status.id
                });
            });

            // 列の追加
            this.#tbody.appendChild(tr);
        }

        // 古いステータスの削除
        if (Date.now() - this.#lastcheck >= 1000) {
            this.#removeOldStatus();
            this.#lastcheck = Date.now();
        }
    }
}

class AnnouncementView {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
        const api = handler.getWebAPI();

        document.getElementById('announce-button').addEventListener('click', (ev) => {
            const text = document.getElementById('announce-text').value;
            if (text != "") {
                api.sendChat(text);
            }
        });
    }
}

class ManualPostMatchView {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;

    /** @param {WebAPIWorkerHandler} handler */
    setHandler(handler) {
        this.#handler = handler;
        const api = handler.getWebAPI();

        document.getElementById('manualpostmatch-send').addEventListener('click', (ev) => {
            api.manualPostMatch();
        });
    }
}


class LeftResultSelector {
    #appendOrRemoveResultMenu(count) {
        const ul = document.getElementById('ulresult');
        if (count + 1 > ul.children.length) {
            // append
            for (let i = ul.children.length - 1; i < count; ++i) {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = '#result-' + i;
                a.innerHTML = '<span class="en">Game</span><span class="ja">マッチ</span> ' + (i + 1);
                li.appendChild(a);
                ul.appendChild(li);

                // クラス設定
                if (getFragment(location.hash) == ('result-' + i)) {
                    a.classList.add('sidebar-selected');
                }
            }
        } else if (count + 1 < ul.children.length) {
            // remove
            while (count + 1 < ul.children.length) {
                if (ul.lastChild) {
                    ul.removeChild(ul.lastChild);
                }
            }
        }
    }

    /** @param {Array} results */
    setResults(results) {
        this.#appendOrRemoveResultMenu(results.length);
    }

    /**
     * @param {string} id トーナメントID
     * @param {string} name トーナメント名
     * @param {number} count マッチ数
     */
    setCurrentTournament(id, name, count) {
        this.#appendOrRemoveResultMenu(count);
    }
}

class VersionView {
    constructor() {
        fetch('version.json').then(r => {
            return r.json();
        }).then(j => {
            if ('version' in j) {
                this.#setHTMLVersion(j.version);
            }
        });
    }

    /** @param {string} version HTMLバージョン */
    #setHTMLVersion(version) {
        document.getElementById('htmlversion').textContent = version;
    }

    /** @param {string} version 実行ファイルバージョン */
    setExeVersion(version) {
        document.getElementById('exeversion').textContent = version;
    }
}

class MenuSwitcher {
    /**
     * @param {string} fragment URLのハッシュ部分
     * @param {string} mainmenu メインメニューの識別子
     * @param {string} submenu サブメニューの識別子
     */
    setURLHash(fragment, mainmenu, submenu) {
        if (mainmenu == 'result') {
            for (const c of document.getElementById('main').children) {
                if (c.id == 'result') {
                    c.classList.remove('hide');
                } else {
                    c.classList.add('hide');
                }
            }
        } else {
            for (const c of document.getElementById('main').children) {
                if (c.id == fragment) {
                    c.classList.remove('hide');
                } else {
                    c.classList.add('hide');
                }
            }
        }

        /* 左側のメニューの選択表示 */
        for (const node of document.querySelectorAll('.sidebar-selected')) {
            node.classList.remove('sidebar-selected');
        }
        for (const node of document.querySelectorAll('a[href="#' + fragment + '"]')) {
            node.classList.add('sidebar-selected');
        }
    }
}

class WebAPIWorkerHandler {
    /** @type {ApexWebAPI.ApexWebAPI} */
    #webapi;
    #tryconnecting = false;
    #views = [];
    #game = null;
    #callbacks = new Map();
    #tournament_id = '';
    #tournament_name = '';
    #tournament_params = {};
    #playerparams = new Map();
    #playernames = new Map();
    #playeringamenames = new Map();
    #playerresultnames = new Map();
    #maxteams = 30;
    #teamparams = new Map();
    #teamnames = new Map();
    #observers = new Set();
    #lobby = { token: '', players: new Map(), teams: new Map() };
    #results = [];
    constructor(url, views) {
        const api = new ApexWebAPI.ApexWebAPI(url);
        this.#webapi = api;
        this.#views = views;
        this.#registerViewsCallbacks();

        this.#callCallbacks('setHandler', this);

        // 接続系
        api.addEventListener('open', ev => {
            this.#updatedGame(ev.detail.game);
            this.#updatedWebAPIConnectionStatus('open');

            /* 初回情報取得 */
            api.getPlayers();
            api.getCurrentTournament();
            api.getTournamentIDs();
            api.getAll();
            api.getObserver();
            api.getObservers();
            api.sendGetLobbyPlayers();
            api.sendGetSettings();
            api.getLiveAPIConfig();
            api.getVersion();
        });

        api.addEventListener('close', (ev) => {
            this.#updatedWebAPIConnectionStatus('close');
            this.#tryReconnect();
        });

        api.addEventListener('error', (ev) => {
            this.#updatedWebAPIConnectionStatus('error');
            this.#tryReconnect();
        });

        /* 設定変更イベント */
        api.addEventListener('getcurrenttournament', (ev) => {
            if (ev.detail.id != '' && this.#tournament_id != ev.detail.id) {
                this.#getAllTeamParams();
            }
            if (this.#tournament_id != ev.detail.id) {
                api.getTournamentResults();
                api.getTournamentParams();
            }
            this.#tournament_id = ev.detail.id;
            this.#tournament_name = ev.detail.name;
            if (ev.detail.id == '') {
                this.#updatedCurrentTournament('none', 'noname', ev.detail.count);
            } else {
                this.#updatedCurrentTournament(ev.detail.id, ev.detail.name, ev.detail.count);
            }
        });

        api.addEventListener('gettournamentids', ev => {
            this.#updatedTournamentIDs(ev.detail.ids);
        });

        api.addEventListener('settournamentname', (ev) => {
            api.getCurrentTournament();
            api.getTournamentIDs();
            api.getTournamentResults();
            api.getTournamentParams();
        });

        api.addEventListener('renametournamentname', (ev) => {
            api.getCurrentTournament();
            api.getTournamentIDs();
        });

        api.addEventListener('getplayers', (ev) => {
            for (const [hash, params] of Object.entries(ev.detail.players)) {
                this.#updatedPlayerParams(hash, params);
            }
        });

        api.addEventListener('getplayerparams', (ev) => {
            this.#updatedPlayerParams(ev.detail.hash, ev.detail.params);
        });

        api.addEventListener('setplayerparams', (ev) => {
            if (ev.detail.result) {
                this.#updatedPlayerParams(ev.detail.hash, ev.detail.params);
            }
        });

        api.addEventListener('lobbyenumstart', (ev) => {
            this.#lobby.token = '';
            this.#lobby.players.clear();
            this.#lobby.teams.clear();
            this.#callCallbacks('lobbyEnumStart');
        });

        api.addEventListener('lobbytoken', (ev) => {
            this.#lobby.token = ev.detail.token;
        });

        api.addEventListener('lobbyplayer', (ev) => {
            this.#lobby.players.set(ev.detail.hash, ev.detail);
            if (ev.detail.observer) {
                if (!this.#observers.has(ev.detail.hash)) {
                    this.#updatedObserver(ev.detail.hash);
                }
            }
            if (ev.detail.unassigned) return;
            if (ev.detail.observer) return;
            this.#checkPlayerIngameName(ev.detail.hash, ev.detail.teamid, ev.detail.name);
        });

        api.addEventListener('lobbyteam', (ev) => {
            if (ev.detail.unassigned) {
                this.#lobby.teams.set('unassigned', ev.detail);
            } else if (ev.detail.observer) {
                this.#lobby.teams.set('observer', ev.detail);
            } else {
                this.#lobby.teams.set(ev.detail.teamid, ev.detail);
                this.#updatedTeamIngameName(ev.detail.teamid, ev.detail.name);
            }
        });

        api.addEventListener('lobbyenumend', (ev) => {
            this.#callCallbacks('lobbyEnumEnd', this.#lobby);
        });

        api.addEventListener('setobserver', (ev) => {
            this.#updatedCurrentObserver(ev.detail.hash);
        });

        api.addEventListener('getobserver', (ev) => {
            this.#updatedCurrentObserver(ev.detail.hash);
        });

        api.addEventListener('observerswitch', (ev) => {
            const observerhash = ev.detail.observer.hash;
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            this.#callCallbacks('callObserverSwitch', observerhash, teamid, playerid, ev.detail.own);
        });

        api.addEventListener('getobservers', (ev) => {
            for (const observer of ev.detail.observers) {
                const hash = observer.hash;
                const name = observer.name;
                if (!this.#playeringamenames.has(hash)) {
                    this.#playeringamenames.set(hash, new Set());
                }
                const nameset = this.#playeringamenames.get(hash);
                if (!nameset.has(name)) {
                    const oldname = this.getPlayerName(hash);
                    nameset.add(name);
                    const newname = this.getPlayerName(hash);
                    if (oldname != newname) {
                        this.#updatedPlayerName(hash, newname);
                    }
                }
                if (!this.#observers.has(hash)) {
                    this.#updatedObserver(hash);
                }
            }
        });

        api.addEventListener('matchsetup', (ev) => {
            this.#callCallbacks('callMatchSetup', ev.detail.game);
        });

        api.addEventListener('gamestatechange', (ev) => {
            const state = ev.detail.game.state;
            this.#callCallbacks('setGameState', state);
        });

        api.addEventListener('clearlivedata', (ev) => {
            this.#callCallbacks('clearLiveData', ev.detail.game);
        });

        api.addEventListener('teamname', (ev) => {
            this.#updatedTeamId(ev.detail.team.id);
            this.#updatedTeamIngameName(ev.detail.team.id, ev.detail.team.name);
        });

        api.addEventListener('squadeliminate', (ev) => {
            this.#callCallbacks('setSquadEliminated', ev.detail.team.id);
        });

        api.addEventListener('teamplacement', (ev) => {
            this.#callCallbacks('setTeamPlacement', ev.detail.team.id, ev.detail.team.placement);
        });

        api.addEventListener('setteamparams', (ev) => {
            if (ev.detail.result) {
                this.#updatedTeamParams(ev.detail.teamid, ev.detail.params);
            }
        });

        api.addEventListener('getteamparams', (ev) => {
            this.#updatedTeamParams(ev.detail.teamid, ev.detail.params);
        });

        api.addEventListener('playerhash', ev => {
            this.#callCallbacks('setPlayerHash', ev.detail.team.id, ev.detail.player.id, ev.detail.player.hash);
        });

        api.addEventListener('playername', (ev) => {
            this.#checkPlayerIngameName(ev.detail.player.hash, ev.detail.team.id, ev.detail.player.name, ev.detail.player.id);
        });

        api.addEventListener('playercharacter', (ev) => {
            this.#callCallbacks('setPlayerCharacter', ev.detail.team.id, ev.detail.player.id, ev.detail.player.character);
        });

        api.addEventListener('playerhp', (ev) => {
            this.#callCallbacks('setPlayerHP', ev.detail.team.id, ev.detail.player.id, ev.detail.player.hp, ev.detail.player.hp_max);
        });

        api.addEventListener('playershield', (ev) => {
            this.#callCallbacks('setPlayerShield', ev.detail.team.id, ev.detail.player.id, ev.detail.player.shield, ev.detail.player.shield_max);
        });

        api.addEventListener('playerdamage', (ev) => {
            this.#callCallbacks('setPlayerDamage', ev.detail.team.id, ev.detail.player.id, ev.detail.player.damage_dealt, ev.detail.player.damage_taken);
        });

        api.addEventListener('playerweapon', (ev) => {
            this.#callCallbacks('setPlayerWeapon', ev.detail.team.id, ev.detail.player.id, ev.detail.player.weapon);
        });

        api.addEventListener('statealive', (ev) => {
            this.#callCallbacks('setPlayerStateAlive', ev.detail.team.id, ev.detail.player.id);
        });

        api.addEventListener('statedown', (ev) => {
            this.#callCallbacks('setPlayerStateDown', ev.detail.team.id, ev.detail.player.id);
        });

        api.addEventListener('statekilled', (ev) => {
            this.#callCallbacks('setPlayerStateKilled', ev.detail.team.id, ev.detail.player.id);
        });

        api.addEventListener('statecollected', (ev) => {
            this.#callCallbacks('setPlayerStateCollected', ev.detail.team.id, ev.detail.player.id);
        });

        api.addEventListener('playerstats', (ev) => {
            const team = ev.detail.team;
            const player = ev.detail.player;
            const stats = {kills: player.kills, assists: player.assists, knockdowns: player.knockdowns, revives: player.revives, respawns: player.respawns};
            this.#callCallbacks('setTeamKills', ev.detail.team.id, ev.detail.team.kills);
            this.#callCallbacks('setPlayerStats', ev.detail.team.id, ev.detail.player.id, stats);
        });

        api.addEventListener('playeritem', (ev) => {
            /* アイテム数変動イベント: 管理画面ではまだ扱わない */
        });

        api.addEventListener('gettournamentresults', (ev) => {
            this.#results = ev.detail.results;
            this.#updatedResults(ev.detail.results);
            this.#updatedURLHash(location.hash); // 再評価
        });

        api.addEventListener('settournamentresult', (ev) => {
            if (ev.detail.setresult) {
                this.#webapi.getTournamentResults(); // 再取得
            }
        });

        api.addEventListener('saveresult', (ev) => {
            this.#webapi.getTournamentResults(); // 再取得
        });

        api.addEventListener('gettournamentparams', (ev) => {
            this.#updatedTournamentParams(ev.detail.params);
        });

        api.addEventListener('settournamentparams', (ev) => {
            if (ev.detail.result) {
                this.#updatedTournamentParams(ev.detail.params);
            }
        });

        api.addEventListener('liveapisocketstats', (ev) => {
            this.#callCallbacks('setLiveAPISocketStatus', ev.detail.conn, ev.detail.recv, ev.detail.send);
        });

        api.addEventListener('getliveapiconfig', (ev) => {
            this.#callCallbacks('setLiveAPIConfig', ev.detail.config);
        });

        api.addEventListener('setliveapiconfig', (ev) => {
            if (ev.detail.result) {
                this.#callCallbacks('setLiveAPIConfig', ev.detail.config);
            }
        });

        api.addEventListener('getstatsfromcode', (ev) => {
            const statscode = ev.detail.statscode;
            const stats = ev.detail.stats;

            // match形式からresult形式への変換
            const results = [];
            if ('matches' in stats) {
                for (const m of stats.matches) {
                    let uncomplete = false;
                    const result = {teams:{}};
                    const ts = result.teams;
                    if ('aim_assist_allowed' in m) {
                        result.aimassiston = m.aim_assist_allowed;
                    }
                    if ('map_name' in m) {
                        result.map = m.map_name;
                    }
                    if ('match_start' in m) {
                        result.start = m.match_start * 1000;
                        result.end = m.match_start * 1000;
                    }
                    if ('mid' in m) {
                        result.matchid = m.mid;
                    }
                    if (Array.isArray(m.player_results)) {
                        for (const p of m.player_results) {
                            if ('survivalTime' in p) {
                                const survival_time = p.survivalTime * 1000;
                                const temp_end = result.start + survival_time;
                                if (result.end < temp_end) result.end = temp_end;
                            }
        
                            if ('teamNum' in p) {
                                // チームのパラメータ設定
                                const teamid = p.teamNum - 2;
                                if (!(teamid in ts)) ts[teamid] = { id: teamid, players: [] };
                                const team = ts[teamid];
                                if ('teamPlacement' in p) {
                                    team.placement = p.teamPlacement;
                                    if (p.teamPlacement <= 0) {
                                        uncomplete = true;
                                        break;
                                    }
                                }
                                if ('teamName' in p) {
                                    team.name = p.teamName;
                                }
                                if ('kills' in p) {
                                    if (!('kills' in team)) team.kills = 0;
                                    team.kills += p.kills;
                                }
        
                                // 個人のパラメータ設定
                                const player = {};
                                team.players.push(player);
                                if ('nidHash' in p) {
                                    player.id = p.nidHash.substring(0, 32);
                                }
                                if ('kills' in p) {
                                    player.kills = p.kills;
                                }
                                if ('assists' in p) {
                                    player.assists = p.assists;
                                }
                                if ('knockdowns' in p) {
                                    player.knockdowns = p.knockdowns;
                                }
                                if ('respawnsGiven' in p) {
                                    player.respawns_given = p.respawnsGiven;
                                }
                                if ('revivesGiven' in p) {
                                    player.revives_given = p.revivesGiven;
                                }
                                if ('damageDealt' in p) {
                                    player.damage_dealt = p.damageDealt;
                                }
                                if ('playerName' in p) {
                                    player.name = p.playerName;
                                }
                                if ('characterName' in p) {
                                    player.character = p.characterName;
                                }
                                if ('shots' in p) {
                                    player.shots = p.shots;
                                }
                                if ('hits' in p) {
                                    player.hits = p.hits;
                                }
                                if ('headshots' in p) {
                                    player.headshots = p.headshots;
                                }
                                if ('survivalTime' in p) {
                                    player.survival_time = p.survivalTime;
                                }
                                if ('hardware' in p) {
                                    player.hardware = p.hardware;
                                }
                            }
                        }
                    }
                    if (!uncomplete) {
                        // 1位のチームがいるか確認する
                        let has_1st = false;
                        for (const [key, team] of Object.entries(result.teams)) {
                            if (team.placement == 1) {
                                has_1st = true;
                                break;
                            }
                        }
                        if (has_1st) {
                            results.push(result);
                        }
                    }
                }
            }
            this.#callCallbacks('setStatsFromCode', statscode, results);
            this.#checkResultPlayerNames(results);
        });

        api.addEventListener('custommatchsettings', (ev) => {
            this.#callCallbacks('setCustomMatchSettings', ev.detail);
        });

        api.addEventListener('getversion', ev => {
            this.#callCallbacks('setExeVersion', ev.detail.version);
        });

        api.addEventListener('broadcastobject', ev => {
            this.#callCallbacks('receiveBroadcastObject', ev.detail);
        });

        window.addEventListener("hashchange", (ev) => {
            this.#updatedURLHash(location.hash);
        });
    }

    #registerViewsCallbacks() {
        const callbacks = [
            'setHandler',
            'setURLHash',
            'setGame',
            'setWebAPIConnectionStatus',
            'setLiveAPIConnectionStatus',
            'setAllTeamParams',
            'setTournamentIDs',
            'setTournamentParams',
            'setCurrentTournament',
            'setExeVersion',
            'setPlayerParams',
            'setPlayerName',
            'setPlayerParamsName',
            'setPlayerIngameName',
            'lobbyEnumStart',
            'lobbyEnumEnd',
            'setObserverName',
            'setCurrentObserver',
            'callMatchSetup',
            'setGameState',
            'clearLiveData',
            'setSquadEliminated',
            'setTeamId',
            'setTeamName',
            'setTeamIngameName',
            'setTeamParams',
            'setTeamParamsName',
            'setTeamParamsNameLines',
            'setTeamKills',
            'setTeamPlacement',
            'setPlayerHash',
            'setPlayerCharacter',
            'setPlayerHP',
            'setPlayerShield',
            'setPlayerDamage',
            'setPlayerWeapon',
            'setPlayerStateAlive',
            'setPlayerStateDown',
            'setPlayerStateKilled',
            'setPlayerStateCollected',
            'setPlayerStats',
            'setResults',
            'setLiveAPISocketStatus',
            'setLiveAPIConfig',
            'setStatsFromCode',
            'setCustomMatchSettings',
            'receiveBroadcastObject',
        ];
        for (const view of this.#views) {
            for (const cb of callbacks) {
                if (cb in view && typeof (view[cb]) == 'function') {
                    if (!this.#callbacks.has(cb)) {
                        this.#callbacks.set(cb, []);
                    }
                    this.#callbacks.get(cb).push(view[cb].bind(view));
                }
            }
        }
    }

    #tryReconnect() {
        if (!this.#tryconnecting) {
            this.#tryconnecting = true;
            setTimeout(() => {
                this.#webapi.forceReconnect();
                this.#tryconnecting = false;
            }, 10000);
        }
    }

    #callCallbacks(name, ...args) {
        if (this.#callbacks.has(name)) {
            for (const cb of this.#callbacks.get(name)) {
                try {
                cb(...args);
                } catch (e) {
                    console.error(`Error in callback ${name}:`, e);
                }
            }
        }
    }

    #updatedGame(game) {
        this.#game = game;
        this.#callCallbacks('setGame', game);
    }

    #updatedWebAPIConnectionStatus(status) {
        this.#callCallbacks('setWebAPIConnectionStatus', status);
    }

    #updatedTournamentIDs(ids) {
        this.#callCallbacks('setTournamentIDs', ids);
    }

    #updatedCurrentTournament(id, name, count) {
        this.#callCallbacks('setCurrentTournament', id, name, count);
    }

    #updatedTournamentParams(params) {
        this.#tournament_params = params;
        this.#callCallbacks('setTournamentParams', params);
    }

    #updatedAllTeamParams(params) {
        this.#callCallbacks('setAllTeamParams', params);
    }

    #updatedPlayerParams(hash, params) {
        this.#playerparams.set(hash, params);
        this.#callCallbacks('setPlayerParams', hash, params);

        // 名前更新の確認
        if ('name' in params && params.name != '') {
            const name = params.name;
            if (this.#playernames.get(hash) != name) {
                const oldname = this.getPlayerName(hash);
                this.#playernames.set(hash, name);
                const newname = this.getPlayerName(hash);
                if (oldname != newname) {
                    this.#updatedPlayerName(hash, newname);
                }
            }
            this.#updatedPlayerParamsName(hash, name);
        } else {
            if (this.#playernames.has(hash)) {
                const oldname = this.getPlayerName(hash);
                this.#playernames.delete(hash);
                const newname = this.getPlayerName(hash);
                if (oldname != newname) {
                    this.#updatedPlayerName(hash, newname);
                }
            }
            this.#updatedPlayerParamsName(hash, '');
        }
    }

    #updatedPlayerParamsName(hash, name) {
        this.#callCallbacks('setPlayerParamsName', hash, name);
    }

    #checkPlayerIngameName(hash, teamid, name, playerid = -1) {
        if (!this.#playeringamenames.has(hash)) {
            this.#playeringamenames.set(hash, new Set());
        }
        const nameset = this.#playeringamenames.get(hash);
        if (!nameset.has(name)) {
            const oldname = this.getPlayerName(hash);
            nameset.add(name);
            const newname = this.getPlayerName(hash);
            if (oldname != newname) {
                this.#updatedPlayerName(hash, newname);
            }
        }
        this.#updatedPlayerIngameName(hash, teamid, name, playerid);
    }

    #updatedPlayerIngameName(hash, teamid, name, playerid) {
        this.#callCallbacks('setPlayerIngameName', hash, teamid, name, playerid);
    }

    #updatedPlayerName(hash, name) {
        this.#callCallbacks('setPlayerName', hash, name);
        if (this.#observers.has(hash)) {
            this.#callCallbacks('setObserverName', hash, name);
        }
    }

    #updatedCurrentObserver(hash) {
        this.#callCallbacks('setCurrentObserver', hash);
    }

    #updatedObserver(hash) {
        this.#observers.add(hash);
        const name = this.getPlayerName(hash);
        this.#callCallbacks('setObserverName', hash, name);
    }

    #updatedTeamParams(teamid, params) {
        this.#teamparams.set(teamid, params);
        this.#callCallbacks('setTeamParams', teamid, params);
        const oldname = this.getTeamName(teamid);
        if ('name' in params && params.name != '') {
            const name = params.name;
            if (this.#teamnames.get(teamid) != name) {
                this.#teamnames.set(teamid, name);
                this.#callCallbacks('setTeamParamsName', teamid, name);
                this.#updatedTeamParamsNameLines();
                const newname = this.getTeamName(teamid);
                if (oldname != newname) {
                    this.#updatedTeamName(teamid, newname);
                }
            }
        } else {
            if (this.#teamnames.has(teamid)) {
                this.#teamnames.delete(teamid);
                this.#callCallbacks('setTeamParamsName', teamid, '');
                this.#updatedTeamParamsNameLines();
                const newname = this.getTeamName(teamid);
                if (oldname != newname) {
                    this.#updatedTeamName(teamid, newname);
                }
            }
        }
    }

    #updatedTeamId(teamid) {
        this.#callCallbacks('setTeamId', teamid);
    }

    #updatedTeamName(teamid, name) {
        this.#callCallbacks('setTeamName', teamid, name);
    }

    #updatedTeamParamsNameLines() {
        let names = [];
        for (let teamid = 0; teamid < this.#maxteams; ++teamid) {
            const name = this.#teamnames.get(teamid);
            names.push(name ? name : '');
        }
        this.#callCallbacks('setTeamParamsNameLines', names.join('\r\n'));
    }

    #updatedTeamIngameName(teamid, name) {
        this.#callCallbacks('setTeamIngameName', teamid, name);
    }

    #calcPointsFromResults() {
    }

    #updatedResults(results) {
        this.#callCallbacks('setResults', results);

        // リザルトからプレイヤー名の確認
        this.#checkResultPlayerNames(results);
    }

    #checkResultPlayerNames(results) {
        for (const result of results) {
            if (!('teams' in result)) continue;
            for (const team of Object.values(result.teams)) {
                if (!('players' in team)) continue;
                for (const player of team.players) {
                    if (!('id' in player)) continue;
                    const hash = player.id;
                    if ('name' in player) {
                        const name = player.name;
                        this.#checkResultPlayerName(hash, name);
                    }
                }
            }
        }
    }

    #checkResultPlayerName(hash, name) {
        if (!this.#playerresultnames.has(hash)) {
            this.#playerresultnames.set(hash, new Set());
        }
        const nameset = this.#playerresultnames.get(hash);
        if (!nameset.has(name)) {
            this.#callCallbacks('setPlayerResultName', hash, name);
            const oldname = this.getPlayerName(hash);
            nameset.add(name);
            const newname = this.getPlayerName(hash);
            if (oldname != newname) {
                this.#updatedPlayerName(hash, newname);
            }
        }
    }

    #updatedURLHash(hash) {
        const fragment = getFragment(hash);
        const mainmenu = getMainMenu(fragment);
        const submenu = getSubMenu(fragment);

        if (this.#tournament_id == '' && ["realtime", "tournament-rename", "tournament-params", "tournament-calc", "team-name", "team-params", "overlay"].indexOf(fragment) >= 0) {
            window.location.assign("#tournament-set");
            return;
        }

        this.#callCallbacks('setURLHash', fragment, mainmenu, submenu);
    }

    #_getAllTeamParams() {
        return new Promise((resolve, reject) => {
            const jobs = [];
            for (let i = 0; i < this.#maxteams; ++i) {
                jobs.push(new Promise((nresolve, nreject) => {
                    return this.#webapi.getTeamParams(i).then((ev) => {
                        nresolve(ev.detail.params);
                    }, nreject);
                }));
            }
            Promise.all(jobs).then(resolve, reject);
        });
    }

    #getAllTeamParams() {
        this.#_getAllTeamParams().then(arr => this.#updatedAllTeamParams(arr));
    }

    /**
     * ApexWebAPIのインスタンスを取得する
     * @returns {ApexWebAPI.ApexWebAPI} WebAPI
     */
    getWebAPI() {
        return this.#webapi;
    }

    getPlayerName(hash) {
        if (this.#playernames.has(hash)) {
            return this.#playernames.get(hash);
        } else if (this.#playeringamenames.has(hash)) {
            const nameset = this.#playeringamenames.get(hash);
            return [...nameset].pop();
        } else if (this.#playerresultnames.has(hash)) {
            const nameset = this.#playerresultnames.get(hash);
            return [...nameset].pop();
        } else {
            return hash;
        }
    }

    getTeamName(teamid) {
        if (this.#teamnames.has(teamid)) {
            return this.#teamnames.get(teamid);
        } else if (this.#game && teamid < this.#game.teams.length && 'name' in this.#game.teams[teamid]) {
            return this.#game.teams[teamid].name;
        } else {
            return `Team ${teamid + 1}`;
        }
    }

    getTeamResultName(teamid, fallback) {
        if (this.#teamnames.has(teamid)) {
            return this.#teamnames.get(teamid);
        }
        return fallback;
    }

    setPlayerParamsName(hash, name) {
        if (!this.#playerparams.has(hash)) {
            this.#playerparams.set(hash, {});
        }
        const params = this.#playerparams.get(hash);
        if (name != '') {
            params.name = name;
        } else {
            delete params.name;
        }

        // ingamenamesにも反映
        if (!('ingamenames' in params)) {
            params.ingamenames = [];
        }

        for (const ingamenames of Object.values(this.#playeringamenames.get(hash) || new Set())) {
            for (const ingamename of params.ingamenames) {
                if (!params.ingamenames.includes(ingamename)) {
                    params.ingamenames.push(ingamename);
                }
            }
        }

        for (const resultnames of Object.values(this.#playerresultnames.get(hash) || new Set())) {
            for (const resultname of params.resultnames) {
                if (!params.ingamenames.includes(resultname)) {
                    params.ingamenames.push(resultname);
                }
            }
        }

        // 反映
        this.#webapi.setPlayerParams(hash, params);
    }

    setTeamParamsName(teamid, name) {
        if (!this.#teamparams.has(teamid)) {
            this.#teamparams.set(teamid, {});
        }
        const params = this.#teamparams.get(teamid);
        const oldparams = JSON.stringify(params);
        if (name) {
            params.name = name;
        } else {
            delete params.name;
        }
        const newparams = JSON.stringify(params);
        if (oldparams != newparams) {
            this.#webapi.setTeamParams(teamid, params);
        }
    }

    setTeamIngameNamesFromText(text) {
        const lines = text.split(/\r\n|\n/).map((line) => line.trim()).slice(0, this.#maxteams);
        /** @type {number|null} */
        let timerid = null;

        const enumend = (ev) => {
            if (timerid != null) clearTimeout(timerid);

            if (!('token' in this.#lobby) || this.#lobby.token == '' || this.#lobby.token.indexOf('c') == 0) {
                return;
            }

            if ('teams' in this.#lobby) {
                for (let i = 0; i < this.#maxteams; ++i) {
                    if (this.#lobby.teams.has(i)) {
                        const team = this.#lobby.teams.get(i);
                        const name = i < lines.length ? lines[i] : '';
                        if (team.name != name) {
                            this.#webapi.sendSetTeamName(i, name);
                        }
                    }
                }
            }
            this.#webapi.sendGetLobbyPlayers();
        };

        this.#webapi.addEventListener('lobbyenumend', enumend, { once: true });

        timerid = setTimeout(() => {
            this.#webapi.removeEventListener('lobbyenumend', enumend);
            console.warn('setTeamIngameNamesFromText() timeout.');
        }, 2000); // 2sでタイムアウト

        this.#webapi.sendGetLobbyPlayers();
    }

    setTeamIngameSpawnPoints(spawnpoints) {
        /** @type {number|null} */
        let timerid = null;

        const enumend = (ev) => {
            if (timerid != null) clearTimeout(timerid);

            if (!('token' in this.#lobby) || this.#lobby.token == '' || this.#lobby.token.indexOf('c') == 0) {
                return;
            }

            if ('teams' in this.#lobby) {
                for (let i = 0; i < this.#maxteams; ++i) {
                    if (this.#lobby.teams.has(i)) {
                        const team = this.#lobby.teams.get(i);
                        const spawnpoint = i < spawnpoints.length ? spawnpoints[i] : 0;
                        if (team.spawnpoint != spawnpoint) {
                            this.#webapi.sendSetSpawnPoint(i, spawnpoint);
                        }
                    }
                }
            }
            this.#webapi.sendGetLobbyPlayers();
        };

        this.#webapi.addEventListener('lobbyenumend', enumend, { once: true });

        timerid = setTimeout(() => {
            this.#webapi.removeEventListener('lobbyenumend', enumend);
            console.warn('setTeamIngameSpawnPoints() timeout.');
        }, 2000); // 2sでタイムアウト

        this.#webapi.sendGetLobbyPlayers();
    }

    setTournamentParamsCalcMethod(calcmethod) {
        if (!this.#tournament_params) {
            this.#tournament_params = {};
        }

        const oldcalcmethod = this.#tournament_params.calcmethod;
        if (JSON.stringify(oldcalcmethod) != JSON.stringify(calcmethod)) {
            this.#tournament_params.calcmethod = calcmethod;
            this.#webapi.setTournamentParams(this.#tournament_params);
        }
    }

    setTournamentParamsForceHide(forcehide) {
        if (!this.#tournament_params) {
            this.#tournament_params = {};
        }

        const oldforcehide = this.#tournament_params.forcehide;
        if (JSON.stringify(oldforcehide) != JSON.stringify(forcehide)) {
            this.#tournament_params.forcehide = forcehide;
            this.#webapi.setTournamentParams(this.#tournament_params);
        }
    }

    setTournamentParamsPresets(presets) {
        if (!this.#tournament_params) {
            this.#tournament_params = {};
        }

        const oldpresets = this.#tournament_params.presets;
        if (JSON.stringify(oldpresets) != JSON.stringify(presets)) {
            this.#tournament_params.presets = presets;
            this.#webapi.setTournamentParams(this.#tournament_params);
        }
    }

    getResults() {
        return this.#results;
    }
}

export class WebAPIConfig {
    /** @type {WebAPIWorkerHandler|null} */
    #handler = null;

    /**
     * @param {string} url WebAPIのURL
     * @param {string} liveapi_url LiveAPIのURL
     */
    constructor(url, liveapi_url) {
        const resultview = new ResultView();
        const resultfixview = new ResultFixView();
        this.#handler = new WebAPIWorkerHandler(url, [
            new RealtimeView(),
            new ObserverConfigView(),
            resultview,
            resultfixview,
            new TournamentCalculationMethodView(),
            new LiveAPIConfigView(liveapi_url),
            new LiveAPIConnectionStatusView(),
            new WebAPIConnectionStatusView(),
            new LanguageSelectView(),
            new PlayerNameView(),
            new PlayerNameLobbyView(),
            new TeamNameView(),
            new InGameSettingsView(),
            new LegendBanView(),
            new OverlayStatusView(),
            new TournamentSetView(),
            new TournamentRenameView(),
            new LeftResultSelector(),
            new VersionView(),
            new MenuSwitcher(),
            new OverlayForceHideView(),
            new TestView(),
            new AnnouncementView(),
            new ManualPostMatchView(),
        ]);

        document.getElementById('result-view-button').addEventListener('click', (ev) => {
            resultview.showBothResultView();
            resultfixview.hideAll();
            resultfixview.showFixFromStatsCodeView();
        });

        document.getElementById('result-fix-placement-button').addEventListener('click', (ev) => {
            resultview.hideBothResultView();
            resultfixview.drawPlacement();
            resultfixview.hideFixKillsView();
            resultfixview.showFixPlacementView();
            resultfixview.hideFixFromStatsCodeView();
        });

        document.getElementById('result-fix-kills-button').addEventListener('click', (ev) => {
            resultview.hideBothResultView();
            resultfixview.drawKills();
            resultfixview.hideFixPlacementView();
            resultfixview.showFixKillsView();
            resultfixview.hideFixFromStatsCodeView();
        });
    }
}
