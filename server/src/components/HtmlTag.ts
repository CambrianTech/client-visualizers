abstract class HtmlTag {
    abstract render() : string;
}

export class TitleTag extends HtmlTag {
    constructor(public title:string) {
        super()
    }

    render() {
        return `<title>${this.title}</title>`;
    }
}

export class MetaDataTag extends HtmlTag {
    constructor(public property:string, public content:string) {
        super()
    }

    render() {
        return `<meta property="${this.property}" content="${this.content}" />`
    }
}

export class LinkTag extends HtmlTag {
    constructor(public rel:string, public href:string, public other:string="") {
        super()
    }

    render() {
        return `<link rel="${this.rel}" href="${this.href}" ${this.other} />`
    }
}