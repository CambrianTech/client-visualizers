type DataItem = {
    code:string,
    displayName:string
}

export type BrandConfig = DataItem & {
    dataClient?:string,
    siteConfig:SiteConfig,
    visualizerConfig:VisualizerConfig,
}

export type VisualizerConfig = {
    availableCollections?: string[],
    availableScenes?: []
    hasPhotoUpload: boolean,
    hasScenes: boolean,
    hasShare:boolean,
}

export type SiteConfig = {
    subdomain?: string,
    title?:string,
    longTitle?:string
    shortTitle?:string,
    description: string,
    favicon?: string,
    favicon192x192?: string,

    primaryColor: string,
    buttonTextColor: string,
    inactiveColor: string,

    image?: string,
    imageWidth?: number,
    imageHeight?: number,
    imageAlt?: string,

    landing?:string
    logo?:string
    splash?:string[]|undefined

    appleShareIcon?: string,
    twitterAccount?: string,
    siteLogoImage?: string,
    shareSubject?: string,
}

export type CollectionConfig = DataItem & {
    dataClient?:string,
    surfaceTypes: string[],
    thumbnail: string,
    select?:string
    filter:string
    orderBy?:string
    path?:string
}

export type ProductCollection = DataItem & {
    products?:Product[]
    collections?:ProductCollection[]
}

export type InstallationPattern = DataItem & {
    image?:string
}

export type Product = DataItem & {
    ppi:number
    colors:ProductColor[]
    numColors?:number
    patterns?:InstallationPattern[]
}

export type ProductColor = DataItem & {

}
