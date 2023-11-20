export class OverlayBase {
    /** @type {string} hide()/show()で付与・削除されるクラス名 */
    static HIDE_CLASS = "hide";
    /** @type {string} addForceHide()/removeForceHide()で付与・削除されるクラス名 */
    static FORCEHIDE_CLASS = "forcehide";
    /** @type {string} baseノードのID */
    ID;
    /** @type {string} クラスを設定する際に先頭に付与する文字列 */
    PREFIX;
    /** @type {HTMLElement[]} オーバーレイに関連するノード一覧 */
    nodes;
    /**
     * コンストラクタ
     * @param {string} id baseノードのID
     * @param {string} prefix クラスを追加する際のPREFIX
     * @param {HTMLElement} root baseノードの追加先
     */
    constructor(id, prefix, root = document.body) {
        this.ID = id;
        this.PREFIX = prefix;

        this.nodes = {
            base: document.createElement('div')
        };

        if (id != "") {
            this.nodes.base.id = this.ID;
        }

        root.appendChild(this.nodes.base);
    }

    /**
     * baseノードにノードを追加する
     * @param {string} name クラス名に含まれる文字列
     * @param {string} tag 追加するノードのタグ名(default:div)
     * @returns 
     */
    addNode(name, tag = "div") {
        if (name == "" || name in this.nodes) return; // 既に存在する場合は何もしない
        this.nodes[name] = document.createElement(tag);
        this.nodes[name].classList.add(this.PREFIX + name);
    }

    /**
     * baseノードからhideクラスを削除
     */
    hide() {
        this.nodes.base.classList.add(OverlayBase.HIDE_CLASS);
    }

    /**
     * baseノードにhideクラスを付与
     */
    show() {
        this.nodes.base.classList.remove(OverlayBase.HIDE_CLASS);
    }

    /**
     * baseノードにforcehideクラスを付与
     */
    addForceHide() {
        this.nodes.base.classList.add(OverlayBase.FORCEHIDE_CLASS);
    }

    /**
     * baseノードからforcehideクラスを削除
     */
    removeForceHide() {
        this.nodes.base.classList.remove(OverlayBase.FORCEHIDE_CLASS);
    }

    /**
     * 引数の文字列にPREFIXをつけたクラスをbaseノードに付与
     * @param {string} name クラス名に含まれる文字列
     */
    addClass(name) {
        this.nodes.base.classList.add(this.PREFIX + name);
    }

    /**
     * 引数の文字列にPREFIXをつけたクラスをbaseノードから削除
     * @param {string} name クラス名に含まれる文字列
     */
    removeClass(name) {
        this.nodes.base.classList.remove(this.PREFIX + name);
    }

    /**
     * 引数の文字列にPREFIXをつけた文字列から始まるクラスを全て削除する
     * @param {string} name クラス名に含まれる文字列
     */
    clearClasses(name) {
        for (const id of this.nodes.base.classList) {
            if (id.indexOf(this.PREFIX + name) == 0) {
                this.nodes.base.classList.remove(id);
            }
        }
    }
}


/**
 * @const {number[]} calcpoints_table 順位ポイント
 */
const calcpoints_table = [12, 9, 7, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1];

/**
 * ポイント詳細
 * @typedef {object} detailpoints
 * @prop {number} total 合計ポイント
 * @prop {number} kills キルポイント
 * @prop {number} placement 順位ポイント
 * @prop {number} other その他ポイント
 */

/**
 * 順位ポイント・キル数からマッチのポイントを計算する
 * @param {number} gameid 計算対象のゲーム番号(0～)
 * @param {number} placement 順位(1～20)
 * @param {number} kills キル数
 * @param {object} params トーナメントparams(ポイント計算用)
 * @returns {detailpoints} ポイント(詳細データ)
 */
export function calcPoints(gameid, placement, kills, params) {
    if (placement <= 0) throw new Error('placement is >= 0.');
    const points = {
        total: 0,
        kills: 0,
        placement: 0,
        other: 0
    };

    let calcmethod = {};
    if ('calcmethod' in params && gameid in params.calcmethod) calcmethod = params.calcmethod[gameid];

    // キルによるポイント計算
    let killamp = 1;
    if ('killamp' in calcmethod) killamp = calcmethod.killamp;
    points.kills = kills * killamp;

    let killcap = 0xff;
    if ('killcap' in calcmethod) killcap = calcmethod.killcap;
    if (points.kills > killcap) points.kills = killcap;

    // 順位ポイント計算
    if ('customtable' in calcmethod) {
        if (placement - 1 < calcmethod.customtable.length) points.placement = calcmethod.customtable[placement - 1];
    } else {
        if (placement - 1 < calcpoints_table.length) points.placement = calcpoints_table[placement - 1];
    }

    // その他のポイント計算
    points.other = 0;

    // 合計
    points.total = points.kills + points.placement + points.other;
    return points;
}

/**
 * 計算用のチームオブジェクト
 * @typedef {object} teamresult
 * @prop {string} name チーム名
 * @prop {number} total_points 合計ポイント
 * @prop {number[]} points 各ゲームのポイント
 * @prop {number[]} placements 各ゲームの順位(1～)
 * @prop {number[]} kills 各ゲームのキル数
 * @prop {number[]} kill_points 各ゲームのキルポイント
 * @prop {number[]} placement_points 各ゲームの順位ポイント
 * @prop {number[]} other_points 各ゲームのその他ポイント
 * @prop {number} rank 順位(-1は未評価, 0=1位,1=2位...)
 * @prop {boolean} eliminated 排除済みかどうか
 * @prop {number[]} status プレーヤーの生存状況
 */

/**
 * 計算用のチームオブジェクト入れ
 * @typedef {Object.<number, teamresult>} teamresults
 */

/**
 * teamresultオブジェクトの初期化
 * @param {number} teamid チームID(0～)
 * @param {string} name チーム名
 * @returns {teamresult} チームリザルト
 */
function initTeamResult(teamid, name) {
    return {
        id: teamid,
        name: name,
        total_points: 0,
        points: [],
        placements: [],
        kills: [],
        kill_points: [],
        placement_points: [],
        other_points: [],
        eliminated: false,
        status: [],
        rank: -1
    };
}

/**
 * webapiで取得したリザルトをteamresults形式にして返す
 * @param {object[]} results webapi側で取得できるresultの入った配列
 * @return {teamresults} teamresult形式のデータ
 */
export function resultsToTeamResults(results) {
    const teamresults = {};
    results.forEach((result, index) => {
        for (const [teamid, team] of Object.entries(result.teams)) {
            if (!(teamid in teamresults)) {
                teamresults[teamid] = initTeamResult(teamid, team.name);
            }
            const tr = teamresults[teamid];

            // 参加していない試合分を埋める
            while (tr.kills.length < index) { tr.kills.push(0) }
            while (tr.placements.length < index) { tr.placements.push(0xff) }

            // 入っている試合分のデータを入れる
            tr.kills.push(team.kills);
            tr.placements.push(team.placement);
        }
    });
    return teamresults;
}

/**
 * キルと順位を追加する
 * @param {teamresults} teamresults 追加対象
 * @param {number} gameid ゲームID
 * @param {number} teamid チームID
 * @param {string} name チーム名
 * @param {number} kills キル数
 * @param {number} placement 順位
 */
export function appendToTeamResults(teamresults, gameid, teamid, name, kills, placement) {
    if (!(teamid in teamresults)) {
        teamresults[teamid] = initTeamResult(teamid, name);
    }
    const tr = teamresults[teamid];

    // 参加していない試合分を埋める
    while (tr.kills.length < gameid) { tr.kills.push(0) }
    while (tr.placements.length < gameid) { tr.placements.push(0xff) }

    // 入っている試合分のデータを入れる
    tr.kills.push(kills);
    tr.placements.push(placement);
}

/**
 * 現在の順位を計算してteamresultsのパラメータに設定する
 * @param {teamresults} teamresults total_points,points,placements,killsをパラメータに持つ
 * @return {string[]}
 */
export function setRankParameterToTeamResults(teamresults) {
    const keys = JSON.parse(JSON.stringify(Object.keys(teamresults)));
    const sorted_teamids = keys.sort((a, b) => {
        // 現在のトータルポイント比較
            const ta = teamresults[a];
            const tb = teamresults[b];

            // 現在のトータルポイント比較
            if (ta.total_points > tb.total_points) return -1;
            if (ta.total_points < tb.total_points) return  1;

            // ソート
            ta.points.sort().reverse();
            tb.points.sort().reverse();
            ta.placements.sort();
            tb.placements.sort();
            ta.kills.sort().reverse();
            tb.kills.sort().reverse();

            // 同点の場合は、過去のゲームの最高ポイント
            for (let i = 0; i < ta.points.length && i < tb.points.length; ++i) {
                if (ta.points[i] > tb.points[i]) return -1;
                if (ta.points[i] < tb.points[i]) return  1;
            }

            // 同点の場合は、過去のゲームの最高順位
            for (let i = 0; i < ta.placements.length && i < tb.placements.length; ++i) {
                if (ta.placements[i] > tb.placements[i]) return  1;
                if (ta.placements[i] < tb.placements[i]) return -1;
            }

            // 同点の場合は、過去のゲームの最高キル数
            for (let i = 0; i < ta.kills.length && i < tb.kills.length; ++i) {
                if (ta.kills[i] > tb.kills[i]) return -1;
                if (ta.kills[i] < tb.kills[i]) return  1;
            }

            // イレギュラー: 試合数多いほうが勝ち(比較対象が多い)
            if (ta.points.length > tb.points.length) return -1;
            if (ta.points.length < tb.points.length) return  1;

            return 0;
    });
    for (let rank = 0; rank < sorted_teamids.length; ++rank) {
        const teamid = sorted_teamids[rank];
        teamresults[teamid].rank = rank;
    }
    return sorted_teamids;
}

/**
 * 計算用のプレーヤー戦績オブジェクト
 * @typedef {object} playerstat
 * @prop {string} name プレイヤー名
 * @prop {string} hash プレイヤーID(hash)
 * @prop {string} teamname チーム名
 * @prop {string} teamid チームID
 * @prop {number} kills 各ゲームのポイント
 * @prop {number} assists 各ゲームの順位(1～)
 * @prop {number} damage 各ゲームのキル数
 * @prop {number} rank 順位
 */

/**
 * プレイヤー戦績
 * @typedef {Object.<string, playerstat>} playerstats
 */

/**
 * playerstatオブジェクトの初期化
 * @param {string} hash プレイヤーID(hash)
 * @param {string} name プレイヤー名
 * @returns {playerstat} プレイヤー戦績
 */
function initPlayerStat(hash, name) {
    return {
        name: name,
        hash: hash,
        teamname: "",
        teamid: "",
        kills: 0,
        assists: 0,
        damage: 0,
        rank: 0,
    };
}

/**
 * webapiで取得したリザルトをplayerstats形式にして返す
 * @param {object[]} results webapi側で取得できるresultの入った配列
 * @return {playerstats} playerstats形式のデータ
 */
export function resultsToPlayerStats(results) {
    const playerstats = {};
    for (const result of results) {
        for (const [teamid, team] of Object.entries(result.teams)) {
            for (const player of team.players) {
                if (!(player.id in playerstats)) {
                    playerstats[player.id] = initPlayerStat(player.id, player.name);
                }
                const stats = playerstats[player.id];
                if (stats.teamid == "") stats.teamid = teamid;
                if (stats.teamname == "") stats.teamname = team.name;
                stats.kills += player.kills;
                stats.assists += player.assists;
                stats.damage += player.damage_dealt;
            }
        }
    }
    return playerstats;
}

/**
 * @param {string} html 1つの要素を含むHTML文字列
 * @return {HTMLElement} 作成されたHTMLElement
 */
export function htmlToElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content;
}
