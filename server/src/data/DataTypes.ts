type ConfigItem = {
    code:string,
    displayName:string
    metaData?:any
}

export type SiteConfig = ConfigItem & {
    dataClient?:string,
    basePath:string,
    config:GlobalConfig,
    visualizerConfig:VisualizerConfig,
    brands:BrandConfig[]
}

export type VisualizerConfig = {
    availableCollections?: string[],
    availableScenes?: []
    hasPhotoUpload: boolean,
    hasScenes: boolean,
    hasShare:boolean,
}

export type GlobalConfig = {
    subdomain?: string,
    title?:string,
    longTitle?:string
    shortTitle?:string,
    description: string,
    favicon?: string,
    favicon192x192?: string,

    logo: string,
    primaryColor: string,
    buttonTextColor: string,
    inactiveColor: string,
    shareSubject: string,

    image?: string,
    imageWidth?: number,
    imageHeight?: number,
    imageAlt?: string,

    landing?:string
    splash?:string[]|undefined

    appleShareIcon?: string,
    twitterAccount?: string,
    siteLogoImage?: string,
}

export type BrandConfig = ConfigItem & {
    surfaceTypes?:string[]
    assetType?:string,
    collections?:CollectionConfig[]
    sceneCollections?:SceneCollectionConfig[]
}

export type CollectionConfig = ConfigItem & {
    products?:ProductConfig[]
    collections?:CollectionConfig[]
    dataClient?:string,
    surfaceTypes?: string[],
    thumbnail?: string,
    select?:string
    filter?:string
    orderBy?:string
    path?:string
}

export type SceneCollectionConfig = ConfigItem & {
    scenes:SceneConfig[]
}

export type SceneConfig = ConfigItem & {
    image?:string
}

export type InstallationPattern = ConfigItem & {
    image?:string
}

export type ProductConfig = ConfigItem & {
    ppi:number
    colors:ColorConfig[]
    numColors?:number
    patterns?:InstallationPattern[]
}

export type ColorConfig = ConfigItem & {

}
