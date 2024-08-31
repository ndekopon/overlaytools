import { TemplateOverlay, TemplateOverlayHandler } from "./template-overlay.js";

class LeaderBoard extends TemplateOverlay {
    static FADEIN_CLASS = 'fadein';
    static FADEOUT_CLASS = 'fadeout';
    static CHANGED_CLASS = 'changed';
    #currentshowindex;
    #nextshowindex;
    #timerid;
    #shownum;
    #showinterval;
    #alivesonly;
    #delaysort;

    constructor(shownum = 4) {
        super({ types: ["view-live"] });
        this.#timerid = -1;
        this.#currentshowindex = 0;
        this.#nextshowindex = 0;
        this.#shownum = shownum;
        this.#showinterval = 5000;
        this.#alivesonly = false;
        this.#delaysort = [];
    }

    /**
     * 現在の生存チーム数を取得
     * @returns {number} 生存しているチーム数
     */
    #countAlives() {
        let alives = 0;
        for (const teamid of Object.keys(this.teams)) {
            if (this.#isAlive(teamid)) alives++;
        }
        return alives;
    }

    #isAlive(teamid) {
        const exists = this.teams[teamid].classList.contains('team-exists');
        const eliminate = this.teams[teamid].classList.contains('team-squad-eliminate');
        return (exists && !eliminate);
    }

    #startFadeIn() {
        const children = this.root.shadowRoot.querySelector('.teams').children;
        const length = children.length;
        this.#currentshowindex = this.#nextshowindex;
        let start = this.#currentshowindex;
        for (let i = start; i < length && i < start + this.#shownum; ++i) {
            children[i].classList.remove(LeaderBoard.CHANGED_CLASS);
            children[i].classList.add(LeaderBoard.FADEIN_CLASS);
            children[i].classList.remove(LeaderBoard.HIDE_CLASS);
            this.#nextshowindex++;
        }
        if (this.#nextshowindex >= length) this.#nextshowindex = 0;

        // FadeIn終了
        this.#timerid = setTimeout(() => {
            this.#endFadeIn();
        }, 300); // 300ms
    }

    #endFadeIn() {
        for (const node of this.root.shadowRoot.querySelectorAll(`.${LeaderBoard.FADEIN_CLASS}`)) {
            node.classList.remove(LeaderBoard.FADEIN_CLASS);
        }
        this.sortTeamTotalRank();
        // FadeOut予約
        this.#timerid = setTimeout(() => {
            this.#startFadeOut();
        }, this.#showinterval);
    }

    #startFadeOut() {
        const children = this.root.shadowRoot.querySelector('.teams').children;
        for (const node of children) {
            if (!node.classList.contains(LeaderBoard.HIDE_CLASS)) {
                node.classList.remove(LeaderBoard.CHANGED_CLASS);
                node.classList.add(LeaderBoard.FADEOUT_CLASS);
            }
        }
        // FadeOut終了
        this.#timerid = setTimeout(() => {
            this.#endFadeOut();
        }, 300);
    }

    #endFadeOut() {
        for (const node of this.root.shadowRoot.querySelectorAll(`.${LeaderBoard.FADEOUT_CLASS}`)) {
            node.classList.add(LeaderBoard.HIDE_CLASS);
            node.classList.remove(LeaderBoard.FADEOUT_CLASS);
        }
        // FadeIn予約
        this.#timerid = setTimeout(() => {
            this.#startFadeIn();
        }, 0);
    }

    setSquadEliminate(placement, teamid, teamname, init) {
        this.#check();
    }

    #check() {
        const alives = this.#countAlives();
        if (alives > this.#shownum) {
            if (this.#timerid >= 0) return; // 既にアニメーション開始済
            // 全て隠す
            for (const [_, team] of Object.entries(this.teams)) {
                team.classList.add(TemplateOverlay.HIDE_CLASS);
            }
            this.#alivesonly = false;
            this.#currentshowindex = 0;
            this.#nextshowindex = 0;
            this.#startFadeIn();
        } else {
            if (this.#timerid >= 0) {
                clearTimeout(this.#timerid);
                this.#timerid = -1;
            }
            // アニメーション用クラスの削除
            for (const node of this.root.shadowRoot.querySelectorAll(`.${LeaderBoard.FADEIN_CLASS}`)) {
                node.classList.remove(LeaderBoard.FADEIN_CLASS);
            }
            for (const node of this.root.shadowRoot.querySelectorAll(`.${LeaderBoard.FADEOUT_CLASS}`)) {
                node.classList.remove(LeaderBoard.FADEOUT_CLASS);
            }
            if (!this.#alivesonly) {
                this.#alivesonly = true;
            }
            if (this.#alivesonly) {
                for (const [teamid, team] of Object.entries(this.teams)) {
                    if (this.#isAlive(teamid)) {
                        team.classList.remove(TemplateOverlay.HIDE_CLASS);
                    } else {
                        team.classList.add(TemplateOverlay.HIDE_CLASS);
                    }
                }
            }
        }
    }

    sortTeamTotalRank(changeinfo = []) {
        this.#check();
        this.#delaysort.push(...changeinfo);
        const teams = Object.values(this.teams);
        teams.sort((a, b) => {
            const a_node = a.querySelector('.team-total-rank');
            const b_node = b.querySelector('.team-total-rank');
            const a_rank = parseInt(a_node.innerText, 10);
            const b_rank = parseInt(b_node.innerText, 10);
            if (a_rank > b_rank) return 1;
            if (a_rank < b_rank) return -1;
            return 0;
        });

        const root = this.root.shadowRoot.querySelector('.teams');
        for (const team of teams) {
            const rank = parseInt(team.querySelector('.team-total-rank').innerText, 10) - 1;
            if (root.children[rank] != team) {
                root.insertBefore(team, root.children[rank]);
            }
        }

        // フェードイン・アウト中は何もしない
        if (this.root.shadowRoot.querySelector(`.${LeaderBoard.FADEIN_CLASS}`)) return;
        if (this.root.shadowRoot.querySelector(`.${LeaderBoard.FADEOUT_CLASS}`)) return;

        if (this.#alivesonly == false) {
            const children = this.root.shadowRoot.querySelector('.teams').children;
            let start = this.#currentshowindex;
            for (let i = 0; i < children.length; ++i) {
                if (start <= i && i < start + this.#shownum) {
                    // 表示
                    children[i].classList.remove(LeaderBoard.HIDE_CLASS);
                    const teamid = parseInt(children[i].dataset.teamId, 10) - 1;
                    if (this.#delaysort.find(x => x.id == teamid && x.changed)) {
                        children[i].classList.remove(LeaderBoard.FADEIN_CLASS);
                        children[i].classList.remove(LeaderBoard.CHANGED_CLASS);
                        children[i].classList.add(LeaderBoard.CHANGED_CLASS);
                    }
                } else {
                    // 隠す
                    children[i].classList.remove(LeaderBoard.FADEIN_CLASS);
                    children[i].classList.remove(LeaderBoard.FADEOUT_CLASS);
                    children[i].classList.remove(LeaderBoard.CHANGED_CLASS);
                    children[i].classList.add(LeaderBoard.HIDE_CLASS);
                }
            }
        } else {
            for (const [teamid, team] of Object.entries(this.teams)) {
                if (this.#isAlive(teamid)) {
                    team.classList.remove(LeaderBoard.HIDE_CLASS);
                } else {
                    team.classList.add(LeaderBoard.HIDE_CLASS);
                }
            } 
        }
        this.#delaysort.splice(0);
    }

    removeHide() {
        if (super.removeHide()) {
            this.#check();
        }
    }
}

class MapLeaderBoard extends TemplateOverlay {
    static CHANGED_CLASS = 'changed';
    constructor() {
        super({types: ["view-map"]});
    }

    sortTeamTotalRank(changeinfo = []) {
        const teams = Object.values(this.teams);
        teams.sort((a, b) => {
            const a_node = a.querySelector('.team-total-rank');
            const b_node = b.querySelector('.team-total-rank');
            const a_rank = parseInt(a_node.innerText, 10);
            const b_rank = parseInt(b_node.innerText, 10);
            if (a_rank > b_rank) return 1;
            if (a_rank < b_rank) return -1;
            return 0;
        });

        const root = this.root.shadowRoot.querySelector('.teams');
        for (const team of teams) {
            const rank = parseInt(team.querySelector('.team-total-rank').innerText, 10) - 1;
            if (root.children[rank] != team) {
                root.insertBefore(team, root.children[rank]);
            }
        }

        for (const x of changeinfo) {
            if (x.changed && x.id in this.teams) {
                this.teams[x.id].classList.remove(MapLeaderBoard.CHANGED_CLASS);
                this.teams[x.id].classList.add(MapLeaderBoard.CHANGED_CLASS);
            }
        }
    }
}

class TeamBanner extends TemplateOverlay {
    constructor() {
        super({types: ["view-camera", "show-camera-team"]});
    }

    setParam(paramname, paramvalue, dataset = false) {
        super.setParam(paramname, paramvalue, dataset);
        if (paramname == "camera-team-name") {
            this.drawCanvas();
            this.drawNameCanvas(paramvalue);
        }
    }

    drawCanvas() {
        const canvas = this.root.shadowRoot.querySelector('canvas.apexrect');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        //
        const rate = canvas.height / 74;
        ctx.beginPath();
        ctx.moveTo(10 * rate, 0);
        ctx.lineTo(0, 16 * rate);
        ctx.lineTo(34 * rate, canvas.height);
        ctx.lineTo(canvas.width - 9 * rate, canvas.height);
        ctx.lineTo(canvas.width, 60 * rate);
        ctx.lineTo(canvas.width - 36 * rate, 0);
        ctx.closePath();
        ctx.clip();

        // 画像の描画
        ctx.fillStyle = '#141414';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 赤枠(X方向)
        const xborder = 5;
        ctx.fillStyle = "#B03039";
        ctx.beginPath();
        ctx.moveTo(  xborder + 10 * rate, 0);
        ctx.lineTo(  xborder            , 16 * rate);
        ctx.lineTo(  xborder + 34 * rate, canvas.height);
        ctx.lineTo(- xborder + 34 * rate, canvas.height);
        ctx.lineTo(- xborder            , 16 * rate);
        ctx.lineTo(- xborder + 10 * rate, 0);
        ctx.fill();
    }

    drawNameCanvas(name) {
        const canvas = this.root.shadowRoot.querySelector('canvas.camera-team-name');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // テキストの描画
        const margin = 10;
        ctx.fillStyle = window.getComputedStyle(canvas).color;
        ctx.font = window.getComputedStyle(canvas).font;
        ctx.textBaseline = 'middle';
        ctx.textAlign = "left";
        ctx.fillText(name, margin, canvas.height / 2 + 3, canvas.width - margin * 2);
    }
}

class PlayerBanner extends TemplateOverlay {
    constructor() {
        super({types: ["view-camera", "show-camera-teamplayer", "defaulthide"]});
    }
}

class TeamKills extends TemplateOverlay {
    constructor() {
        super({types: ["view-camera", "show-camera-team"]});
    }
}

class OwnedItems extends TemplateOverlay {
    constructor() {
        super({types: ["view-camera", "show-camera-teamplayer"]});
    }
}

class GameInfo extends TemplateOverlay {
    constructor() {
        super({types: ["view-live"]});
    }
}

class ChampionBanner extends TemplateOverlay {
    static FADEINOUTTARGET_CLASS = "fadeinout-target";
    static FADEINOUT_CLASS = "fadeinout";
    #target;

    constructor() {
        super();
        this.#target = null;
    }

    async build() {
        await super.build();
        this.#target = this.root.shadowRoot.querySelector(`.${ChampionBanner.FADEINOUTTARGET_CLASS}`);
        return true;
    }

    #startFadeIn() {
        if (this.#target) {
            this.#target.classList.remove(ChampionBanner.FADEINOUT_CLASS);
            setTimeout(() => {
                this.#target.classList.add(ChampionBanner.FADEINOUT_CLASS);
            }, 30);
        }
    }

    setWinnerDetermine(teamid, teamname) {
        this.setParam('winner-teamid', teamid, true);
        this.setParam('winner-team-name', teamname);
        this.#startFadeIn();
    }
}

class SquadEliminated extends TemplateOverlay {
    static FADEINOUTTARGET_CLASS = "fadeinout-target";
    static FADEINOUT_CLASS = "fadeinout";
    static FADEINOUT_ANIMATION_NAME = "fadeinout-animation";

    /**
     * @typedef {object} queuedata
     * @prop {number} placement 順位(1～)
     * @prop {number|string} teamid チームID(0～)
     * @prop {string} teamname チーム名
     */

    /** @type {queuedata[]} */
    #queue;
    #target;

    /**
     * コンストラクタ
     */
    constructor() {
        super({types: ["view-live"]});
        this.#queue = [];
        this.#target = null;
    }

    async build() {
        await super.build();
        this.#target = this.root.shadowRoot.querySelector(`.${SquadEliminated.FADEINOUTTARGET_CLASS}`);
        if (this.#target) {
            // アニメーション後、クラスを削除
            this.#target.addEventListener('animationend', (ev) => {
                if (ev.animationName == SquadEliminated.FADEINOUT_ANIMATION_NAME) {
                    this.#target.classList.remove(SquadEliminated.FADEINOUT_CLASS);
                    window.requestAnimationFrame((_) => {
                        window.requestAnimationFrame((_) => {
                            this.#checkNext();
                        });
                    });
                }
            });
        }
        return true;
    }

    /**
     * チーム排除情報を設定する
     * @param {number} placement 順位(1～)
     * @param {number|string} teamid チームID(0～)
     * @param {string} teamname チーム名
     * @param {boolean} init 初期化中
     * @returns 
     */
    setSquadEliminate(placement, teamid, teamname, init) {
        if (init) return;
        if (placement <= 2) return;
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
    #startFadeIn() {
        if (this.#target) {
            this.#target.classList.add(SquadEliminated.FADEINOUT_CLASS);
        }
    }

    /**
     * 次のデータがあるかどうか確認して次の動作を行う
     */
    #checkNext() {
        if (this.#queue.length == 0) {
            return;
        }

        if (this.#target && this.#target.classList.contains(SquadEliminated.FADEINOUT_CLASS)) return; // フェードアウト待ち

        // 次のデータを表示
        const data = this.#queue.shift();
        if (data) {
            this.setParam('eliminated-team-id', data.teamid, true);
            this.setParam('eliminated-team-placement', data.placement);
            this.setParam('eliminated-team-name', data.teamname);
            this.#startFadeIn();
        }
    }
}

class ErrorStatus extends TemplateOverlay {
}

export function initOverlay(params = {}) {
    params.overlays = {
        "leaderboard": new LeaderBoard(),
        "teambanner": new TeamBanner(),
        "playerbanner": new PlayerBanner(),
        "teamkills": new TeamKills(),
        "mapleaderboard": new MapLeaderBoard(),
        "gameinfo": new GameInfo(),
        "owneditems": new OwnedItems(),
        "squadeliminated": new SquadEliminated(),
        "errorstatus": new ErrorStatus(),
        "championbanner": new ChampionBanner(),
    }
    const overlay = new TemplateOverlayHandler(params);
    console.log(overlay);
}
