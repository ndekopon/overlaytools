import {
    calcPoints,
    OverlayBase,
    appendToTeamResults,
    resultsToTeamResults,
    setRankParameterToTeamResults,
    resultsToPlayerStats,
} from "./overlay-common.js";
import * as ApexWebAPI from "./apex-webapi.js";

class LeaderBoardTeamNode extends OverlayBase {
    static #FADEIN_CLASS = "lb_fadein";
    static #FADEOUT_CLASS = "lb_fadeout";
    static #CHANGED_CLASS = "lb_changed";
    static #ELIMINATED_CLASS = "lb_eliminated";
    static #EXISTS_CLASS = "lb_exists";
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

    /**
     * 現在の順位をテキストに設定する
     * @param {number|string} rank 現在の順位(1～)
     */
    setRank(rank) {
        this.nodes.rank.innerText = '#' + rank;
    }

    /**
     * 排除済みクラスを設定・削除する
     * @param {boolean} eliminated 排除されたかどうか
     */
    setEliminated(eliminated) {
        if (eliminated) {
            this.nodes.base.classList.add(LeaderBoardTeamNode.#ELIMINATED_CLASS);
        } else {
            this.nodes.base.classList.remove(LeaderBoardTeamNode.#ELIMINATED_CLASS);
        }
    }

    /**
     * 存在するチームを設定する
     */
    setExists() {
        this.nodes.base.classList.add(LeaderBoardTeamNode.#EXISTS_CLASS);
    }

    /**
     * チーム名を設定する
     * @param {string} name チーム名
     */
    setTeamName(name) {
        this.nodes.name.innerText = name;
    }

    /**
     * 合計ポイントを設定する
     * @param {number} points 合計ポイント
     */
    setPoints(points) {
        this.nodes.points.innerText = points;
    }

    /**
     * 排除済みのクラスが設定済みか確認する
     * @returns {boolean} true=排除済,false=未排除
     */
    isEliminated() {
        return this.nodes.base.classList.contains(LeaderBoardTeamNode.#ELIMINATED_CLASS);
    }

    /**
     * 生存状態か確認する
     * @returns {boolean} true=生存,false=排除
     */
    isAlive() {
        // 存在＆未排除
        if (!this.nodes.base.classList.contains(LeaderBoardTeamNode.#EXISTS_CLASS)) return false;
        return !this.nodes.base.classList.contains(LeaderBoardTeamNode.#ELIMINATED_CLASS);
    }

    /**
     * フェードアウトアニメーション用のクラスが設定されているか確認する
     * @returns {boolean} true=設定済,false=未設定
     */
    hasFadeOut() {
        return this.nodes.base.classList.contains(LeaderBoardTeamNode.#FADEOUT_CLASS);
    }

    /**
     * プレーヤーの生存状況をcanvasに反映する
     * @param {number} index squadindex(0～)
     * @param {number} state プレーヤーの状態(生存/ダウン/死亡など)
     */
    setPlayerState(index, state) {
        if (index >= 3) return;
        this.setExists();

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

    /**
     * フェードインアニメーション設定
     */
    fadeIn() {
        super.show();
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#CHANGED_CLASS);
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#FADEOUT_CLASS);
        this.nodes.base.classList.add(LeaderBoardTeamNode.#FADEIN_CLASS);
    }

    /**
     * フェードアウトアニメーション設定
     */
    fadeOut() {
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#CHANGED_CLASS);
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#FADEIN_CLASS);
        this.nodes.base.classList.add(LeaderBoardTeamNode.#FADEOUT_CLASS);
    }

    /**
     * 変更アニメーション設定
     */
    setChanged() {
        // fadeout中は何もしない
        if (this.hasFadeOut()) return;
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#FADEIN_CLASS);
        this.nodes.base.classList.add(LeaderBoardTeamNode.#CHANGED_CLASS);
        super.show();
    }

    /**
     * 全てのアニメーションを停止
     */
    stopAnimation() {
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#CHANGED_CLASS);
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#FADEIN_CLASS);
        this.nodes.base.classList.remove(LeaderBoardTeamNode.#FADEOUT_CLASS);
    }
}

class LeaderBoard extends OverlayBase {
    /** @type {Object.<number, LeaderBoardTeamNode>} チーム用のノード保存用 */
    #teamnodes;
    #currentshowindex;
    #nextshowindex;
    #timerid;
    #shownum;
    #showinterval;
    #alivesonly;
    #callback;

    /**
     * コンストラクタ
     */
    constructor(shownum = 5) {
        super("leaderboard", "lb_");
        this.#teamnodes = {};
        this.#timerid = -1;
        this.#currentshowindex = 0;
        this.#nextshowindex = 0;
        this.#shownum = shownum;
        this.#showinterval = 5000;
        this.#alivesonly = false;
        this.#callback = null;
    }

    /**
     * Objectが存在していない場合に新規作成する
     * @param {number} teamid チームID(0～)
     */
    #preprocessTeam(teamid) {
        if (this.hasTeam(teamid)) return; // 既に存在
        this.#teamnodes[teamid] = new LeaderBoardTeamNode("leaderboardteam" + teamid, "lb_", this.nodes.base);
        if (this.#callback) {
            this.#callback(teamid);
        }
    }

    /**
     * 現在の生存チーム数を取得
     * @returns {number} 生存しているチーム数
     */
    #countAlives() {
        let alives = 0;
        for (const team of Object.values(this.#teamnodes)) {
            if (team.isAlive()) alives++;
        }
        return alives;
    }

    /**
     * 既にチームが作成済みか確認する
     * @param {number|string} teamid チームID(0～)
     * @returns {boolean} true=作成済,false=未作成
     */
    hasTeam(teamid) {
        if (teamid in this.#teamnodes) return true;
        else false;
    }

    /**
     * チーム名を設定する
     * @param {number|string} teamid チームID(0～)
     * @param {string} name チーム名
     */
    setTeamName(teamid, name) {
        this.#preprocessTeam(teamid);
        this.#teamnodes[teamid].setTeamName(name);
    }

    /**
     * チームポイントを設定する
     * @param {number|string} teamid チームID(0～)
     * @param {number} points ポイント数
     */
    setTeamPoints(teamid, points) {
        this.#preprocessTeam(teamid);
        this.#teamnodes[teamid].setPoints(points);
    }

    /**
     * チームの排除状態を設定する
     * @param {number|string} teamid チームID(0～)
     * @param {boolean} eliminated true=排除済,false=未排除
     */
    setTeamEliminated(teamid, eliminated) {
        this.#preprocessTeam(teamid);
        this.#teamnodes[teamid].setEliminated(eliminated);
        if (this.#countAlives() <= this.#shownum) {
            if (this.#alivesonly == false) {
                this.#alivesonly = true;
                this.#onLEShowNumber();
            } else {
                this.#teamnodes[teamid].hide();
            }
        } else {
            if (this.#alivesonly) {
                this.#alivesonly = false;
                this.#onGTShowNumber();
            }
        }
    }

    /**
     * プレーヤーの状態を設定する
     * @param {number|string} teamid チームID(0～)
     * @param {number} playerid プレーヤーID(=squadindex)
     * @param {number} state プレーヤーの状態(生存・ダウン・死亡など)
     */
    setPlayerState(teamid, playerid, state) {
        this.#preprocessTeam(teamid);
        this.#teamnodes[teamid].setPlayerState(playerid, state);
        if (this.#countAlives() <= this.#shownum) {
            if (this.#alivesonly == false) {
                this.#alivesonly = true;
                this.#onLEShowNumber();
            }
        } else {
            if (this.#alivesonly) {
                this.#alivesonly = false;
                this.#onGTShowNumber();
            }
        }
    }

    /**
     * 生存しているチームのみ表示に切り替え
     */
    #onLEShowNumber() {
        this.#stopAnimation();
        for (const [_, node] of Object.entries(this.#teamnodes)) {
            if (node.isEliminated()) {
                node.hide();
            } else {
                node.show();
            }
        }
    }

    /**
     * 全部隊表示に切り替え
     */
    #onGTShowNumber() {
        this.#stopAnimation();
        for (const [_, node] of Object.entries(this.#teamnodes)) {
            node.show();
        }
        this.#startAnimation();
    }

    /**
     * @typedef {object} changedrank チームの順位表示用のオブジェクト
     * @prop {string} id チームID(0～)
     * @prop {boolean} changed 順位変動があったかどうか
     */
    /**
     * リーダーボードに順位表示反映・順番入替を実施
     * @param {changedrank} teamids チームIDと順位変動を含むデータ
     */
    setTeamRank(teamids) {
        for (let i = 0; i < teamids.length; ++i) {
            const teamid = teamids[i].id;
            const changed = teamids[i].changed;
            this.#preprocessTeam(teamid);
            const node = this.#teamnodes[teamid];
            if (this.nodes.base.children[i] != node.nodes.base) {
                const ref = i < this.nodes.base.children.length ? this.nodes.base.children[i] : null;
                this.nodes.base.insertBefore(node.nodes.base, ref);
            }
            node.setRank(i + 1);
            if (!changed) continue;

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

    /**
     * HTMLノードを所有しているLeaderBoardTeamNodeを返す
     * @param {HTMLElement} basenode 検索対象のbaseノード
     * @returns {LeaderBoardTeamNode} 
     */
    #getTeamNode(basenode) {
        for (const teamnode of Object.values(this.#teamnodes)) {
            if (teamnode.nodes.base == basenode) {
                return teamnode;
            }
        }
        return null;
    }

    /**
     * フェードインアニメーションを開始する
     */
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
        this.#timerid = setTimeout(() => {
            this.#startFadeOut();
        }, this.#showinterval);
    }

    /**
     * フェードアウトアニメーションを開始する
     */
    #startFadeOut() {
        this.#timerid = -1;
        if (this.#alivesonly) return;
        if (this.nodes.base.children.length <= this.#shownum) return;

        for (const teamnode of Object.values(this.#teamnodes)) {
            if (!teamnode.isHidden()) {
                teamnode.fadeOut();
            }
        }
        // fadeinを予約
        this.#timerid = setTimeout(() => {
            this.#startFadeIn();
        }, 500);
    }

    /**
     * アニメーションを開始する
     */
    #startAnimation() {
        // 既にアニメーション実施中
        if (this.#timerid >= 0) return;
        for (const teamnode of Object.values(this.#teamnodes)) {
            if (teamnode.hasFadeOut()) return;
        }

        // 一旦全て隠す
        for (const teamnode of Object.values(this.#teamnodes)) {
            teamnode.hide();
        }
        this.#currentshowindex = 0;
        this.#nextshowindex = 0;
        this.#startFadeIn();
    }

    /**
     * アニメーションを停止する
     */
    #stopAnimation() {
        if (this.#timerid >= 0) {
            clearTimeout(this.#timerid);
            this.#timerid = -1;
        }
        for (const teamnode of Object.values(this.#teamnodes)) {
            teamnode.stopAnimation();
        }
    }

    /**
     * 全てのノードをクリアする
     */
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

    /**
     * LeaderBoardを表示する
     */
    show() {
        super.show();
        if (this.#alivesonly) {
            this.#onLEShowNumber();
        } else {
            this.#onGTShowNumber();
        }
    }

    /**
     * LeaderBoardを非表示にする
     */
    hide() {
        this.#stopAnimation();
        super.hide();
    }

    /**
     * チーム名を取得したい場合に呼び出される
     * @param {function} func チーム名を設定する関数
     */
    setTeamNameCallback(func) {
        if (typeof(func) == "function") {
            this.#callback = func;
        }
    }
}

class MapLeaderBoardTeamNode extends OverlayBase {
    static #CHANGED_CLASS = "mlb_changed";
    static #ELIMINATED_CLASS = "mlb_eliminated";
    static #EXISTS_CLASS = "mlb_exists";
    static #CHANGED_ANIMATION_NAME ="mlb_changed_animation";
    static #ELIMINATED_ANIMATION_NAME ="mlb_eliminated_animation";

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

        // CANVASサイズ設定
        this.nodes.alives.width = 35;
        this.nodes.alives.height = 37;

        // 順位表示設定
        this.setRank(20);

        // アニメーション後の動作
        this.nodes.base.addEventListener('animationend', (ev) => {
            if (ev.animationName == MapLeaderBoardTeamNode.#CHANGED_ANIMATION_NAME) {
                this.nodes.base.classList.remove(MapLeaderBoardTeamNode.#CHANGED_CLASS);
            }
            if (ev.animationName == MapLeaderBoardTeamNode.#ELIMINATED_ANIMATION_NAME) {
                // 何もしない
            }
        });
    }

    /**
     * 現在の順位をテキストに設定する
     * @param {number|string} rank 現在の順位(1～)
     */
    setRank(rank) {
        this.nodes.rank.innerText = '#' + rank;
    }

    /**
     * 排除済みクラスを設定・削除する
     * @param {boolean} eliminated 排除されたかどうか
     */
    setEliminated(eliminated) {
        if (eliminated) {
            this.nodes.base.classList.add(MapLeaderBoardTeamNode.#ELIMINATED_CLASS);
        } else {
            this.nodes.base.classList.remove(MapLeaderBoardTeamNode.#ELIMINATED_CLASS);
        }
    }

    /**
     * 存在するチームを設定する
     */
    setExists() {
        this.nodes.base.classList.add(MapLeaderBoardTeamNode.#EXISTS_CLASS);
    }

    /**
     * チーム名を設定する
     * @param {string} name チーム名
     */
    setTeamName(name) {
        this.nodes.name.innerText = name;
    }

    /**
     * 合計ポイントを設定する
     * @param {number} points 合計ポイント
     */
    setPoints(points) {
        this.nodes.points.innerText = points;
    }

    /**
     * 排除済みのクラスが設定済みか確認する
     * @returns {boolean} true=排除済,false=未排除
     */
    isEliminated() {
        return this.nodes.base.classList.contains(MapLeaderBoardTeamNode.#ELIMINATED_CLASS);
    }

    /**
     * プレーヤーの生存状況をcanvasに反映する
     * @param {number} index squadindex(0～)
     * @param {number} state プレーヤーの状態(生存/ダウン/死亡など)
     */
    setPlayerState(index, state) {
        if (index >= 3) return;
        this.setExists();

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

    /**
     * 変更アニメーション設定
     */
    setChanged() {
        this.nodes.base.classList.add(MapLeaderBoardTeamNode.#CHANGED_CLASS);
    }

    /**
     * 変更アニメーションの削除
     */
    stopChangedAnimation() {
        this.nodes.base.classList.remove(MapLeaderBoardTeamNode.#CHANGED_CLASS);
    }
}


class MapLeaderBoard extends OverlayBase {
    /** @type {Object.<number, MapLeaderBoardTeamNode>} チーム用のノード保存用 */
    #teamnodes;
    #callback;

    /**
     * コンストラクタ
     */
    constructor() {
        super("mapleaderboard", "mlb_");
        this.#teamnodes = {};
        this.#callback = null;
    }

    /**
     * Objectが存在していない場合に新規作成する
     * @param {number} teamid チームID(0～)
     */
    #preprocessTeam(teamid) {
        if (this.hasTeam(teamid)) return; // 既に存在
        this.#teamnodes[teamid] = new MapLeaderBoardTeamNode("mapleaderboardteam" + teamid, "mlb_", this.nodes.base);
        if (Object.keys(this.#teamnodes).length > 20) this.addClass("over_20");
        if (this.#callback) {
            this.#callback(teamid);
        }
    }

    /**
     * 既にチームが作成済みか確認する
     * @param {number|string} teamid チームID(0～)
     * @returns {boolean} true=作成済,false=未作成
     */
    hasTeam(teamid) {
        if (teamid in this.#teamnodes) return true;
        else false;
    }

    /**
     * チーム名を設定する
     * @param {number|string} teamid チームID(0～)
     * @param {string} name チーム名
     */
    setTeamName(teamid, name) {
        this.#preprocessTeam(teamid);
        this.#teamnodes[teamid].setTeamName(name);
    }

    /**
     * チームポイントを設定する
     * @param {number|string} teamid チームID(0～)
     * @param {number} points ポイント数
     */
    setTeamPoints(teamid, points) {
        this.#preprocessTeam(teamid);
        this.#teamnodes[teamid].setPoints(points);
    }

    /**
     * チームの排除状態を設定する
     * @param {number|string} teamid チームID(0～)
     * @param {boolean} eliminated true=排除済,false=未排除
     */
    setTeamEliminated(teamid, eliminated) {
        this.#preprocessTeam(teamid);
        this.#teamnodes[teamid].setEliminated(eliminated);
    }

    /**
     * プレーヤーの状態を設定する
     * @param {number|string} teamid チームID(0～)
     * @param {number} playerid プレーヤーID(=squadindex)
     * @param {number} state プレーヤーの状態(生存・ダウン・死亡など)
     */
    setPlayerState(teamid, playerid, state) {
        this.#preprocessTeam(teamid);
        this.#teamnodes[teamid].setPlayerState(playerid, state);
    }

    /**
     * @typedef {object} changedrank チームの順位表示用のオブジェクト
     * @prop {string} id チームID(0～)
     * @prop {boolean} changed 順位変動があったかどうか
     */
    /**
     * リーダーボードに順位表示反映・順番入替を実施
     * @param {changedrank} teamids チームIDと順位変動を含むデータ
     */
    setTeamRank(teamids) {
        for (let i = 0; i < teamids.length; ++i) {
            const teamid = teamids[i].id;
            const changed = teamids[i].changed;
            this.#preprocessTeam(teamid);

            // 入れ替え
            const node = this.#teamnodes[teamid];
            if (this.nodes.base.children[i] != node.nodes.base) {
                const ref = i < this.nodes.base.children.length ? this.nodes.base.children[i] : null;
                this.nodes.base.insertBefore(node.nodes.base, ref);
            }
            node.setRank(i + 1);
            if (!changed) continue;

            // 変更アニメーション
            node.setChanged();
        }
    }

    /**
     * HTMLノードを所有しているLeaderBoardTeamNodeを返す
     * @param {HTMLElement} basenode 検索対象のbaseノード
     * @returns {LeaderBoardTeamNode} 
     */
    #getTeamNode(basenode) {
        for (const teamnode of Object.values(this.#teamnodes)) {
            if (teamnode.nodes.base == basenode) {
                return teamnode;
            }
        }
        return null;
    }

    /**
     * アニメーションを停止する
     */
    #stopAnimation() {
        for (const teamnode of Object.values(this.#teamnodes)) {
            teamnode.stopChangedAnimation();
        }
    }

    /**
     * 全てのノードをクリアする
     */
    clear() {
        this.#stopAnimation();
        while (this.nodes.base.lastChild != null) {
            this.nodes.base.removeChild(this.nodes.base.lastChild);
        }
        for (const key of Object.keys(this.#teamnodes)) {
            delete this.#teamnodes[key];
        }
        this.removeClass("over_20");
    }

    /**
     * LeaderBoardを表示する
     */
    show() {
        this.#stopAnimation();
        super.show();
    }

    /**
     * LeaderBoardを非表示にする
     */
    hide() {
        this.#stopAnimation();
        super.hide();
    }

    /**
     * チーム名を取得したい場合に呼び出される
     * @param {function} func チーム名を設定する関数
     */
    setTeamNameCallback(func) {
        if (typeof(func) == "function") {
            this.#callback = func;
        }
    }
}

class TeamBanner extends OverlayBase {

    /**
     * コンストラクタ
     */
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

    /**
     * チームIDを設定する
     * @param {number|string} teamid チームID(0～)
     */
    setId(teamid) {
        super.clearClasses("teamid_");
        super.addClass("teamid_" + teamid);
    }

    /**
     * 現在の順位を設定する
     * @param {number|string} rank 現在の順位(1～)
     */
    setRank(rank) {
        this.nodes.rank.innerText = '#' + rank;
    }

    /**
     * チーム名を設定する
     * @param {string} teamName チーム名
     */
    setTeamName(teamName) {
        this.nodes.teamname.innerText = teamName;
    }

    /**
     * 合計ポイントを設定する
     * @param {number} points 合計ポイント
     */
    setPoints(points) {
        this.nodes.points.innerText = points;
    }
}

class PlayerBanner extends OverlayBase {
    /**
     * コンストラクタ
     */
    constructor() {
        super("playerbanner", "pb_");
        super.addNode("name");

        // append
        this.nodes.base.appendChild(this.nodes.name);
    }

    /**
     * プレイヤー名を表示する
     * @param {*} playerName ユーザー名
     */
    setPlayerName(playerName) {
        this.nodes.name.innerText = playerName;
    }
}

class TeamKills extends OverlayBase {
    /**
     * コンストラクタ
     */
    constructor() {
        super("teamkills", "tk_");
        super.addNode("icon");
        super.addNode("kills");
        
        // append
        this.nodes.base.appendChild(this.nodes.icon);
        this.nodes.base.appendChild(this.nodes.kills);

        // アイコン設定
        this.nodes.icon.innerText = `💀`;

        // 初期値
        this.setKills(0);
    }

    /**
     * 合計キル数を設定する
     * @param {number} kills 合計キル数
     */
    setKills(kills) {
        this.nodes.kills.innerText = kills;
    }
}

class OwnedItems extends OverlayBase {
    static ITEM_BACKPACK_LV0_CLASS = "oi_backpack_lv0";
    static ITEM_BACKPACK_LV1_CLASS = "oi_backpack_lv1";
    static ITEM_BACKPACK_LV2_CLASS = "oi_backpack_lv2";
    static ITEM_BACKPACK_LV3_CLASS = "oi_backpack_lv3";
    static ITEM_BACKPACK_LV4_CLASS = "oi_backpack_lv4";
    static ITEM_KNOCKDOWNSHIELD_LV0_CLASS = "oi_knockdownshield_lv0";
    static ITEM_KNOCKDOWNSHIELD_LV1_CLASS = "oi_knockdownshield_lv1";
    static ITEM_KNOCKDOWNSHIELD_LV2_CLASS = "oi_knockdownshield_lv2";
    static ITEM_KNOCKDOWNSHIELD_LV3_CLASS = "oi_knockdownshield_lv3";
    static ITEM_KNOCKDOWNSHIELD_LV4_CLASS = "oi_knockdownshield_lv4";
    static TRANSPARENT_CLASS = "oi_transparent";

    /**
     * コンストラクタ
     */
    constructor() {
        super("owneditems", "oi_");
        
        const ids = [
            "top", "middle", "bottom",
            "syringe", "medkit",
            "shieldcell", "shieldbattery",
            "phoenixkit", "ultimateaccelerant",
            "thermitgrenade", "fraggrenade", "arcstar",
            "backpack", "knockdownshield"
        ];
        for (const id of ids) {
            super.addNode(id);
        }

        /* append */
        this.nodes.base.appendChild(this.nodes.top);
        this.nodes.base.appendChild(this.nodes.middle);
        this.nodes.base.appendChild(this.nodes.bottom);
        this.nodes.top.appendChild(this.nodes.knockdownshield);
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
        this.nodes.knockdownshield.classList.add(OwnedItems.ITEM_KNOCKDOWNSHIELD_LV0_CLASS);
    }

    /**
     * アイテムの個数を更新する
     * @param {string} itemid アイテム識別子
     * @param {number} count アイテム数
     */
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
            case "knockdownshield": {
                const target = this.nodes[itemid];
                const lists = [
                    OwnedItems.ITEM_KNOCKDOWNSHIELD_LV0_CLASS,
                    OwnedItems.ITEM_KNOCKDOWNSHIELD_LV1_CLASS,
                    OwnedItems.ITEM_KNOCKDOWNSHIELD_LV2_CLASS,
                    OwnedItems.ITEM_KNOCKDOWNSHIELD_LV3_CLASS,
                    OwnedItems.ITEM_KNOCKDOWNSHIELD_LV4_CLASS,
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
    /**
     * コンストラクタ
     */
    constructor() {
        super("gameinfo", "gi_");
        super.addNode("title");
        super.addNode("gamecount");

        // append
        this.nodes.base.appendChild(this.nodes.title);
        this.nodes.base.appendChild(this.nodes.gamecount);
    }

    /**
     * ゲームのタイトルを設定する
     * @param {string} title ゲームのタイトル
     */
    setTitle(title) {
        this.nodes.title.innerText = title;
    }

    /**
     * ゲームカウントを設定する
     * @param {number|string} count 現在のゲーム数(1～)
     */
    setGameCount(count) {
        super.clearClasses("gameid_");
        super.addClass("gameid_" + count);
        this.nodes.gamecount.innerText = 'MATCH ' + count;
    }
}

class ChampionBanner extends OverlayBase {
    static FADEIN_CLASS = "cb_fadein";
    static FADEOUT_CLASS = "cb_fadeout";
    static FADEIN_ANIMATION_NAME = "cb_fadein_animation";
    static FADEOUT_ANIMATION_NAME = "cb_fadeout_animation";

    /**
     * コンストラクタ
     */
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

    /**
     * チームIDを設定する
     * @param {number|string} teamid チームID(0～)
     */
    setId(teamid) {
        super.clearClasses("teamid_");
        super.addClass("teamid_" + teamid);
    }

    /**
     * チーム名を設定する
     * @param {string} name チーム名
     */
    setTeamName(name) {
        this.nodes.teamname.innerText = name;
    }

    /**
     * フェードインアニメーションを開始
     */
    startFadeIn() {
        this.nodes.base.classList.add(ChampionBanner.FADEIN_CLASS);
        // 6秒で消える(5.7秒でフェードアウト開始)
        setTimeout(() => { this.startFadeOut(); }, 5700);
    }

    /**
     * フェードアウトアニメーションを開始
     */
    startFadeOut() {
        this.nodes.base.classList.add(ChampionBanner.FADEOUT_CLASS);
    }

    /**
     * ChampionBannerを表示
     */
    show() {
        this.startFadeIn();
        super.show();
    }

    /**
     * ChampoinBannerを非表示
     */
    hide() {
        super.hide();
        this.nodes.base.classList.remove(ChampionBanner.FADEIN_CLASS);
        this.nodes.base.classList.remove(ChampionBanner.FADEOUT_CLASS);
    }

    /**
     * ChampionBannerを強制非表示
     */
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
    /**
     * @typedef {object} queuedata
     * @prop {number} placement 順位(1～)
     * @prop {number|string} teamid チームID(0～)
     * @prop {string} teamname チーム名
     */

    /** @type {queuedata[]} */
    #queue;
    #timerid;

    /**
     * コンストラクタ
     */
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

    /**
     * チーム排除情報を設定する
     * @param {number} placement 順位(1～)
     * @param {number|string} teamid チームID(0～)
     * @param {string} teamname チーム名
     * @returns 
     */
    set(placement, teamid, teamname) {
        // 非表示状態の場合は追加しない
        if (this.nodes.base.classList.contains(OverlayBase.FORCEHIDE_CLASS)) return;

        this.#queue.push({
            placement: placement,
            teamid: teamid,
            teamname: teamname
        });
        this.#checkNext();
    }

    /**
     * フェードインを開始する
     */
    startFadeIn() {
        this.nodes.base.classList.add(SquadEliminated.FADEIN_CLASS);
        super.show();
        // 4秒で消える(3.7秒でフェードアウト開始)
        this.#timerid = setTimeout(() => { this.startFadeOut(); }, 3700);
    }

    /**
     * フェードアウトを開始する
     */
    startFadeOut() {
        this.#timerid = -1;
        this.nodes.base.classList.add(SquadEliminated.FADEOUT_CLASS);
    }

    /**
     * 次のデータがあるかどうか確認して次の動作を行う
     */
    #checkNext() {
        if (this.#queue.length > 0) {
            if (this.#timerid > 0) return; // タイマー発火待ち
            if (this.nodes.base.classList.contains(SquadEliminated.FADEOUT_CLASS)) return; // フェードアウト待ち

            // 次のデータを表示
            const data = this.#queue.shift();
            super.clearClasses("teamid_");
            super.addClass("teamid_" + data.teamid);
            this.nodes.teamname.innerText = '#' + data.placement + ' ' + data.teamname + ' eliminated';
            this.startFadeIn();
        } else {
            super.hide();
        }
    }

    /**
     * 現在の表示キューを削除する
     */
    clear() {
        this.#queue.splice(0);
    }

    /**
     * SquadEliminatedを表示する
     */
    show() {
        this.#checkNext();
    }

    /**
     * SquadEliminatedを非表示にする
     */
    hide() {
        if (this.#timerid > 0) {
            clearTimeout(this.#timerid);
            this.#timerid = -1;
        }
        super.hide();
        this.nodes.base.classList.remove(SquadEliminated.FADEIN_CLASS);
        this.nodes.base.classList.remove(SquadEliminated.FADEOUT_CLASS);
    }

    /**
     * SquadEliminatedを強制非表示にする
     */
    addForceHide() {
        super.addForceHide();
        this.nodes.base.classList.remove(SquadEliminated.FADEIN_CLASS);
        this.nodes.base.classList.remove(SquadEliminated.FADEOUT_CLASS);
    }
}

class MatchResultHeaderNode extends OverlayBase {
    /**
     * コンストラクタ
     * @param {string} id baseノードに設定するID
     * @param {string} prefix 追加するノードに付与するクラスの接頭辞
     * @param {string} root baseノードの追加先ノード
     */
    constructor(id, prefix, root) {
        super(id, prefix, root);

        super.addNode("header_rank");
        super.addNode("header_name");
        super.addNode("header_placement_points");
        super.addNode("header_kills");
        super.addNode("header_total_points");

        // append
        this.nodes.base.appendChild(this.nodes.header_rank);
        this.nodes.base.appendChild(this.nodes.header_name);
        this.nodes.base.appendChild(this.nodes.header_placement_points);
        this.nodes.base.appendChild(this.nodes.header_kills);
        this.nodes.base.appendChild(this.nodes.header_total_points);
        
        this.nodes.header_rank.innerText = "#";
        this.nodes.header_name.innerText = "TEAM";
        this.nodes.header_placement_points.innerText = "PP";
        this.nodes.header_kills.innerText = "KILLS";
        this.nodes.header_total_points.innerText = "TOTAL";
    }
}

class MatchResultTeamNode extends OverlayBase {
    /**
     * コンストラクタ
     * @param {string} id baseノードに設定するID
     * @param {string} prefix 追加するノードに付与するクラスの接頭辞
     * @param {string} root baseノードの追加先ノード
     */
    constructor(id, prefix, root) {
        super(id, prefix, root);

        super.addNode("rank");
        super.addNode("name");
        super.addNode("placement_points");
        super.addNode("kills");
        super.addNode("total_points");

        // append
        this.nodes.base.appendChild(this.nodes.rank);
        this.nodes.base.appendChild(this.nodes.name);
        this.nodes.base.appendChild(this.nodes.placement_points);
        this.nodes.base.appendChild(this.nodes.kills);
        this.nodes.base.appendChild(this.nodes.total_points);
    }

    /**
     * 順位を設定する
     * @param {number} rank 順位(1～)
     */
    setRank(rank) {
        this.nodes.rank.innerText = rank;
    }

    /**
     * チーム名を設定する
     * @param {string} name チーム名
     */
    setTeamName(name) {
        this.nodes.name.innerText = name;
    }

    /**
     * 順位ポイントを設定する
     * @param {number} points 順位ポイント
     */
    setPlacementPoints(points) {
        this.nodes.placement_points.innerText = points;
    }

    /**
     * 合計キル数を設定する
     * @param {number} kills 合計キル数
     */
    setKills(kills) {
        this.nodes.kills.innerText = kills;
    }

    /**
     * 合計ポイントを設定する
     * @param {number} points 合計ポイント
     */
    setTotalPoints(points) {
        this.nodes.total_points.innerText = points;
    }
}

class MatchResult extends OverlayBase {
    #ID;
    #PREFIX;
    /** @type {MatchResultTeamNode[]} MatchResultTeamNodeの格納先(順位昇順) */
    #teams;

    /**
     * コンストラクタ
     */
    constructor() {
        super("matchresult", "mr_");
        this.#ID = "matchresult";
        this.#PREFIX = "mr_";
        super.addNode("title");
        super.addNode("header");
        super.addNode("teams");

        this.#teams = [];

        // append
        this.nodes.base.appendChild(this.nodes.title);
        this.nodes.base.appendChild(this.nodes.header);
        this.nodes.base.appendChild(this.nodes.teams);

        // 初期状態はhide
        super.hide();

        // ヘッダーを追加
        for (let i = 0; i < 2; ++i) {
            const node = new MatchResultHeaderNode(this.#ID + "_header_" + i, this.#PREFIX, this.nodes.header);
        }
    }

    /**
     * 指定した順位のノードを追加する
     * @param {number} rank 順位(1～)
     */
    #appendTeam(rank) {
        const node = new MatchResultTeamNode(this.#ID + "_" + rank, this.#PREFIX, this.nodes.teams);
        this.#teams.push(node);
        node.setRank(rank);

        if (this.#teams.length > 10) {
            this.addClass("over_10");
        }
        if (this.#teams.length > 20) {
            this.addClass("over_20");
        }
    }

    /**
     * 指定した順位までのチームを追加する
     * @param {number} rank 順位(0～)
     */
    #precheckRank(rank) {
        for (let i = this.#teams.length; i <= rank; ++i) {
            this.#appendTeam(i + 1);
        }
    }

    /**
     * マッチリザルトに表示するトーナメント名を設定する
     * @param {string} title トーナメントのタイトル
     */
    setTitle(title) {
        this.nodes.title.innerText = title;
    }

    /**
     * チーム名を設定
     * @param {number} rank 順位(0～)
     * @param {string} name チーム名
     */
    setTeamName(rank, name) {
        this.#precheckRank(rank);
        this.#teams[rank].setTeamName(name);
    }

    /**
     * 順位ポイントを設定
     * @param {number} rank 順位(0～)
     * @param {number} points 順位ポイント
     */
    setPlacementPoints(rank, points) {
        this.#precheckRank(rank);
        this.#teams[rank].setPlacementPoints(points);
    }

    /**
     * キル数を設定
     * @param {number} rank 順位(0～)
     * @param {number} kills キル数
     */
    setKills(rank, kills) {
        this.#precheckRank(rank);
        this.#teams[rank].setKills(kills);
    }

    /**
     * 合計ポイントを設定
     * @param {number} rank 順位(0～)
     * @param {number} points 合計ポイント
     */
    setTotalPoints(rank, points) {
        this.#precheckRank(rank);
        this.#teams[rank].setTotalPoints(points);
    }

    /**
     * 可変要素を全部クリアする
     */
    clear() {
        this.setTitle("");
        this.nodes.teams.innerHTML = "";
        this.#teams.splice(0);
        this.clearClasses("over_");
    }
}


class PlayerLeaderBoardRankingNode extends OverlayBase {
    /**
     * コンストラクタ
     * @param {string} id baseノードに設定するID
     * @param {string} prefix 追加するノードに付与するクラスの接頭辞
     * @param {string} root baseノードの追加先ノード
     */
    constructor(id, prefix, root) {
        super(id, prefix, root);

        super.addNode("rank");
        super.addNode("playername");
        super.addNode("teamname");
        super.addNode("kills");
        super.addNode("assists");
        super.addNode("damage");

        // append
        this.nodes.base.appendChild(this.nodes.rank);
        this.nodes.base.appendChild(this.nodes.playername);
        this.nodes.base.appendChild(this.nodes.teamname);
        this.nodes.base.appendChild(this.nodes.kills);
        this.nodes.base.appendChild(this.nodes.assists);
        this.nodes.base.appendChild(this.nodes.damage);
    }

    /**
     * 順位を設定する
     * @param {number} rank 順位(1～)
     */
    setRank(rank) {
        this.nodes.rank.innerText = rank;
    }

    /**
     * プレーヤー名を設定する
     * @param {string} playername チーム名
     */
    setPlayerName(playername) {
        this.nodes.playername.innerText = playername;
    }

    /**
     * チーム名を設定する
     * @param {string} teamname チーム名
     */
    setTeamName(teamname) {
        this.nodes.teamname.innerText = teamname;
    }

    /**
     * 合計キル数を設定する
     * @param {number} kills 合計キル数
     */
    setKills(kills) {
        this.nodes.kills.innerText = kills;
    }

    /**
     * 合計アシスト数を設定する
     * @param {number} assists 合計アシスト数
     */
    setAssists(assists) {
        this.nodes.assists.innerText = assists;
    }

    /**
     * 合計ダメージを設定する
     * @param {number} damage 合計ダメージ
     */
    setDamage(damage) {
        this.nodes.damage.innerText = damage;
    }
}

class PlayerLeaderBoard extends OverlayBase {
    #ID;
    #PREFIX;
    /**
     * コンストラクタ
     */
    constructor(id = "playerleaderboard", prefix = "pl_") {
        super(id, prefix);
        this.#ID = id;
        this.#PREFIX = prefix;

        super.addNode("title");
        super.addNode("label");
        super.addNode("label_rank");
        super.addNode("label_playername");
        super.addNode("label_teamname");
        super.addNode("label_kills");
        super.addNode("label_assists");
        super.addNode("label_damage");
        super.addNode("ranking");

        this.nodes.base.appendChild(this.nodes.title);
        this.nodes.base.appendChild(this.nodes.label);
        this.nodes.base.appendChild(this.nodes.ranking);
        this.nodes.label.appendChild(this.nodes.label_rank);
        this.nodes.label.appendChild(this.nodes.label_playername);
        this.nodes.label.appendChild(this.nodes.label_teamname);
        this.nodes.label.appendChild(this.nodes.label_kills);
        this.nodes.label.appendChild(this.nodes.label_assists);
        this.nodes.label.appendChild(this.nodes.label_damage);

        // 初期状態はhide
        super.hide();

        // テキスト設定
        this.nodes.label_rank.innerText = "#";
        this.nodes.label_playername.innerText = "PLAYER NAME";
        this.nodes.label_teamname.innerText = "TEAM NAME";
        this.nodes.label_kills.innerText = "KILLS";
        this.nodes.label_assists.innerText = "ASSISTS";
        this.nodes.label_damage.innerText = "DAMAGE";
    }

    /**
     * 表示タイトルを設定する
     */
    setTitle(title) {
        this.nodes.title.innerText = title;
    }

    /**
     * 要素をクリアする
     */
    #clear() {
        while (this.nodes.ranking.lastChild != null) {
            this.nodes.ranking.removeChild(this.nodes.ranking.lastChild);
        }
    }

    /**
     * リーダーボードの値を設定する
     * @param {object[]} プレイヤー情報の入った配列
     */
    setLeaderboard(players) {
        this.#clear();
        for (let i = 0; i < players.length; ++i) {
            const player = players[i];
            const node = new PlayerLeaderBoardRankingNode("", this.#PREFIX, this.nodes.ranking);
            node.setRank(player.rank);
            node.setPlayerName(player.name);
            node.setTeamName(player.teamname);
            node.setKills(player.kills);
            node.setAssists(player.assists);
            node.setDamage(player.damage);
        }
        super.show();
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

export class Overlay {
    /** @type {ApexWebAPI.ApexWebAPI} */
    #webapi;
    /** @type {import("./overlay-common.js").teamresults} 計算用チームデータ */
    #teams;
    #_game; // WebAPIのゲームオブジェクト(変更しない)
    #_results; // WebAPIから取得したリザルト(変更しない、追加のみ)
    /** @type {boolean} 現在の試合のデータを順位・ポイント計算に含めるかどうか */
    #calcresultsonly;
    #leaderboard;
    #mapleaderboard;
    #teambanner;
    #playerbanner;
    #teamkills;
    #owneditems;
    #gameinfo;
    #championbanner;
    #squadeliminated;
    #matchresult;
    #playerleaderboard;
    #errorstatus;
    #camera;
    /** @type {boolean} getAll進行中 */
    #getallprocessing;
    /** @type {string[]} チームID(0～)を順位でソートした配列 */
    #savedrankorder;
    #tournamentname;
    #teamparams;
    #playerparams;
    #tournamentparams;
    /** @type {number} 再接続試行をカウントする */
    #retry;
    /** @type {boolean} 再接続試行中 */
    #reconnecting;
    /** @type {Object<string, object>} オーバーレイ表示の為の判断材料 */
    #showstatus;
    #statechangecallbacks;

    /**
     * コンストラクタ
     * @param {string} url 接続先WebSocketのURL
     */
    constructor(params = {}) {
        if ('leaderboard_shownum' in params) {
            this.#leaderboard = new LeaderBoard(params.leaderboard_shownum);
        } else {
            this.#leaderboard = new LeaderBoard();
        }
        this.#teambanner = new TeamBanner();
        this.#playerbanner = new PlayerBanner();
        this.#teamkills = new TeamKills();
        this.#owneditems = new OwnedItems();
        this.#gameinfo = new GameInfo();
        this.#championbanner = new ChampionBanner();
        this.#squadeliminated = new SquadEliminated();
        this.#mapleaderboard = new MapLeaderBoard();
        this.#errorstatus = new ErrorStatus();
        this.#matchresult = new MatchResult();
        this.#playerleaderboard = new PlayerLeaderBoard();
        this.#getallprocessing = false;
        this.#retry = 0;
        this.#reconnecting = false;
        this.#showstatus = {
            game: "",
            map: 0,
            banner: 1
        };
        this.#statechangecallbacks = [];

        if ('url' in params) {
            this.#setupApexWebAPI(url);
        } else {
            this.#setupApexWebAPI("ws://127.0.0.1:20081/");
        }

        this.#_game = null;
        this.#teams = {};
        this.#_results = [];
        this.#camera = { teamid: "0", playerid: 0, playerhash: "" };
        this.#tournamentparams = {};
        this.#savedrankorder = [];
        this.#tournamentname = "";
        this.#teamparams = {};
        this.#playerparams = {};

        this.#leaderboard.setTeamNameCallback((teamid) => {
            const name = this.#getTeamName(teamid);
            this.#leaderboard.setTeamName(teamid, name);
        });
        this.#mapleaderboard.setTeamNameCallback((teamid) => {
            const name = this.#getTeamName(teamid);
            this.#mapleaderboard.setTeamName(teamid, name);
        });

        this.#hideAll();
    }

    /**
     * WebAPIに関連する部分のセットアップを行う
     * @param {string} url 接続先WebSocketのURL
     */
    #setupApexWebAPI(url) {
        this.#webapi = new ApexWebAPI.ApexWebAPI(url);

        // 接続時にすべてのデータを取得
        this.#webapi.addEventListener("open", (ev) => {
            this.#errorstatus.setWebAPIStatus(true);
            this.#getallprocessing = true;
            this.#_game = ev.detail.game;
            this.#retry = 0;
            this.#webapi.getAll().then(() => {
                this.#getallprocessing = false;
                this.#showstatus.game = this.#_game.state;
                this.#showHideFromCurrentStatus();
                this.#getAllPlayerParams();
                this.#webapi.getCurrentTournament();
            }, () => {
                this.#getallprocessing = false;
            });
        });

        this.#webapi.addEventListener("close", (ev) => {
            this.#errorstatus.setWebAPIStatus(false);
            this.#tryReconnect();
        });

        this.#webapi.addEventListener("error", (ev) => {
            this.#errorstatus.setWebAPIStatus(false);
            this.#tryReconnect();
        });

        this.#webapi.addEventListener("getcurrenttournament", (ev) => {
            this.#getAllTeamParams();
            this.#webapi.getTournamentResults();
            this.#webapi.getTournamentParams();

            // トーナメント設定
            this.#tournamentname = ev.detail.name;
            this.#gameinfo.setTitle(ev.detail.name);
        });

        this.#webapi.addEventListener('renametournamentname', (ev) => {
            if (ev.detail.result) {
                // トーナメント設定
                this.#tournamentname = ev.detail.name;
                this.#gameinfo.setTitle(ev.detail.name);
            }
        });

        this.#webapi.addEventListener("clearlivedata", (ev) => {
            this.#_game = ev.detail.game;
            this.#teams = {};
            this.#calcresultsonly = false;
            this.#leaderboard.clear();
            this.#mapleaderboard.clear();
            this.#squadeliminated.clear();
            this.#calcAndDisplay();
        });

        this.#webapi.addEventListener("gamestatechange", (ev) => {
            const state = ev.detail.game.state;
            this.#showstatus.game = state;
            this.#showHideFromCurrentStatus();
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

        // トーナメントの変更・新規作成
        this.#webapi.addEventListener("settournamentname", (ev) => {
            this.#webapi.getCurrentTournament();
        });

        // 結果の保存
        this.#webapi.addEventListener("saveresult", (ev) => {
            this.#calcresultsonly = true;
            if (ev.detail.gameid == this.#_results.length) {
                this.#_results.push(ev.detail.result);
                this.#calcAndDisplay();
                this.#updateGameInfo();
            } else {
                this.#webapi.getTournamentResults();
            }
        });

        this.#webapi.addEventListener("gettournamentresults", (ev) => {
            this.#_results = ev.detail.results;
            this.#calcAndDisplay();
            this.#updateGameInfo();
        });

        this.#webapi.addEventListener('settournamentresult', (ev) => {
            if (ev.detail.setresult) {
                this.#webapi.getTournamentResults();
            }
        });

        // 勝者確定
        this.#webapi.addEventListener("winnerdetermine", (ev) => {
            // 全てのUIを隠す
            this.#hideAll();

            // ChampionBannerの表示
            const name = this.#getTeamName(ev.detail.team.id);
            this.#championbanner.setId(ev.detail.team.id);
            this.#championbanner.setTeamName(name);
            this.#showChampionBanner();
        });

        /* SquadEliminated */
        this.#webapi.addEventListener("squadeliminate", (ev) => {
            if (this.#_game == null) return;
            if (this.#getallprocessing) return;
            const placement = ev.detail.team.placement;
            const teamname = this.#getTeamName(ev.detail.team.id);
            if (placement <= 3) return; // 残り3チーム以下は表示しない
            this.#squadeliminated.set(placement, ev.detail.team.id, teamname);
        });

        // チーム名系
        this.#webapi.addEventListener("teamname", (ev) => {
            const teamid = ev.detail.team.id;
            const name = ev.detail.team.name;
            this.#leaderboard.setTeamName(teamid, name);
            this.#mapleaderboard.setTeamName(teamid, name);
            if (teamid.toString() == this.#camera.teamid) {
                this.#teambanner.setTeamName(name);
            }
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
            if (ev.detail.team.id.toString() == this.#camera.teamid &&
                ev.detail.player.id == this.#camera.playerid) {
                this.#playerbanner.setPlayerName(ev.detail.player.name);
            }
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
            if (this.#_game == null) return;
            this.#calcAndDisplay();
        });

        this.#webapi.addEventListener("squadeliminate", (ev) => {
            if (this.#_game == null) return;
            const teamid = ev.detail.team.id;
            this.#leaderboard.setTeamEliminated(teamid, true);
            this.#mapleaderboard.setTeamEliminated(teamid, true);
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
                this.#teamkills.setKills(ev.detail.team.kills);
            }
        });

        // プレーヤーステータス変更
        this.#webapi.addEventListener("playerhash", (ev) => {
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            this.#leaderboard.setPlayerState(teamid, playerid, ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_ALIVE);
            this.#mapleaderboard.setPlayerState(teamid, playerid, ApexWebAPI.ApexWebAPI.WEBAPI_PLAYER_STATE_ALIVE);
        });

        this.#webapi.addEventListener("statealive", (ev) => {
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            const state = ev.detail.player.state;
            this.#leaderboard.setPlayerState(teamid, playerid, state);
            this.#mapleaderboard.setPlayerState(teamid, playerid, state);
        });

        this.#webapi.addEventListener("statedown", (ev) => {
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            const state = ev.detail.player.state;
            this.#leaderboard.setPlayerState(teamid, playerid, state);
            this.#mapleaderboard.setPlayerState(teamid, playerid, state);
        });

        this.#webapi.addEventListener("statekilled", (ev) => {
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            const state = ev.detail.player.state;
            this.#leaderboard.setPlayerState(teamid, playerid, state);
            this.#mapleaderboard.setPlayerState(teamid, playerid, state);
        });

        this.#webapi.addEventListener("statecollected", (ev) => {
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            const state = ev.detail.player.state;
            this.#leaderboard.setPlayerState(teamid, playerid, state);
            this.#mapleaderboard.setPlayerState(teamid, playerid, state);
        });

        this.#webapi.addEventListener("observerswitch", (ev) => {
            if (!ev.detail.own) return;
            // カメラ変更
            const teamid = ev.detail.team.id;
            const playerid = ev.detail.player.id;
            this.#onChangeCamera(teamid, playerid);
        });

        this.#webapi.addEventListener("initcamera", (ev) => {
            // カメラ初期設定
            const teamid = ev.detail.teamid;
            const playerid = ev.detail.playerid;
            this.#onChangeCamera(teamid, playerid);
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

        // チームバナーの表示状態
        this.#webapi.addEventListener("teambannerstate", (ev) => {
            const state = ev.detail.state;
            this.#showstatus.banner = state;
            this.#showHideFromCurrentStatus();
        });

        // マップの表示状態
        this.#webapi.addEventListener("mapstate", (ev) => {
            const state = ev.detail.state;
            this.#showstatus.map = state;
            this.#showHideFromCurrentStatus();
        });

        // LiveAPI側の接続状況
        this.#webapi.addEventListener("liveapisocketstats", (ev) => {
            const connection_count = ev.detail.conn;
            this.#errorstatus.setLiveAPIStatus(connection_count > 0);
        });

        // Overlayの表示状態
        this.#webapi.addEventListener("gettournamentparams", (ev) => {
            this.#tournamentparams = ev.detail.params;
            this.#setForceHideFromParams(ev.detail.params);
        });

        this.#webapi.addEventListener("settournamentparams", (ev) => {
            if (ev.detail.result) {
                this.#tournamentparams = ev.detail.params;
                this.#setForceHideFromParams(ev.detail.params);
            }
        });

        // MatchResultの表示非表示命令
        this.#webapi.addEventListener("broadcastobject", (ev) => {
            if (ev.detail.data) {
                const data = ev.detail.data;
                if ("type" in data) {
                    switch (data.type) {
                        case "showmatchresult":
                            this.#hidePlayerLeaderBoard();
                            if (data.all) {
                                this.#showMatchResult('all');
                            } else {
                                this.#showMatchResult(data.gameid);
                            }
                            break;
                        case "hidematchresult":
                            this.#hideMatchResult();
                            break;
                        case "showplayerleaderboard":
                            this.#hideMatchResult();
                            if (data.all) {
                                this.#showPlayerLeaderBoard('all', data.key);
                            } else {
                                this.#showPlayerLeaderBoard(data.gameid, data.key);
                            }
                            break;
                        case "hideplayerleaderboard":
                            this.#hidePlayerLeaderBoard();
                            break;
                        case "testleaderboard": {
                            this.#showLeaderBoard();
                            break;
                        }
                        case "testmapleaderboard": {
                            this.#showMapLeaderBoard();
                            break;
                        }
                        case "testteambanner": {
                            const teamid = data.teamid;
                            if (teamid in this.#teamparams && 'name' in this.#teamparams[teamid]) {
                                this.#teambanner.setTeamName(this.#teamparams[teamid].name);
                            } else {
                                this.#teambanner.setTeamName('Team ' + (data.teamid + 1));
                            }
                            this.#teambanner.setRank(1);
                            this.#teambanner.setPoints(20);
                            this.#showTeamBanner();
                            break;
                        }
                        case "testplayerbanner": {
                            const name = data.name;
                            this.#playerbanner.setPlayerName(name);
                            this.#showPlayerBanner();
                            break;
                        }
                        case "testteamkills": {
                            const kills = data.kills;
                            this.#teamkills.setKills(kills);
                            this.#showTeamKills();
                            break;
                        }
                        case "testowneditems": {
                            const items = ["backpack", "knockdownshield", "syringe", "medkit", "shieldcell", "shieldbattery", "phoenixkit", "ultimateaccelerant", "fraggrenade", "thermitgrenade", "arcstar"];
                            for (const [item, count] of Object.entries(data)) {
                                if (items.indexOf(item) >= 0) {
                                    this.#owneditems.procUpdateItem(item, count);
                                }
                            }
                            this.#showOwnedItems();
                            break;
                        }
                        case "testgameinfo": {
                            const gameid = data.gameid;
                            this.#gameinfo.setGameCount(gameid);
                            this.#showGameInfo();
                            break;
                        }
                        case "testsquadeliminated": {
                            const teamid = data.teamid;
                            let name = "";
                            if (teamid in this.#teamparams && 'name' in this.#teamparams[teamid]) {
                                name = this.#teamparams[teamid].name;
                            } else {
                                name = 'Team ' + (data.teamid + 1);
                            }
                            this.#squadeliminated.set(1, teamid, name);
                            break;
                        }
                        case "testchampionbanner": {
                            const teamid = data.teamid;
                            let name = "";
                            if (teamid in this.#teamparams && 'name' in this.#teamparams[teamid]) {
                                name = this.#teamparams[teamid].name;
                            } else {
                                name = 'Team ' + (data.teamid + 1);
                            }
                            this.#championbanner.setId(teamid);
                            this.#championbanner.setTeamName(name)
                            this.#showChampionBanner();
                            break;
                        }
                        case "testhideall": {
                            this.#hideAll();
                            break;
                        }
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
     * ゲームが進行中か確認する
     * @param {string} state ゲームの進行状況
     * @returns {boolean} true=ゲーム進行中,false=それ以外
     */
    #checkGameStatePlaying(state) {
        // "WaitingForPlayers","PickLoadout","Prematch","Resolution","Postmatch"
        if (state == "Playing") {
            return true;
        }
        return false;
    }

    /**
     * ゲームが終了ステータスでないか確認する
     * @param {string} state ゲームの進行状況
     * @returns {boolean} true=ゲーム進行中,false=それ以外
     */
    #checkGameStateNotEnded(state) {
        // "WaitingForPlayers","PickLoadout","Prematch","Resolution","Postmatch"
        switch(state) {
        case "WaitingForPlayers":
        case "PickLoadout":
        case "Prematch":
        case "Playing":
            return true;
        }
        return false;
    }

    /**
     * ゲームの進行状況から表示/非表示を行う
     */
    #showHideFromCurrentStatus() {
        const game = this.#showstatus.game;
        const map = this.#showstatus.map;
        const banner = this.#showstatus.banner;
        switch(game) {
            case "WaitingForPlayers":
            case "PickLoadout":
            case "Prematch":
                // prematch
                this.#showGameInfo();
                break;
            case "Playing":
                if (banner == 0 && map > 0) {
                    // MAPと排除通知＆チャンピオンバナーのみ表示
                    this.#showMapLeaderBoard();
                    this.#hideLeaderBoard();
                    this.#hideTeamBanner();
                    this.#hidePlayerBanner();
                    this.#hideTeamKills();
                    this.#hideOwnedItems();
                    this.#hideGameInfo();
                } else if (banner == 0) {
                    // プレイヤーバナー類の非表示
                    this.#showLeaderBoard();
                    this.#hideMapLeaderBoard();
                    this.#hideTeamBanner();
                    this.#hidePlayerBanner();
                    this.#hideTeamKills();
                    this.#hideOwnedItems();
                    this.#showGameInfo();
                } else {
                    // 通常時
                    this.#showLeaderBoard();
                    this.#hideMapLeaderBoard();
                    this.#showTeamBanner();
                    this.#showPlayerBanner();
                    this.#showTeamKills();
                    this.#showOwnedItems();
                    this.#showGameInfo();
                }
                break;
            case "Resolution":
            case "Postmatch":
                // postmatch
                this.#hideLeaderBoard();
                this.#hideMapLeaderBoard();
                this.#hideTeamBanner();
                this.#hidePlayerBanner();
                this.#hideTeamKills();
                this.#hideOwnedItems();
                this.#hideGameInfo();
                break;
        }
        for (const callback of this.#statechangecallbacks) {
            if (typeof(callback) == "function") {
                callback(JSON.parse(JSON.stringify(this.#showstatus)));
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
        this.#teamparams[teamid] = params;
        if (!('name' in params)) return;
        if (this.#leaderboard.hasTeam(teamid)) {
            this.#leaderboard.setTeamName(teamid, params.name);
        }
        if (this.#mapleaderboard.hasTeam(teamid)) {
            this.#mapleaderboard.setTeamName(teamid, params.name);
        }
        if (teamid.toString() == this.#camera.teamid) {
            this.#teambanner.setTeamName(params.name);
        }
    }

    /**
     * 全てのプレイヤーパラメータを取得する
     */
    #getAllPlayerParams() {
        this.#webapi.getPlayers().then((ev) => {
            for (const [hash, params] of Object.entries(ev.detail.players)) {
                this.#playerparams[hash] = params;
            }
        });
    }

    /**
     * プレイヤーのパラメータが更新された際の処理
     * @param {string} hash プレイヤーID
     * @param {object} params プレイヤーのパラメータ
     */
    #updatedPlayerParams(hash, params) {
        this.#playerparams[hash] = params;
        if (!('name' in params)) return;
        if (this.#camera.playerhash == "") return;
        if (ev.detail.hash != this.#camera.playerhash) return;
        this.#playerbanner.setPlayerName(ev.detail.params.name);
    }

    /**
     * 現在の順位・キル数からポイントを計算する
     */
    #calcPoints() {
        // リザルトデータを格納
        this.#teams = resultsToTeamResults(this.#_results);
        if (!this.#calcresultsonly) {
            // 現在の試合のポイントをいれる
            for (let teamid = 0; teamid < this.#_game.teams.length; ++teamid) {
                const src = this.#_game.teams[teamid];
                if (src.players.length > 0) {
                    appendToTeamResults(this.#teams, this.#_results.length, teamid, src.name, src.kills, src.placement);
                    const dst = this.#teams[teamid];
                    dst.eliminated = src.eliminated;
                    for (const player of src.players) {
                        dst.status.push(player.state);
                    }
                }
            }
        }

        // ポイントを計算して追加
        for (const [_, team] of Object.entries(this.#teams)) {
            for (let gameid = 0; gameid < team.kills.length && gameid < team.placements.length; ++gameid) {
                const points = calcPoints(gameid, team.placements[gameid], team.kills[gameid], this.#tournamentparams);
                team.points.push(points.total);
                team.kill_points.push(points.kills);
                team.placement_points.push(points.placement);
                team.other_points.push(points.other);
            }
            team.total_points = team.points.reduce((a, c) => a + c, 0);
        }
    }

    /**
     * ポイントから順位を計算する
     */
    #calcRank() {
        this.#savedrankorder = setRankParameterToTeamResults(this.#teams);
    }
    /**
     * 現在の順位を配列で返す
     * @returns {string[]} チームID(0～)を含む文字列(rank順)
     */
    #getCurrentRank() {
        return this.#savedrankorder;
    }

    /**
     * @typedef {Object.<number, number>} currentpoints key=チームID, value=合計ポイント
     */
    /**
     * 現在の合計ポイントを返す
     * @returns {currentpoints}
     */
    #getCurrentPoints() {
        const points = {};
        for (const [teamid, team] of Object.entries(this.#teams)) {
            points[teamid] = team.points.reduce((a, c) => a + c, 0);
        }
        return points;
    }

    /**
     * 計算～表示までの処理を行う
     */
    #calcAndDisplay() {
        // 計算前のポイント等を保持
        const prev_rank = this.#getCurrentRank();
        const prev_points = this.#getCurrentPoints();

        this.#calcPoints();
        this.#calcRank();

        // 計算後
        const curr_rank = this.#getCurrentRank();
        const curr_points = this.#getCurrentPoints();

        // 順位変動確認
        /** @type {changedrank[]} */
        const rank = [];
        for (let i = 0; i < curr_rank.length; ++i) {
            let changed = false;
            if (i >= prev_rank.length || prev_rank[i] != curr_rank[i]) {
                changed = true;
            }
            rank.push({id: curr_rank[i], changed: changed});
            if (changed) {
                this.#onTeamRankChanged(curr_rank[i], i);
            }
        }

        // 順位計算結果をリーダーボードに反映
        this.#leaderboard.setTeamRank(rank);
        this.#mapleaderboard.setTeamRank(rank);

        // ポイント変動確認
        for (const teamid of Object.keys(curr_points)) {
            let changed = false;
            if (!(teamid in prev_points) || prev_points[teamid] != curr_points[teamid]) {
                changed = true;
            }
            if (changed) {
                this.#onTeamPointsChanged(teamid, curr_points[teamid]);
            }
        }
    }
    /**
     * 保存されたチーム用paramsや現在プレイ中のチーム情報から名前を取得する
     * @param {string|number} teamid チームID(0～)
     * @returns {string} チーム名
     */
    #getTeamName(teamid) {
        if (typeof teamid == "string") teamid = parseInt(teamid, 10);
        if (teamid in this.#teamparams) {
            const params = this.#teamparams[teamid];
            if ('name' in params) {
                return params.name;
            }
        }
        if (teamid < this.#_game.teams.length) {
            const team = this.#_game.teams[teamid];
            if ('name' in team) {
                return team.name;
            }
        }
        return "チーム " + teamid;
    }

    /**
     * 保存されたプレイヤー用prams等からプレイヤー情報を取得する
     * @param {string|number} teamid チームID(0～)
     * @param {number} playerid プレイヤーID(=squadindex)
     * @returns {string} プレイヤー名
     */
    #getPlayerName(teamid, playerid) {
        if (typeof teamid == "string") teamid = parseInt(teamid, 10);
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

    /**
     * 現在のゲームカウントを取得する
     * @returns {number} ゲームID(0～)
     */
    #getGameCount() {
        if (!this.#_results) return 0;
        const result_count = this.#_results.length;
        return result_count;
    }

    #setForceHideFromParams(params) {
        if (!('forcehide' in params)) return;
        for (const [key, value] of Object.entries(params.forcehide)) {
            switch(key) {
                case 'leaderboard': {
                    if (value) this.#leaderboard.addForceHide();
                    else this.#leaderboard.removeForceHide();
                    break;
                }
                case 'teambanner': {
                    if (value) this.#teambanner.addForceHide();
                    else this.#teambanner.removeForceHide();
                    break;
                }
                case 'teamkills': {
                    if (value) this.#teamkills.addForceHide();
                    else this.#teamkills.removeForceHide();
                    break;
                }
                case 'playerbanner': {
                    if (value) this.#playerbanner.addForceHide();
                    else this.#playerbanner.removeForceHide();
                    break;
                }
                case 'owneditems': {
                    if (value) this.#owneditems.addForceHide();
                    else this.#owneditems.removeForceHide();
                    break;
                }
                case 'gameinfo': {
                    if (value) this.#gameinfo.addForceHide();
                    else this.#gameinfo.removeForceHide();
                    break;
                }
                case 'championbanner': {
                    if (value) this.#championbanner.addForceHide();
                    else this.#championbanner.removeForceHide();
                    break;
                }
                case 'squadeliminated': {
                    if (value) this.#squadeliminated.addForceHide();
                    else this.#squadeliminated.removeForceHide();
                    break;
                }
                case 'mapleaderboard': {
                    if (value) this.#mapleaderboard.addForceHide();
                    else this.#mapleaderboard.removeForceHide();
                    break;
                }
            }
        }
    }

    #updateGameInfo(count = null) {
        if (count == null) {
            count = this.#getGameCount() + 1;
        }
        this.#gameinfo.setGameCount(count);
    }

    #showLeaderBoard() {
        if (this.#leaderboard.isHidden()) {
            this.#leaderboard.show();
        }
    }

    #showTeamBanner() {
        if (this.#teambanner.isHidden()) {
            this.#teambanner.show();
        }
    }

    #showPlayerBanner() {
        if (this.#playerbanner.isHidden()) {
            this.#playerbanner.show();
        }
    }

    #showTeamKills() {
        if (this.#teamkills.isHidden()) {
            this.#teamkills.show();
        }
    }

    #showOwnedItems() {
        if (this.#owneditems.isHidden()) {
            this.#owneditems.show();
        }
    }

    #showGameInfo() {
        if (this.#gameinfo.isHidden()) {
            this.#gameinfo.show();
        }
    }

    #showChampionBanner() {
        this.#championbanner.show();
    }

    #showMapLeaderBoard() {
        if (this.#mapleaderboard.isHidden()) {
            this.#mapleaderboard.show();
        }
    }

    /**
     * マッチリザルトのオーバーレイを表示する
     * @param {number|string} gameid ゲームID(0～)もしくは'all'を指定する
     */
    #showMatchResult(gameid) {
        this.#matchresult.clear();
        /** @type {teamresults} */
        let teams = null;
        if (gameid == 'all') {
            if (this.#tournamentname != "") {
                this.#matchresult.setTitle(this.#tournamentname + " - OVERALL");
            } else {
                this.#matchresult.setTitle("Match Result - OVERALL");
            }
            teams = resultsToTeamResults(this.#_results);
        } else {
            if (this.#tournamentname != "") {
                this.#matchresult.setTitle(this.#tournamentname + " - MATCH " + (gameid + 1));
            } else {
                this.#matchresult.setTitle("Match Result - MATCH " + (gameid + 1));
            }
            if (gameid < this.#_results.length) {
                const results = [this.#_results[gameid]];
                teams = resultsToTeamResults(results);
            }
        }

        // ポイント計算
        for (const [_, team] of Object.entries(teams)) {
            for (let i = 0; i < team.kills.length; ++i) {
                let points = {};
                if (gameid == 'all') {
                    points = calcPoints(i, team.placements[i], team.kills[i], this.#tournamentparams);
                } else {
                    points = calcPoints(gameid, team.placements[i], team.kills[i], this.#tournamentparams);
                }
                team.points.push(points.total);
                team.kill_points.push(points.kills);
                team.placement_points.push(points.placement);
                team.other_points.push(points.other);
            }
            // totalを入れておく
            team.total_points = team.points.reduce((a, c) => a + c, 0);
        }

        // results -> table
        const p = setRankParameterToTeamResults(teams);

        // 表示
        for (let i = 0; i < p.length; ++i) {
            const teamid = p[i];
            const team = teams[teamid];
            if (teamid in this.#teamparams && 'name' in this.#teamparams[teamid]) {
                this.#matchresult.setTeamName(i, this.#teamparams[teamid].name);
            } else {
                this.#matchresult.setTeamName(i, team.name);
            }
            this.#matchresult.setTotalPoints(i, team.total_points);
            const total_kills = team.kills.reduce((a, c) => a + c, 0);
            this.#matchresult.setKills(i, total_kills);
            const placement_points = team.placement_points.reduce((a, c) => a + c, 0);
            this.#matchresult.setPlacementPoints(i, placement_points);
        }
        this.#matchresult.show();
    }
    
    /**
     * プレーヤーリーダーボードのオーバーレイを表示する
     * @param {number|string} gameid ゲームID(0～)もしくは'all'を指定する
     * @param {string} sortkey ソートする対象
     */
    #showPlayerLeaderBoard(gameid, sortkey) {
        /** @type {import("./overlay-common.js").playerstats} プレイヤー戦績 */
        let playerstats = {};
        if (gameid == 'all') {
            if (this.#tournamentname != "") {
                this.#playerleaderboard.setTitle(this.#tournamentname + " - Player Stats - OVERALL (" + sortkey + ")");
            } else {
                this.#playerleaderboard.setTitle("Player Stats - OVERALL (" + sortkey + ")");
            }
            playerstats = resultsToPlayerStats(this.#_results);
        } else {
            if (this.#tournamentname != "") {
                this.#playerleaderboard.setTitle(this.#tournamentname + " - Player Stats - MATCH " + (gameid + 1) + " (" + sortkey + ")");
            } else {
                this.#playerleaderboard.setTitle("Player Stats - MATCH " + (gameid + 1) + "(" + sortkey + ")");
            }
            if (gameid < this.#_results.length) {
                const results = [this.#_results[gameid]];
                playerstats = resultsToPlayerStats(results);
            }
        }

        // 表示名の更新
        for (const [hash, stats] of Object.entries(playerstats)) {
            if (hash in this.#playerparams && 'name' in this.#playerparams[hash]) {
                stats.name = this.#playerparams[hash].name;
            }
            if (stats.teamid in this.#teamparams && 'name' in this.#teamparams[stats.teamid]) {
                stats.teamname = this.#teamparams[stats.teamid].name;
            }
        }

        // ソート
        const p = Object.keys(playerstats).sort((a, b) => {
            const sa = playerstats[a];
            const sb = playerstats[b];
            if (sortkey == "kills") {
                if (sa.kills > sb.kills) return -1;
                if (sa.kills < sb.kills) return  1;
                if (sa.damage > sb.damage) return -1;
                if (sa.damage < sb.damage) return  1;
                if (sa.assists > sb.assists) return -1;
                if (sa.assists < sb.assists) return  1;
            } else if (sortkey == "assists") {
                if (sa.assists > sb.assists) return -1;
                if (sa.assists < sb.assists) return  1;
                if (sa.kills > sb.kills) return -1;
                if (sa.kills < sb.kills) return  1;
                if (sa.damage > sb.damage) return -1;
                if (sa.damage < sb.damage) return  1;
            } else { // damage
                if (sa.damage > sb.damage) return -1;
                if (sa.damage < sb.damage) return  1;
                if (sa.kills > sb.kills) return -1;
                if (sa.kills < sb.kills) return  1;
                if (sa.assists > sb.assists) return -1;
                if (sa.assists < sb.assists) return  1;
            }
            return 0;
        });

        // 順位付け
        for (let i = 0; i < p.length; ++i) {
            const hash = p[i];
            const stats = playerstats[hash];
            if (i > 0) {
                const prev_hash = p[i - 1];
                const prev_stats = playerstats[prev_hash];
                if (sortkey == "kills" && stats.kills == prev_stats.kills) stats.rank = prev_stats.rank;
                if (sortkey == "assists" && stats.assists == prev_stats.assists) stats.rank = prev_stats.rank;
                if (sortkey == "damage" && stats.damage == prev_stats.damage) stats.rank = prev_stats.rank;
            }
            if (stats.rank == 0) stats.rank = i + 1;
        }

        // 10位以内を配列へ
        const players = [];
        for (const hash of p) {
            const stats = playerstats[hash];
            if (stats.rank > 10) break;
            players.push(stats);
        }
        this.#playerleaderboard.setLeaderboard(players);
    }

    #hideLeaderBoard() {
        this.#leaderboard.hide();
    }
    #hideTeamBanner() {
        this.#teambanner.hide();
    }
    #hidePlayerBanner() {
        this.#playerbanner.hide();
    }
    #hideTeamKills() {
        this.#teamkills.hide();
    }
    #hideOwnedItems() {
        this.#owneditems.hide();
    }
    #hideGameInfo() {
        this.#gameinfo.hide();
    }
    #hideChampionBanner() {
        this.#championbanner.hide();
    }
    #hideSquadEliminated() {
        this.#squadeliminated.hide();
    }
    #hideMatchResult() {
        this.#matchresult.hide();
    }
    #hidePlayerLeaderBoard() {
        this.#playerleaderboard.hide();
    }
    #hideMapLeaderBoard() {
        this.#mapleaderboard.hide();
    }

    /**
     * 全てのオーバーレイを非表示にする(MatchResult/PlayerLeaderBoardを除く)
     */
    #hideAll() {
        this.#hideLeaderBoard();
        this.#hideTeamBanner();
        this.#hidePlayerBanner();
        this.#hideTeamKills();
        this.#hideOwnedItems();
        this.#hideSquadEliminated();
        this.#hideChampionBanner();
        this.#hideMapLeaderBoard();
        this.#hideGameInfo();
    }

    /**
     * チームの順位が変わった場合に呼び出される
     * @param {string} teamid チームID(0～)
     * @param {number} rank 現在の順位(0～)
     */
    #onTeamRankChanged(teamid, rank) {
        if (teamid == this.#camera.teamid) {
            this.#teambanner.setRank(rank + 1);
        }
    }

    /**
     * チームの合計ポイントが変わった場合に呼び出される
     * @param {string} teamid チームID(0～)
     * @param {number} points 現在の合計ポイント
     */
    #onTeamPointsChanged(teamid, points) {
        this.#leaderboard.setTeamPoints(teamid, points);
        this.#mapleaderboard.setTeamPoints(teamid, points);
        if (teamid == this.#camera.teamid) {
            this.#teambanner.setPoints(points);
        }
    }

    /**
     * 表示中のアイテム全てを更新する
     * @param {object} team チームデータ(参照)
     * @param {number} playerid プレイヤーID(=squadindex)
     */
    #updateAllItems(team, playerid) {
        if (!('players' in team)) return;
        if (playerid >= team.players.length) return;
        const player = team.players[playerid];
        if (!('items' in player)) return;

        for (const [itemid, count] of Object.entries(player.items)) {
            this.#owneditems.procUpdateItem(itemid, count);
        }
    }
    /**
     * カメラが切り替わった際に呼び出される
     * @param {numbner} teamid チームID(0～)
     * @param {number} playerid プレイヤーのID(=squadindex)
     */
    #onChangeCamera(teamid, playerid) {
        this.#camera.teamid = teamid.toString(); // Object index(string)
        this.#camera.playerid = playerid; // array index

        this.#teambanner.setId(teamid);
        this.#teambanner.setTeamName(this.#getTeamName(teamid));
        this.#playerbanner.setPlayerName(this.#getPlayerName(teamid, playerid));

        if (this.#camera.teamid in this.#teams) {
            const team = this.#teams[teamid];

            if ('rank' in team) {
                this.#teambanner.setRank(team.rank + 1);
            }
            if ('points' in team) {
                this.#teambanner.setPoints(team.points.reduce((a, c) => a + c, 0));
            }
        }

        if (this.#_game && 'teams' in this.#_game) {
            if (teamid < this.#_game.teams.length) {
                this.#updateAllItems(this.#_game.teams[teamid], playerid);

                if (playerid < this.#_game.teams[teamid].players.length) {
                    this.#camera.playerhash = this.#_game.teams[teamid].players[playerid].hash;
                }

                // チームキルの設定
                this.#teamkills.setKills(this.#_game.teams[teamid].kills);
            }
        }
    }
    /**
     * 画面やゲーム進行状態が変わった際に呼びされれるコールバック関数を設定する
     * @param {function} func コールバック関数
     */
    addStateChangeCallback(func) {
        if (typeof(func) == "function") {
            this.#statechangecallbacks.push(func);
        }
    }
}
