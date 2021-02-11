export abstract class HtmlTag {
    abstract render() : string;
}

export class HtmlGenericTag extends HtmlTag {
    constructor(public tag:string, public content?:any) {
        super()
    }

    render() {
        return `<${this.tag}>${this.content}</${this.tag}>`
    }
}

export class MetaDataTag extends HtmlTag {
    constructor(public property:string, public content:any) {
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