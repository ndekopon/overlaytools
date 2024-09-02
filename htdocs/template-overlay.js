import {
    calcPoints,
    appendToTeamResults,
    resultsToTeamResults,
    setRankParameterToTeamResults,
} from "./overlay-common.js";
import { ApexWebAPI } from "./apex-webapi.js";

function convertToCamelCase(s) {
    return s.replace(/-([a-z])/g, x => x[1].toUpperCase());
}

const defined_item_ids = ["backpack", "knockdownshield", "syringe", "medkit", "shieldcell", "shieldbattery", "phoenixkit", "ultimateaccelerant", "fraggrenade", "thermitgrenade", "arcstar"];

export class TemplateOverlay {
    /** @type {string} hide()/show()で付与・削除されるクラス名 */
    static HIDE_CLASS = "hide";
    /** @type {string} addForceHide()/removeForceHide()で付与・削除されるクラス名 */
    static FORCEHIDE_CLASS = "forcehide";

    /** @type {string} baseノードのID */
    id;
    /** @type {HTMLElement} rootノード */
    root;
    /** @type {Array} カスタムタグ一覧 */
    tags;
    params;

    /** 検索用インデックス */
    teams;
    teamplayers;
    players;
    cameraplayers;

    /**
     * コンストラクタ
     */
    constructor(param = {}) {
        this.id = this.constructor.name.toLowerCase();
        this.root = null;
        this.tags = [];
        this.types = 'types' in param ? param.types : [];
        this.params = {};
        this.teams = {};
        this.teamplayers = {};
        this.players = {};
        this.cameraplayers = {};
    }

    clear() {
        // HTMLノードの削除
        for (const nodes of [this.root.shadowRoot.querySelectorAll('.teams'), this.root.shadowRoot.querySelectorAll('.players'), this.root.shadowRoot.querySelectorAll('.cameraplayers')]) {
            for (const node of nodes) {
                while (node.firstChild) { node.firstChild.remove(); }
            }
        }

        // 索引のクリア
        for (const target of [this.teams, this.teamplayers, this.players, this.cameraplayers]) {
            for (var key in target) {
                if (target.hasOwnProperty(key)) {
                    delete target[key];
                }
            }
        }
    }

    clearCameraPlayers() {
        // HTMLノードの削除
        for (const nodes of [this.root.shadowRoot.querySelectorAll('.cameraplayers')]) {
            for (const node of nodes) {
                while (node.firstChild) { node.firstChild.remove(); }
            }
        }

        // 索引のクリア
        for (const target of [this.cameraplayers]) {
            for (var key in target) {
                if (target.hasOwnProperty(key)) {
                    delete target[key];
                }
            }
        }
    }

    async fetchURL(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            return await response.text();
        } catch (e) {
            console.warn(e);
            return null;
        }
    }

    async buildCSS() {
        // 全体共通
        const date = Date.now();
        const basesheet = new CSSStyleSheet();
        basesheet.replaceSync('.hide, .forcehide { position: absolute; left: -3840px; top: 2160px; }');

        // 個別
        let css = await this.fetchURL(`custom-overlays/${this.id}.css?${date}`);
        if (!css) css = await this.fetchURL(`overlays/${this.id}.css?${date}`);
        if (!css) css = '';

        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        let appendcss = await this.fetchURL(`custom-overlays/${this.id}-append.css?${date}`);
        if (!appendcss) return [basesheet, sheet];

        const appendsheet = new CSSStyleSheet();
        appendsheet.replaceSync(appendcss);

        return [basesheet, sheet, appendsheet];
    }

    async buildBase(sheets) {
        const date = Date.now();
        let html = await this.fetchURL(`custom-overlays/${this.id}.html?${date}`);
        if (!html) html = await this.fetchURL(`overlays/${this.id}.html?${date}`);
        if (!html) html = '';

        // HTML -> template
        const id = `overlay-${this.id}`;
        let template = document.getElementById(id);
        if (!template) {
            template = document.createElement('template');
            template.id = id;
            template.innerHTML = html;
            document.body.appendChild(template);
        }

        if (customElements.get(id) === undefined) {
            customElements.define(template.id, class extends HTMLElement {
                constructor() {
                    super();
                    const node = this.attachShadow({mode: 'open'});
                    node.appendChild(template.content.cloneNode(true));
                    node.adoptedStyleSheets = sheets;
                }
            });
        }

        this.tags.push(id);

        // ルートに追加
        const root = document.createElement(id);
        document.getElementById('overlays').appendChild(root);
        this.root = root;
        return template;
    }

    async buildParts(name, classnames) {
        const date = Date.now();
        let html = await this.fetchURL(`custom-overlays/${this.id}-${name}.html?${date}`);
        if (!html) html = await this.fetchURL(`overlays/${this.id}-${name}.html?${date}`);
        if (!html) html = '';

        let template = document.getElementById('overlay-parts');
        if (!template) {
            template = document.createElement('template');
            template.id = 'overlay-parts';
            document.body.appendChild(template);
        }

        const classname = `${this.id}-${name}`;
        if (!template.content.querySelector(`.${classname}`)) {
            const div = document.createElement('div');
            div.classList.add(classname);
            if (classnames.length > 0) div.classList.add(...classnames);
            div.innerHTML = html;
            template.content.appendChild(div);
        }
        this.tags.push(`${this.id}-${name}`);

        return template.content.querySelector(`.${classname}`);
    }

    buildParams() {
        for (const id of this.tags) {
            // クラスを列挙
            const params = [];
            if (id == `overlay-${this.id}`) {
                for (const n of document.getElementById(id).content.querySelectorAll('*')) {
                    for (const c of n.classList) {
                        if (params.indexOf(c) < 0) params.push(c);
                    }
                }
            } else {
                const template = document.getElementById(`overlay-parts`);
                for (const n of template.content.querySelectorAll(`.${id}, .${id} *`)) {
                    for (const c of n.classList) {
                        if (params.indexOf(c) < 0) params.push(c);
                    }
                }
            }
            this.params[id] = params;
        }
    }

    getChildClass(node) {
        const childclass = [];
        if ('childClass' in node.dataset) {
            const words = node.dataset.childClass.split(/[ \r\t\n]/);
            for (const word of words) {
                if (word != '') childclass.push(word);
            }
        }
        return childclass;
    }

    async build() {
        const sheets = await this.buildCSS();
        const base = await this.buildBase(sheets);

        // チーム一覧が必要な場合
        if (base && base.content.querySelector('.teams')) {
            const teams = await this.buildParts('teams', this.getChildClass(base.content.querySelector('.teams')));

            // チームの中にteamplayersクラスがある場合
            if (teams && teams.querySelector('.teamplayers')) {
                await this.buildParts('teamplayers', this.getChildClass(teams.querySelector('.teamplayers')));
            }
        }

        // プレイヤー一覧が必要な場合
        if (base && base.content.querySelector('.players')) {
            await this.buildParts('players', this.getChildClass(base.content.querySelector('.players')));
        }

        // カメラプレイヤー一覧が必要な場合
        if (base && base.content.querySelector('.cameraplayers')) {
            await this.buildParts('cameraplayers', this.getChildClass(base.content.querySelector('.cameraplayers')));
        }

        // パラメータ一覧作成
        this.buildParams();

        return true;
    }

    addTeam(teamid, teams) {
        if (teamid in this.teams) return [this.teams[teamid], false]; // 既に存在する
        const div = document.getElementById(`overlay-parts`).content.querySelector(`.${this.id}-teams`);
        if (!div) return [null, false];
        const clone = document.importNode(div, true);
        clone.classList.remove(`${this.id}-teams`);
        clone.classList.add('team');
        teams.appendChild(clone);
        this.teams[teamid] = clone;
        return [clone, true];
    }

    addTeamPlayer(teamid, playerid, teamplayers) {
        if (teamid in this.teamplayers && playerid in this.teamplayers[teamid]) return [this.teamplayers[teamid][playerid], false]; // 既に存在する
        if (!(teamid in this.teamplayers)) this.teamplayers[teamid] = {};
        const div = document.getElementById(`overlay-parts`).content.querySelector(`.${this.id}-teamplayers`);
        if (!div) return [null, false];
        const clone = document.importNode(div, true);
        clone.classList.remove(`${this.id}-teamplayers`);
        clone.classList.add('teamplayer');
        teamplayers.appendChild(clone);
        this.teamplayers[teamid][playerid] = clone;
        return [clone, true];
    }

    addPlayer(playerid, players) {
        if (playerid in this.players) return [this.players[playerid], false]; // 既に存在する
        const div = document.getElementById(`overlay-parts`).content.querySelector(`.${this.id}-players`);
        if (!div) return [null, false];
        const clone = document.importNode(div, true);
        clone.classList.remove(`${this.id}-players`);
        clone.classList.add('player');
        players.appendChild(clone);
        this.players[playerid] = clone;
        return [clone, true];
    }

    addCameraPlayer(playerid, cameraplayers) {
        if (playerid in this.cameraplayers) return [this.cameraplayers[playerid], false]; // 既に存在する
        const div = document.getElementById(`overlay-parts`).content.querySelector(`.${this.id}-cameraplayers`);
        if (!div) return [null, false];
        const clone = document.importNode(div, true);
        clone.classList.remove(`${this.id}-cameraplayers`);
        clone.classList.add('cameraplayer');
        cameraplayers.appendChild(clone);
        this.cameraplayers[playerid] = clone;
        return [clone, true];
    }

    setDatasetAndInnerText(target, paramname, paramvalue, dataset) {
        if (dataset || target.classList.contains('dataset')) {
            target.dataset[convertToCamelCase(paramname)] = paramvalue;
            if (target.classList.contains('innertext')) {
                target.innerText = paramvalue;
            }
        } else {
            target.innerText = paramvalue;
        }
    }

    setParam(paramname, paramvalue, dataset = false) {
        const tag = `overlay-${this.id}`;
        if (this.tags.indexOf(tag) < 0) return; // 未サポート
        if (this.params[tag].indexOf(paramname) < 0) return; // 入力先なし

        for (const target of this.root.shadowRoot.querySelectorAll(`.${paramname}`)) {
            this.setDatasetAndInnerText(target, paramname, paramvalue, dataset);
        }
    }

    setTeamParam(teamid, paramname, paramvalue, dataset = false) {
        const tag_teams = `${this.id}-teams`;
        if (this.tags.indexOf(tag_teams) < 0) return; // 未サポート
        if (this.params[tag_teams].indexOf(paramname) < 0) return; // 入力先なし

        const teams = this.root.shadowRoot.querySelector(`.teams`);
        if (!teams) return;

        const [team, first] = this.addTeam(teamid, teams);
        if (!team) return;

        if (first && paramname != 'team-id') {
            this.setTeamParam(teamid, 'team-id', parseInt(teamid, 10) + 1);
        }

        if (team.classList.contains(paramname)) {
            this.setDatasetAndInnerText(team, paramname, paramvalue, dataset);
        }

        for (const target of team.querySelectorAll(`.${paramname}`)) {
            this.setDatasetAndInnerText(target, paramname, paramvalue, dataset);
        }
    }

    setTeamPlayerParam(teamid, playerid, paramname, paramvalue, dataset = false) {
        const tag_teams = `${this.id}-teams`;
        const tag_teamplayers = `${this.id}-teamplayers`;
        if (this.tags.indexOf(tag_teams) < 0) return; // 未サポート
        if (this.tags.indexOf(tag_teamplayers) < 0) return; // 未サポート
        if (this.params[tag_teamplayers].indexOf(paramname) < 0) return; // 入力先なし

        const teams = this.root.shadowRoot.querySelector(`.teams`);
        if (!teams) return;

        const [team, team_first] = this.addTeam(teamid, teams);
        if (!team) return;

        if (team_first && paramname != 'team-id') {
            this.setTeamParam(teamid, 'team-id', parseInt(teamid, 10) + 1);
        }

        const teamplayers = team.querySelector('.teamplayers');
        if (!teamplayers) return;

        const [player, first] = this.addTeamPlayer(teamid, playerid, teamplayers);
        if (!player) return;

        if (first && paramname != 'teamplayer-id') {
            this.setTeamPlayerParam(teamid, playerid, 'teamplayer-id', playerid);
        }

        if (player.classList.contains(paramname)) {
            this.setDatasetAndInnerText(player, paramname, paramvalue, dataset);
        }

        for (const target of player.querySelectorAll(`.${paramname}`)) {
            this.setDatasetAndInnerText(target, paramname, paramvalue, dataset);
        }
    }

    setPlayerParam(playerid, paramname, paramvalue, dataset = false) {
        const tag_players = `${this.id}-players`;
        if (this.tags.indexOf(tag_players) < 0) return; // 未サポート
        if (this.params[tag_players].indexOf(paramname) < 0) return; // 入力先なし

        const players = this.root.shadowRoot.querySelector(`.players`);
        if (!players) return;

        const [player, first] = this.addPlayer(playerid, players);
        if (!player) return;

        if (first && paramname != 'player-id') {
            this.setPlayerParam(playerid, 'player-id', playerid);
        }

        if (player.classList.contains(paramname)) {
            this.setDatasetAndInnerText(player, paramname, paramvalue, dataset);
        }

        for (const target of player.querySelectorAll(`.${paramname}`)) {
            this.setDatasetAndInnerText(target, paramname, paramvalue, dataset);
        }
    }

    setCameraPlayerParam(playerid, paramname, paramvalue, dataset = false) {
        const tag_cameraplayers = `${this.id}-cameraplayers`;
        if (this.tags.indexOf(tag_cameraplayers) < 0) return; // 未サポート
        if (this.params[tag_cameraplayers].indexOf(paramname) < 0) return; // 入力先なし

        const cameraplayers = this.root.shadowRoot.querySelector(`.cameraplayers`);
        if (!cameraplayers) return;

        const [cameraplayer, first] = this.addCameraPlayer(playerid, cameraplayers);
        if (!cameraplayer) return;

        if (first && paramname != 'cameraplayer-id') {
            this.setCameraPlayerParam(playerid, 'cameraplayer-id', playerid);
        }

        if (cameraplayer.classList.contains(paramname)) {
            this.setDatasetAndInnerText(cameraplayer, paramname, paramvalue, dataset);
        }

        for (const target of cameraplayer.querySelectorAll(`.${paramname}`)) {
            this.setDatasetAndInnerText(target, paramname, paramvalue, dataset);
        }
    }

    addTeamClass(teamid, classname) {
        if (teamid in this.teams) {
            this.teams[teamid].classList.add(classname);
        }
    }

    removeTeamClass(teamid, classname) {
        if (teamid in this.teams) {
            this.teams[teamid].classList.remove(classname);
        }
    }

    addHide() {
        if (this.root == null) return false;
        if (this.root.classList.contains(TemplateOverlay.HIDE_CLASS)) return false;
        this.root.classList.add(TemplateOverlay.HIDE_CLASS);
        return true;
    }

    removeHide() {
        if (this.root == null) return false;
        if (!this.root.classList.contains(TemplateOverlay.HIDE_CLASS)) return false;
        this.root.classList.remove(TemplateOverlay.HIDE_CLASS);
        return true;
    }

    addForceHide() {
        if (this.root == null) return false;
        this.root.classList.add(TemplateOverlay.FORCEHIDE_CLASS);
    }

    removeForceHide() {
        if (this.root == null) return;
        this.root.classList.remove(TemplateOverlay.FORCEHIDE_CLASS);
    }

    addType(type) {
        if (this.types.indexOf(type) < 0) {
            this.types.push(type);
        }
    }

    /**
     * 指定されたタイプを所持しているか
     * @param {string} type 
     * @returns {boolean}
     */
    hasType(type) {
        return this.types.indexOf(type) >= 0;
    }
}


export class TemplateOverlayHandler {
    #initparams;
    /** @type {ApexWebAPI} */
    #webapi;
    /** @type {import("./overlay-common.js").teamresults} 計算用チームデータ */
    #game; // WebAPIのゲームオブジェクト(変更しない)
    #game_state;
    #results; // WebAPIから取得したリザルト(変更しない、追加のみ)
    #results_count;
    /** @type {boolean} 現在の試合のデータを順位・ポイント計算に含めるかどうか */
    #calc_resultsonly;
    /** @type {boolean} getAll進行中 */
    #getallprocessing;
    #overlays;
    #saved_teamresults;
    /* トーナメント情報 */
    #tournament_id;
    #tournament_name;
    #tournament_params;
    #team_params;
    #player_params;
    #player_index;
    #player_index_singleresult;
    /* カメラ情報 */
    #camera_teamid;
    #camera_playerhash;
    /** @type {number} 再接続試行をカウントする */
    #retry;
    /** @type {boolean} 再接続試行中 */
    #reconnecting;
    #recognition;
    #teambanner_recognition_delay;
    #teambanner_queue;
    #liveapi_connection_count;
    #winner_determine;

    /**
     * コンストラクタ
     * @param {string} url 接続先WebSocketのURL
     */
    constructor(params = {}) {
        this.#initparams = params;
        this.#liveapi_connection_count = -1;
        this.#calc_resultsonly = true;
        this.#tournament_params = {};
        this.#tournament_id = "invalid";
        this.#tournament_name = "";
        this.#game_state = "";
        this.#team_params = {};
        this.#player_params = {};
        this.#player_index = {};
        this.#player_index_singleresult = {};
        this.#camera_teamid = -1;
        this.#camera_playerhash = '';
        this.#game = null;
        this.#results = [];
        this.#results_count = -1;
        this.#saved_teamresults = {};
        this.#winner_determine = false;
        this.#recognition = {
            map: 0,
            banner: 1
        };
        this.#teambanner_recognition_delay = 500;
        this.#teambanner_queue = [];
        this.#getallprocessing = false;
        this.#retry = 0;
        this.#reconnecting = false;

        this.#overlays = params.overlays;
        this.#buildOverlays().then(_ => {
            if ('url' in this.#initparams) {
                this.#setupApexWebAPI(url);
            } else {
                this.#setupApexWebAPI("ws://127.0.0.1:20081/");
            }
        });

        this.#setDefaultValue();
    }

    #buildOverlays() {
        return new Promise((resolve, reject) => {
            const jobs = [];
            for (const overlay of Object.values(this.#overlays)) {
                jobs.push(overlay.build());
            }
            Promise.all(jobs).then(resolve, reject);
        });
    }

    #setDefaultValue() {
        for (const item of defined_item_ids) {
            this.#updatedCameraPlayerItem(item, 0);
        }
    }

    /**
     * WebAPIに関連する部分のセットアップを行う
     * @param {string} url 接続先WebSocketのURL
     */
    #setupApexWebAPI(url) {
        this.#webapi = new ApexWebAPI(url);

        this.#webapi.addEventListener("open", (ev) => {
            this.#updatedWebAPIConnectionStatus('open');
            this.#updatedGame(ev.detail.game);
            this.#getallprocessing = true;
            this.#retry = 0;
            this.#webapi.getCurrentTournament();
            this.#webapi.getPlayers();
            this.#webapi.getAll().then(() => {
                this.#getallprocessing = false;
                this.#reCalc();
                this.#showHideFromCurrentStatus();
            }, () => {
                this.#getallprocessing = false;
                this.#reCalc();
                this.#showHideFromCurrentStatus();
            });
        });

        this.#webapi.addEventListener("close", (ev) => {
            this.#updatedWebAPIConnectionStatus('close');
            this.#tryReconnect();
        });

        this.#webapi.addEventListener("error", (ev) => {
            this.#updatedWebAPIConnectionStatus('error');
            this.#tryReconnect();
        });

        this.#webapi.addEventListener("getcurrenttournament", (ev) => {
            if (this.#tournament_id != ev.detail.id) {
                this.#updatedTournamentId(ev.detail.id);
            }
            if (this.#tournament_name != ev.detail.name) {
                this.#updatedTournamentName(ev.detail.name);
            }
        });

        // トーナメントの変更・新規作成
        this.#webapi.addEventListener("settournamentname", (ev) => {
            if (this.#tournament_id != ev.detail.id) {
                this.#updatedTournamentId(ev.detail.id);
            }
            if (this.#tournament_name != ev.detail.name) {
                this.#updatedTournamentName(ev.detail.name);
            }
        });

        this.#webapi.addEventListener('renametournamentname', (ev) => {
            if (ev.detail.result) {
                if (this.#tournament_name != ev.detail.name) {
                    this.#updatedTournamentName(ev.detail.name);
                }
            }
        });

        this.#webapi.addEventListener("clearlivedata", (ev) => {
            for (const overlay of Object.values(this.#overlays)) {
                overlay.clear();
            }
            this.#updatedGame(ev.detail.game);
            if (!this.#getallprocessing) this.#reCalc();
            this.#updatedSingleResult();
            this.#updatedParticipatedTeamsInformation();
            this.#winner_determine = false;
        });

        this.#webapi.addEventListener("gamestatechange", (ev) => {
            if (this.#game_state != ev.detail.game.state) {
                this.#updatedGameState(ev.detail.game.state);
            }
        });


        // 結果の保存
        this.#webapi.addEventListener("saveresult", (ev) => {
            if (this.#calc_resultsonly != false) {
                this.#updatedCalcResultsOnly(true);
            }
            if (ev.detail.gameid == this.#results.length) {
                // 既存のリザルトに追加
                this.#results.push(ev.detail.result);
                if (!this.#getallprocessing) this.#reCalc();
                this.#updatedSingleResult();
                this.#updatedParticipatedTeamsInformation();
            } else {
                // 足りていない場合は再取得
                this.#webapi.getTournamentResults();
            }

            if (this.#results_count != this.#results.length) {
                this.#updatedResultsCount(this.#results.length);
            }
        });

        this.#webapi.addEventListener("gettournamentresults", (ev) => {
            this.#results = ev.detail.results;
            if (!this.#getallprocessing) this.#reCalc();
            this.#updatedSingleResult();
            this.#updatedParticipatedTeamsInformation();
            if (this.#results_count != this.#results.length) {
                this.#updatedResultsCount(this.#results.length);
            }
        });

        this.#webapi.addEventListener('settournamentresult', (ev) => {
            if (ev.detail.setresult) {
                this.#webapi.getTournamentResults();
            }
        });

        // 勝者確定
        this.#webapi.addEventListener("winnerdetermine", (ev) => {
            this.#updatedWinnerDetermine(ev.detail.team.id);
        });

        this.#webapi.addEventListener("squadeliminate", (ev) => {
            if (this.#game == null) return;
            const init = this.#getallprocessing;
            const placement = ev.detail.team.placement;
            const teamid = ev.detail.team.id;
            this.#updatedSquadEliminate(placement, teamid, init);
        });

        this.#webapi.addEventListener("teamname", (ev) => {
            const teamid = ev.detail.team.id;
            const name = this.#getTeamName(teamid);
            this.#updatedTeamName(teamid, name);
        });

        this.#webapi.addEventListener("getteamparams", (ev) => {
            this.#updatedTeamParams(ev.detail.teamid, ev.detail.params);
        });

        this.#webapi.addEventListener("setteamparams", (ev) => {
            if (ev.detail.result) {
                this.#updatedTeamParams(ev.detail.teamid, ev.detail.params);
            }
        });

        // プレイヤー名系
        this.#webapi.addEventListener("playername", (ev) => {
            this.#updatedPlayerName(ev.detail.player.hash, ev.detail.player.name);
            this.#updatedPlayerSingleResultName(ev.detail.player.hash, ev.detail.player.name);
        });

        this.#webapi.addEventListener("getplayerparams", (ev) => {
            this.#updatedPlayerParams(ev.detail.hash, ev.detail.params);
        });

        this.#webapi.addEventListener("setplayerparams", (ev) => {
            if (ev.detail.result) {
                this.#updatedPlayerParams(ev.detail.hash, ev.detail.params);
            }
        });

        this.#webapi.addEventListener("getplayers", (ev) => {
            for (const [hash, params] of Object.entries(ev.detail.players)) {
                this.#updatedPlayerParams(hash, params);
            }
        });

        this.#webapi.addEventListener("teamplacement", (ev) => {
            if (this.#game == null) return;
            if (!this.#getallprocessing) this.#reCalc();
        });

        this.#webapi.addEventListener("teamrespawn", (ev) => {
            this.#updatedTeamRespawn(ev.detail.team.id, ev.detail.player, ev.detail.targets);
        });

        this.#webapi.addEventListener("squadeliminate", (ev) => {
            if (this.#game == null) return;
            if (!this.#getallprocessing) this.#reCalc();
        });

        this.#webapi.addEventListener("playerconnected", (ev) => {
            if (!this.#getallprocessing) this.#reCalc();
        });

        this.#webapi.addEventListener("playerdisconnected", (ev) => {
            if (!ev.detail.player.canreconnect) {
                this.#updatedPlayerState(ev.detail.player.hash, ApexWebAPI.WEBAPI_PLAYER_STATE_KILLED);
            }
        });

        // キル数変更
        this.#webapi.addEventListener("playerstats", (ev) => {
            this.#updatedTeamKills(ev.detail.team.id, ev.detail.team.kills);
            this.#updatedPlayerKills(ev.detail.player.hash, ev.detail.player.kills);
            if (!this.#getallprocessing) this.#reCalc();
        });

        // プレーヤーステータス変更
        this.#webapi.addEventListener("playerhash", (ev) => {
            const teamid = ev.detail.team.id;
            const playerhash = ev.detail.player.hash;
            this.#player_index[playerhash] = ev.detail.player;
            this.#updatedPlayerId(playerhash);
            this.#updatedTeamExists(teamid);
            this.#updatedPlayerState(playerhash, ApexWebAPI.WEBAPI_PLAYER_STATE_ALIVE);
        });

        this.#webapi.addEventListener("playercharacter", (ev) => {
            this.#updatedPlayerLegend(ev.detail.player.hash, ev.detail.player.character);

        });

        this.#webapi.addEventListener("statealive", (ev) => {
            this.#updatedPlayerState(ev.detail.player.hash, ev.detail.player.state);
        });

        this.#webapi.addEventListener("statedown", (ev) => {
            this.#updatedPlayerState(ev.detail.player.hash, ev.detail.player.state);
        });

        this.#webapi.addEventListener("statekilled", (ev) => {
            this.#updatedPlayerState(ev.detail.player.hash, ev.detail.player.state);
        });

        this.#webapi.addEventListener("statecollected", (ev) => {
            this.#updatedPlayerState(ev.detail.player.hash, ev.detail.player.state);
        });

        this.#webapi.addEventListener("observerswitch", (ev) => {
            if (!ev.detail.own) return;
            // カメラ変更
            const teamid = ev.detail.team.id;
            const playerhash = ev.detail.player.hash;
            if (this.#camera_teamid != teamid || this.#camera_playerhash != playerhash) {
                this.#updatedCamera(teamid, playerhash);
            }
        });

        this.#webapi.addEventListener("playeritem", (ev) => {
            const playerhash = ev.detail.player.hash;
            const itemid = ev.detail.item;
            const count = this.#player_index[playerhash].items[itemid];
            this.#updatedPlayerItem(playerhash, itemid, count);
        });

        // チームバナーの表示状態
        this.#webapi.addEventListener("teambannerstate", (ev) => {
            const state = ev.detail.state;
            this.#teambanner_queue.splice(0);
            this.#teambanner_queue.push(ev);
            setTimeout(() => {
                if (this.#teambanner_queue.length > 0) {
                    const front = this.#teambanner_queue.at(0);
                    if (ev === front) {
                        this.#teambanner_queue.shift();
                        this.#recognition.banner = state;
                        this.#showHideFromCurrentStatus();
                    }
                }
            }, this.#teambanner_recognition_delay);
        });

        // マップの表示状態
        this.#webapi.addEventListener("mapstate", (ev) => {
            const state = ev.detail.state;
            this.#recognition.map = state;
            this.#showHideFromCurrentStatus();
        });

        // マッチ情報
        this.#webapi.addEventListener("matchsetup", (ev) => {
            this.#updatedMapName('map' in ev.detail.game ? ev.detail.game.map : '');
        });

        // LiveAPI側の接続状況
        this.#webapi.addEventListener("liveapisocketstats", (ev) => {
            if (this.#liveapi_connection_count != ev.detail.conn) {
                this.#updatedLiveAPIConnectionCount(ev.detail.conn);
            }
        });

        // Overlayの表示状態
        this.#webapi.addEventListener("gettournamentparams", (ev) => {
            this.#updatedTournamentParams(ev.detail.params);
        });

        this.#webapi.addEventListener("settournamentparams", (ev) => {
            if (ev.detail.result) {
                this.#updatedTournamentParams(ev.detail.params);
            }
        });

        // MatchResultの表示非表示命令
        this.#webapi.addEventListener("broadcastobject", (ev) => {
            if (ev.detail.data) {
                const data = ev.detail.data;
                if ("type" in data) {
                    switch (data.type) {
                        case "testgamestate": {
                            const state = data.state;
                            this.#updatedGameState(state);
                            break;
                        }
                        case "testteambanner": {
                            this.#recognition.banner = this.#recognition.banner ? false : true;
                            this.#showHideFromCurrentStatus();
                            break;
                        }
                        case "testmapleaderboard": {
                            this.#recognition.map = this.#recognition.map ? false : true;
                            this.#showHideFromCurrentStatus();
                            break;
                        }
                        case "testcamera": {
                            const teamid = data.teamid;
                            this.#updatedCamera(teamid, this.#camera_playerhash);
                            break;
                        }
                        case "testplayerbanner": {
                            const name = data.name;
                            this.#updatedCameraPlayerName(name);
                            break;
                        }
                        case "testteamkills": {
                            const kills = data.kills;
                            this.#updatedCameraTeamKills(kills);
                            break;
                        }
                        case "testowneditems": {
                            for (const [item, count] of Object.entries(data)) {
                                if (defined_item_ids.indexOf(item) >= 0) {
                                    this.#updatedCameraPlayerItem(item, count);
                                }
                            }
                            break;
                        }
                        case "testgamecount": {
                            const count = data.count;
                            this.#results_count = count;
                            this.#calc_resultsonly = true;
                            this.#updatedGameCount(count);
                            break;
                        }
                        case "testsquadeliminated": {
                            const placement = data.placement;
                            const teamid = data.teamid;
                            this.#updatedSquadEliminate(placement, teamid, false);
                            break;
                        }
                        case "testteamrespawned": {
                            for (const overlay of Object.values(this.#overlays)) {
                                if ('setTeamRespawn' in overlay && typeof (overlay.setTeamRespawn) == 'function') {
                                    const teamid = data.teamid;
                                    const teamname = this.#getTeamName(teamid);
                                    overlay.setTeamRespawn(teamid, teamname, data.respawn_player, data.respawned_players);
                                }
                            }
                            break;
                        }
                        case "testwinnerdetermine": {
                            const teamid = data.teamid;
                            this.#updatedWinnerDetermine(teamid);
                            break;
                        }
                        case "testwinnerdeterminereset": {
                            this.#winner_determine = false;
                            this.#showHideFromCurrentStatus();
                            break;
                        }
                        case "testreload": {
                            location.reload();
                            break;
                        };
                    }
                }
            }
        });
    }

    /**
     * 接続が切れたりエラーで失敗した場合の再接続処理
     */
    #tryReconnect() {
        /** @type {number[]} 再接続試行の間隔(ms) */
        const intervals = [1000, 2000, 4000, 8000];
        let interval = intervals[intervals.length - 1];
        if (this.#retry < intervals.length) interval = intervals[this.#retry];
        if (!this.#reconnecting) {
            this.#reconnecting = true;
            setTimeout(() => {
                this.#webapi.forceReconnect();
                this.#reconnecting = false;
            }, interval);
            this.#retry++;
        }
    }

    /**
     * ゲームの進行状況から表示/非表示を行う
     */
    #showHideFromCurrentStatus() {
        const game = this.#game_state;
        const map = this.#recognition.map;
        const banner = this.#recognition.banner;
        const winner_determine = this.#winner_determine;

        for (const overlay of Object.values(this.#overlays)) {
            const view_map = overlay.hasType("view-map");
            const view_live = overlay.hasType("view-live");
            const view_camera = overlay.hasType("view-camera");
            if (!view_map && !view_live && !view_camera) continue;
            let flag = false;
            switch(game) {
                case "WaitingForPlayers":
                case "PickLoadout":
                case "Prematch":
                    // prematch
                    if (view_live) {
                        flag = true;
                    }
                    break;
                case "Playing":
                    // マップ表示時
                    if (banner > 0) {
                        if (view_camera && !winner_determine) flag = true;
                        if (view_live) flag = true;
                    } else {
                        if (view_live) flag = true;
                        if (map > 0) {
                            if (view_map && !winner_determine) flag = true;
                        }
                    }
                    break;
                case "Resolution":
                case "Postmatch":
                default:
                    // postmatch
                    break;
            }
            if (!flag) {
                overlay.addHide();
            } else {
                overlay.removeHide();
            }
        }
    }

    /**
     * 全てのチームのパラメータを取得する(1～30)
     */
    #getAllTeamParams() {
        for (let i = 0; i < 30; ++i) {
            this.#webapi.getTeamParams(i);
        }
    }

    /**
     * チームのパラメータが更新された際の処理
     * @param {number} teamid チームID(0～)
     * @param {object} params チームのパラメータ
     */
    #updatedTeamParams(teamid, params) {
        this.#team_params[teamid] = params;
        if (!('name' in params)) return;
        if (params.name == '') return;
        this.#updatedTeamName(teamid, params.name);
    }

    /**
     * チームの名前が更新された際の処理
     * @param {number} teamid チームID(0～)
     * @param {string} name チームの名前
     */
    #updatedTeamName(teamid, name) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-name', name);
        }
        if (teamid == this.#camera_teamid) {
            this.#updatedCameraTeamName(name);
        }
    }

    #updatedTeamKills(teamid, kills) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-kills', kills);
        }
        if (teamid == this.#camera_teamid) {
            this.#updatedCameraTeamKills(kills);
        }
    }

    /**
     * チームの順位が変わった場合に呼び出される
     * @param {string} teamid チームID(0～)
     * @param {number} rank 現在の順位(0～)
     */
    #updatedTeamTotalRank(teamid, rank) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-total-rank', rank + 1);
        }
        if (this.#camera_teamid == teamid) {
            this.#updatedCameraTeamRank(rank + 1);
        }
    }

    #updatedTeamTotalRankCompleted(changeinfo) {
        for (const overlay of Object.values(this.#overlays)) {
            if ('sortTeamTotalRank' in overlay && typeof(overlay.sortTeamTotalRank) == 'function') {
                overlay.sortTeamTotalRank(changeinfo);
            }
        }
    }

    #updatedMapName(map) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('map-name', map);
        }
    }

    #updatedLiveAPIConnectionCount(conn) {
        this.#liveapi_connection_count = conn;
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('liveapi-connection-count', conn);
        }
    }

    #updatedWebAPIConnectionStatus(status) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('webapi-connection-status', status);
        }
    }
    /**
     * チームの合計キルポイントが変わった場合に呼び出される
     * @param {string} teamid チームID(0～)
     * @param {number} points 現在の合計キルポイント
     */
    #updatedTeamTotalKillPoints(teamid, points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-total-kill-points', points);
        }
    }

    /**
     * チームの合計順位ポイントが変わった場合に呼び出される
     * @param {string} teamid チームID(0～)
     * @param {number} points 現在の合計順位ポイント
     */
    #updatedTeamTotalPlacementPoints(teamid, points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-total-placement-points', points);
        }
    }

    /**
     * チームの合計ポイントが変わった場合に呼び出される
     * @param {string} teamid チームID(0～)
     * @param {number} points 現在の合計ポイント
     */
    #updatedTeamTotalPoints(teamid, points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-total-points', points);
        }
        if (this.#camera_teamid == teamid) {
            this.#updatedCameraTeamTotalPoints(points);
        }
    }

    #updatedSingleResultMapName(map) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('single-last-map-name', map);
        }
    }

    #updatedTeamSingleResultPlacement(teamid, placement) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-single-last-placement', placement);
        }
    }

    #updatedTeamSingleResultKillPoints(teamid, points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-single-last-kill-points', points);
        }
    }

    #updatedTeamSingleResultPlacementPoints(teamid, points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-single-last-placement-points', points);
        }
    }

    #updatedTeamSingleResultPoints(teamid, points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-single-last-points', points);
        }
    }
    
    #updatedTeamSingleResultDamage(teamid, dealt, taken) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setTeamParam(teamid, 'team-single-last-damagedealt', dealt);
            overlay.setTeamParam(teamid, 'team-single-last-damagetaken', taken);
        }
    }

    /**
     * プレイヤーのパラメータが更新された際の処理
     * @param {string} hash プレイヤーID
     * @param {object} params プレイヤーのパラメータ
     */
    #updatedPlayerParams(hash, params) {
        if (hash == '') return;
        this.#player_params[hash] = params;
        if (!('name' in params)) return;
        this.#updatedPlayerName(hash, params.name);
        this.#updatedPlayerSingleResultName(hash, params.name);
    }

    #updatedTournamentParams(params) {
        this.#tournament_params = params;
        this.#setForceHideFromParams(params);
    }

    #updatedTournamentId(id) {
        this.#tournament_id = id;

        this.#getAllTeamParams();
        this.#webapi.getTournamentResults();
        this.#webapi.getTournamentParams();

        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('tournament-id', id);
        }
    }

    #updatedResultsCount(count) {
        this.#results_count = count;
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam("results-count", count);
        }

        this.#updatedGameCount();
    }

    #updatedGameCount() {
        for (const overlay of Object.values(this.#overlays)) {
            const count = this.#results_count + (this.#calc_resultsonly ? 0 : 1);
            overlay.setParam("game-count", count);
        }
    }

    #updatedPlayerParam(hash, param, value) {
        if (hash in this.#player_index) {
            // 現ゲームに存在するプレイヤー処理
            const player = this.#player_index[hash];
            for (const overlay of Object.values(this.#overlays)) {
                overlay.setPlayerParam(hash, `player-${param}`, value);
                if (!overlay.hasType("players-singleresult")) {
                    overlay.setTeamPlayerParam(player.teamid, hash, `teamplayer-${param}`, value);
                }
            }
            if (this.#camera_teamid == player.teamid) {
                this.#updatedCameraPlayersParam(hash, param, value);
            }
            if (this.#camera_teamid == player.teamid && this.#camera_playerhash == hash) {
                this.#updatedCameraPlayerParam(param, value);
            }
        }
    }

    #updatedCameraPlayerParam(param, value) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam(`camera-player-${param}`, value);
        }
    }

    #updatedCameraPlayersParam(playerhash, param, value) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setCameraPlayerParam(playerhash, `cameraplayer-${param}`, value);
        }
    }

    #updatedPlayerId(hash) {
        this.#updatedPlayerParam(hash, 'id', hash);
    }

    #updatedPlayerName(hash, name) {
        name = this.#getPlayerName(hash);
        this.#updatedPlayerParam(hash, 'name', name);
    }

    #updatedPlayerKills(hash, kills) {
        this.#updatedPlayerParam(hash, 'kills', kills);
    }

    #updatedPlayerItem(hash, itemid, count) {
        this.#updatedPlayerParam(hash, `item-${itemid}`, count);
    }

    #updatedPlayerSingleResultParam(playerid, param, value) {
        if (playerid in this.#player_index_singleresult) {
            const teamid = this.#player_index_singleresult[playerid].teamid;
            for (const overlay of Object.values(this.#overlays)) {
                if (overlay.hasType("players-singleresult")) {
                    overlay.setPlayerParam(playerid, `player-${param}`, value);
                    overlay.setTeamPlayerParam(teamid, playerid, `teamplayer-${param}`, value);
                }
            }
        }
    }

    #updatedPlayerSingleResultId(playerid) {
        this.#updatedPlayerSingleResultParam(playerid, 'id', playerid);
    }

    #updatedPlayerSingleResultName(playerid, name) {
        this.#updatedPlayerSingleResultParam(playerid, 'name', name);
    }

    #updatedPlayerSingleResultLegend(playerid, legend) {
        this.#updatedPlayerSingleResultParam(playerid, 'legend', legend);
    }

    #updatedPlayerSingleResultKills(playerid, kills) {
        this.#updatedPlayerSingleResultParam(playerid, 'kills', kills);
    }

    #updatedPlayerSingleResultDamage(playerid, dealt, taken) {
        this.#updatedPlayerSingleResultParam(playerid, 'damagedealt', dealt);
        this.#updatedPlayerSingleResultParam(playerid, 'damagetaken', taken);
    }

    #updatedWinnerDetermine(teamid) {
        this.#winner_determine = true;
        for (const overlay of Object.values(this.#overlays)) {
            // ChampionBannerの表示
            if ('setWinnerDetermine' in overlay && typeof(overlay.setWinnerDetermine) == 'function') {
                const teamname = this.#getTeamName(teamid);
                overlay.setWinnerDetermine(teamid, teamname);
            }
        }
        this.#showHideFromCurrentStatus();
    }

    #updatedTeamExists(teamid) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.addTeamClass(teamid, 'team-exists'); // 存在するチームにクラスを付与
        }
    }

    #updatedSquadEliminate(placement, teamid, init) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.addTeamClass(teamid, 'team-squad-eliminate'); // 削除されたチームにクラスを付与
            if ('setSquadEliminate' in overlay && typeof(overlay.setSquadEliminate) == 'function') {
                const teamname = this.#getTeamName(teamid);
                overlay.setSquadEliminate(placement, teamid, teamname, init);
            }
        }
    }

    #updatedTeamRespawn(teamid, player, targets) {
        for (const overlay of Object.values(this.#overlays)) {
            if ('setTeamRespawn' in overlay && typeof (overlay.setTeamRespawn) == 'function') {
                const teamname = this.#getTeamName(teamid);
                const respawn_playername = this.#getPlayerName(player.hash);
                const respawned_playernames = targets.map(x => this.#getPlayerName(x.hash));
                overlay.setTeamRespawn(teamid, teamname, respawn_playername, respawned_playernames);
            }
        }
    }

    #updatedPlayerLegend(hash, legend) {
        this.#updatedPlayerParam(hash, 'legend', legend);
    }

    #updatedPlayerState(hash, state) {
        // 特定のメソッドを呼び出す
        if (hash in this.#player_index) {
            const player = this.#player_index[hash];
            for (const overlay of Object.values(this.#overlays)) {
                if ('setTeamPlayerState' in overlay && typeof(overlay.setTeamPlayerState) == 'function') {
                    overlay.setTeamPlayerState(player.teamid, hash, state);
                }
            }
        }

        this.#updatedPlayerParam(hash, 'state', state);
    }

    #updatedTournamentName(name) {
        this.#tournament_name = name;
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('tournament-name', name);
        }
    }

    #updatedGame(game) {
        this.#game = game;
        this.#player_index = {}; // ゲームに紐づくindexは削除
        this.#saved_teamresults = {}; // ポイント情報を初期化
        if ('state' in game && this.#game_state != game.state) {
            this.#updatedGameState(game.state);
        }
    }

    #updatedGameState(state) {
        this.#game_state = state;
        this.#showHideFromCurrentStatus();

        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('game-state', state);
        }

        // 計算方法の変更確認
        let calc_resultsonly = this.#calc_resultsonly;
        switch(state) {
            case "WaitingForPlayers":
            case "PickLoadout":
            case "Prematch":
            case "Playing":
                calc_resultsonly = false;
                break;
        }
        if (this.#calc_resultsonly != calc_resultsonly) {
            this.#updatedCalcResultsOnly();
        }
    }

    #updatedCalcResultsOnly(resultsonly) {
        this.#calc_resultsonly = resultsonly;
        this.#reCalc();
        this.#updatedGameCount();
    }

    /**
     * カメラが切り替わった際に呼び出される
     * @param {number} teamid チームID(0～)
     * @param {number} playerhash プレイヤーのID(ハッシュ)
     */
    #updatedCamera(teamid, playerhash) {
        if (this.#camera_teamid != teamid) {
            this.#camera_teamid = teamid;
            this.#updatedCameraTeamId(teamid);
            this.#clearCameraPlayers();
        }

        if (this.#camera_playerhash != playerhash) {
            this.#camera_playerhash = playerhash;
            this.#updatedCameraPlayerId(playerhash);
        }

        this.#updatedCameraTeamName(this.#getTeamName(teamid));
        this.#updatedCameraPlayerName(this.#getPlayerName(playerhash));

        // チームデータが存在する場合
        if (this.#game && 'teams' in this.#game) {
            if (0 <= teamid && teamid < this.#game.teams.length) {
                const team = this.#game.teams[teamid];
                // チームキル更新
                if ('kills' in team) {
                    this.#updatedCameraTeamKills(team.kills);
                }
                // プレイヤーデータ処理
                if ('players' in team) {
                    for (const player of team.players) {
                        this.#updatedCameraPlayersId(player.hash);
                        this.#updatedCameraPlayersActive(player.hash, player.hash == playerhash ? 1 : 0);
                        this.#updatedCameraPlayersName(player.hash, this.#getPlayerName(player.hash));
                        if ('kills' in player) {
                            this.#updatedCameraPlayersKills(player.hash, player.kills);
                            if (player.hash == playerhash) {
                                this.#updatedCameraPlayerKills(player.kills);
                            }
                        }
                        if (('items' in player)) {
                            for (const [itemid, count] of Object.entries(player.items)) {
                                this.#updatedCameraPlayersItem(player.hash, itemid, count);
                                if (player.hash == playerhash) {
                                    this.#updatedCameraPlayerItem(itemid, count);
                                }
                            }
                        }
                    }
                }
            }
        }

        // ポイントデータが存在する場合
        if (this.#camera_teamid in this.#saved_teamresults) {
            const team = this.#saved_teamresults[teamid];
            if ('rank' in team) {
                this.#updatedCameraTeamRank(team.rank + 1);
            }
            if ('points' in team) {
                this.#updatedCameraTeamTotalPoints(team.points.reduce((a, c) => a + c, 0));
            }
        }
    }

    /* カメラ系 */
    #updatedCameraTeamId(teamid) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('camera-team-id', teamid);
        }
    }

    #updatedCameraTeamName(name) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('camera-team-name', name);
        }
    }

    #updatedCameraTeamRank(rank) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('camera-team-rank', rank);
        }
    }

    #updatedCameraTeamKills(kills) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('camera-team-kills', kills);
        }
    }

    #updatedCameraTeamTotalPoints(points) {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.setParam('camera-team-total-points', points);
        }
    }

    #updatedCameraPlayerId(hash) {
        this.#updatedCameraPlayerParam('id', hash);
    }

    #updatedCameraPlayerName(name) {
        this.#updatedCameraPlayerParam('name', name);
    }

    #updatedCameraPlayerKills(kills) {
        this.#updatedCameraPlayerParam('kills', kills);
    }

    #updatedCameraPlayerItem(itemid, count) {
        this.#updatedCameraPlayerParam(`item-${itemid}`, count);
    }

    /* cameraplayers系 */
    #clearCameraPlayers() {
        for (const overlay of Object.values(this.#overlays)) {
            overlay.clearCameraPlayers();
        }
    }

    #updatedCameraPlayersId(hash) {
        this.#updatedCameraPlayersParam(hash, 'id', hash);
    }

    #updatedCameraPlayersActive(hash, active) {
        this.#updatedCameraPlayersParam(hash, 'active', active);
    }

    #updatedCameraPlayersName(hash, name) {
        this.#updatedCameraPlayersParam(hash, 'name', name);
    }

    #updatedCameraPlayersKills(hash, kills) {
        this.#updatedCameraPlayersParam(hash, 'kills', kills);
    }

    #updatedCameraPlayersItem(hash, itemid, count) {
        this.#updatedCameraPlayersParam(hash, `item-${itemid}`, count);
    }

    /**
     * 現在の順位・キル数からポイントを計算する
     */
    #calcPoints() {
        // リザルトデータを格納
        const teamresults = resultsToTeamResults(this.#results);
        if (!this.#calc_resultsonly) {
            // 現在の試合のポイントをいれる
            for (let teamid = 0; teamid < this.#game.teams.length; ++teamid) {
                const src = this.#game.teams[teamid];
                if (src.players.length > 0) {
                    appendToTeamResults(teamresults, this.#results.length, teamid, src.name, src.kills, src.placement);
                    const dst = teamresults[teamid];
                    dst.eliminated = src.eliminated;
                    for (const player of src.players) {
                        dst.status.push(player.state);
                    }
                }
            }
        }

        // ポイントを計算して追加
        for (const team of Object.values(teamresults)) {
            for (let gameid = 0; gameid < team.kills.length && gameid < team.placements.length; ++gameid) {
                const points = calcPoints(gameid, team.placements[gameid], team.kills[gameid], this.#tournament_params);
                team.points.push(points.total);
                team.kill_points.push(points.kills);
                team.placement_points.push(points.placement);
                team.other_points.push(points.other);
            }
            team.total_points = team.points.reduce((a, c) => a + c, 0);
        }

        // 順位計算
        setRankParameterToTeamResults(teamresults);

        return teamresults;
    }

    /**
     * 計算～表示までの処理を行う
     */
    #reCalc() {
        const teamresults = this.#calcPoints();
        const changeinfo = [];
        for (const [teamid, teamresult] of Object.entries(teamresults)) {
            // 順位・ポイント変動確認
            let rank_flag = true;
            let points_flag = true;
            if (teamid in this.#saved_teamresults) {
                const prev_teamresult = this.#saved_teamresults[teamid];
                if (teamresult.rank == prev_teamresult.rank) {
                    rank_flag = false;
                }
                if (teamresult.total_points == prev_teamresult.total_points) {
                    points_flag = false;
                }
            }
            if (rank_flag) {
                this.#updatedTeamTotalRank(parseInt(teamid, 10), teamresult.rank);
                changeinfo.push({ id: parseInt(teamid, 10), changed: true });
            }
            if (points_flag) {
                this.#updatedTeamTotalKillPoints(parseInt(teamid, 10), teamresult.kill_points.reduce((a, c) => a + c, 0));
                this.#updatedTeamTotalPlacementPoints(parseInt(teamid, 10), teamresult.placement_points.reduce((a, c) => a + c, 0));
                this.#updatedTeamTotalPoints(parseInt(teamid, 10), teamresult.total_points);
            }
        }
        if (changeinfo.length > 0) {
            this.#updatedTeamTotalRankCompleted(changeinfo);
        }
        this.#saved_teamresults = teamresults;
    }

    /**
     * 最新のリザルトを処理する
     */
    #updatedSingleResult() {
        // プレイヤーの索引を削除
        this.#player_index_singleresult = {};

        // 特定のメソッドを持っている場合はteams要素をクリアする
        for (const overlay of Object.values(this.#overlays)) {
            if ('sortTeamSingleResultPlacement' in overlay && typeof(overlay.sortTeamSingleResultPlacement) == 'function') {
                overlay.clear();
            }
        }
        if (this.#results.length == 0) return;
        const gameid = this.#results.length - 1;
        const result = this.#results[gameid];
        this.#updatedSingleResultMapName('map' in result ? result.map : '');
        if ('teams' in result) {
            for (const [teamidstr, team] of Object.entries(result.teams)) {
                const teamid = parseInt(teamidstr, 10);
                const points = calcPoints(gameid, team.placement, team.kills, this.#tournament_params);
                this.#updatedTeamName(teamid, this.#getTeamName(teamid));
                this.#updatedTeamSingleResultPlacement(teamid, team.placement);
                this.#updatedTeamSingleResultKillPoints(teamid, points.kills);
                this.#updatedTeamSingleResultPlacementPoints(teamid, points.placement);
                this.#updatedTeamSingleResultPoints(teamid, points.total);
                let damage_dealt = 0;
                let damage_taken = 0;
                for (const player of team.players) {
                    const hash = player.id;
                    player.teamid = teamid;
                    this.#player_index_singleresult[hash] = player;
                    this.#updatedPlayerSingleResultId(hash);
                    this.#updatedPlayerSingleResultName(hash, player.name);
                    this.#updatedPlayerSingleResultLegend(hash, player.character);
                    this.#updatedPlayerSingleResultKills(hash, player.kills);
                    this.#updatedPlayerSingleResultDamage(hash, player.damage_dealt, player.damage_taken);
                    damage_dealt += player.damage_dealt;
                    damage_taken += player.damage_taken;
                }
                this.#updatedTeamSingleResultDamage(teamid, damage_dealt, damage_taken);
            }
        }
        for (const overlay of Object.values(this.#overlays)) {
            if ('sortTeamSingleResultPlacement' in overlay && typeof(overlay.sortTeamSingleResultPlacement) == 'function') {
                overlay.sortTeamSingleResultPlacement();
            }
        }
    }

    #updatedParticipatedTeamsInformation() {
        for (const teamidstr of Object.keys(this.#saved_teamresults)) {
            const teamid = parseInt(teamidstr, 10);
            const name = this.#getTeamName(teamid);
            this.#updatedTeamName(teamid, name);
        }
    }

    /**
     * 保存されたチーム用paramsや現在プレイ中のチーム情報から名前を取得する
     * @param {string|number} teamid チームID(0～)
     * @returns {string} チーム名
     */
    #getTeamName(teamid) {
        teamid = parseInt(teamid, 10);
        if (teamid in this.#team_params) {
            const params = this.#team_params[teamid];
            if ('name' in params) {
                return params.name;
            }
        }
        if (teamid < this.#game.teams.length) {
            const team = this.#game.teams[teamid];
            if ('name' in team) {
                // remove @number
                return team.name.replace(/@[0-9]+$/, '');
            }
        }
        // リザルトからチーム名取得
        for (let i = this.#results.length - 1; i >= 0; i--) {
            const result = this.#results[i];
            if ('teams' in result && teamid in result.teams) {
                const team = result.teams[teamid];
                if ('name' in team) {
                    return team.name;
                }
            }
        }
        return "チーム " + teamid;
    }

    /**
     * 保存されたプレイヤー用prams等からプレイヤー情報を取得する
     * @param {string} playerhash プレイヤーID(ハッシュ)
     * @param {string} fallback 存在しない場合の代替名
     * @returns {string} プレイヤー名
     */
    #getPlayerName(hash, fallback = '') {
        if (hash == '') return fallback;
        if (!(hash in this.#player_index)) return fallback;

        // 保存されているパラメータ
        if (hash in this.#player_params) {
            const params = this.#player_params[hash];
            if ('name' in params) return params.name;
        }

        // ゲーム内の名前
        if (hash in this.#player_index) {
            const player = this.#player_index[hash];
            if ('name' in player) return player.name;
        }

        return fallback;
    }

    #setForceHideFromParams(params) {
        const forcehide = 'forcehide' in params ? params.forcehide : {};
        for (const [key, overlay] of Object.entries(this.#overlays)) {
            const defaulthide = overlay.hasType("defaulthide");
            let hide = defaulthide;
            if (key in forcehide) {
                hide = forcehide[key];
            }
            if (hide) overlay.addForceHide();
            else overlay.removeForceHide();
        }
    }
}
