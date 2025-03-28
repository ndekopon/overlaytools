import { TemplateOverlay, TemplateOverlayHandler } from "./template-overlay.js";

class TotalResult extends TemplateOverlay {
    constructor() {
        super({types: ["players-totalresult"]});
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
    }
}

export function initOverlay(params = {}) {
    params.overlays = {
        "totalresult": new TotalResult()
    }
    const overlay = new TemplateOverlayHandler(params);
    console.log(overlay);
}
