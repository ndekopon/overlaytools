export class OverlayBase {
    static HIDE_CLASS = "hide";
    static FORCEHIDE_CLASS = "forcehide";
    ID;
    PREFIX;
    nodes;
    constructor(id, prefix, root = document.body) {
        this.ID = id;
        this.PREFIX = prefix;

        this.nodes = {
            base: document.createElement('div')
        };

        this.nodes.base.id = this.ID;
        root.appendChild(this.nodes.base);
    }

    addNode(name, tag = "div") {
        if (name in this.nodes) return;
        this.nodes[name] = document.createElement(tag);
        this.nodes[name].classList.add(this.PREFIX + name);
    }

    hide() {
        this.nodes.base.classList.add(OverlayBase.HIDE_CLASS);
    }

    show() {
        this.nodes.base.classList.remove(OverlayBase.HIDE_CLASS);
    }

    addForceHide() {
        this.nodes.base.classList.add(OverlayBase.FORCEHIDE_CLASS);
    }

    removeForceHide() {
        this.nodes.base.classList.remove(OverlayBase.FORCEHIDE_CLASS);
    }

    addClass(name) {
        this.nodes.base.classList.add(this.PREFIX + name);
    }

    removeClass(name) {
        this.nodes.base.classList.remove(this.PREFIX + name);
    }

    clearClasses(name) { // prefix + nameで始まるクラスを削除
        for (const id of this.nodes.base.classList) {
            if (id.indexOf(this.PREFIX + name) == 0) {
                this.nodes.base.classList.remove(id);
            }
        }
    }
}
