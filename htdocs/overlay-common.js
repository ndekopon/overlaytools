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

        this.nodes.base.id = this.ID;
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
 * 順位ポイント・キル数からマッチのポイントを計算する
 * @param {number} gameid 計算対象のゲーム番号(0～)
 * @param {number} placement 順位(1～20)
 * @param {number} kills キル数
 */
export function calcPoints(gameid, placement, kills) {
    // INFO: キル数制限等ある場合は、ここでキル数の調整を行う
    if (placement < 0) throw new Error('placement is >= 0.');
    if (placement == 0) return 0; // 未参加試合は0ポイント
    if (placement - 1 >= calcpoints_table.length) return kills;
    return calcpoints_table[placement - 1] + kills;
}

/**
 * 計算用のチームオブジェクト
 * @typedef {object} teamresult
 * @prop {string} name チーム名
 * @prop {number} total_points 合計ポイント
 * @prop {number[]} points 各ゲームのポイント
 * @prop {number[]} placements 各ゲームの順位(1～)
 * @prop {number[]} kills 各ゲームのキル数
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
 * @param {string} name チーム名
 * @returns 
 */
function initTeamResult(name) {
    return {
        name: name,
        total_points: 0,
        points: [],
        placements: [],
        kills: [],
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
                teamresults[teamid] = initTeamResult(team.name);
            }
            const tr = teamresults[teamid];

            // 参加していない試合分を埋める
            while (tr.kills.length < index) { tr.kills.push(0) }
            while (tr.placements.length < index) { tr.placements.push(0) }

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
        teamresults[teamid] = initTeamResult(name);
    }
    const tr = teamresults[teamid];

    // 参加していない試合分を埋める
    while (tr.kills.length < gameid) { tr.kills.push(0) }
    while (tr.placements.length < gameid) { tr.placements.push(Object.keys(teamresults).length) }

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
            ta.points.reverse();
            tb.points.reverse();
            ta.placements.sort();
            tb.placements.sort();
            ta.kills.reverse();
            tb.kills.reverse();

            // 同点の場合は、過去のゲームの最高ポイント
            for (let i = 0; i < ta.points.length && i < tb.points.length; ++i) {
                if (ta.points[i] > tb.points[i]) return -1;
                if (tb.points[i] < tb.points[i]) return  1;
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