export type BrandConfig = {
    name:string
    dataClient:string
    subdomain?:string
    availableCollections:string[]
    availableScenes: []
    landing:string
    logo?:string
    splash?:string[]|undefined
    hasPhotoUpload: boolean,
    hasScenes: boolean
}

export type CollectionConfig = {
    dataClient?:string,
    code:string,
    displayName:string,
    surfaceTypes: string[],
    thumbnail: string,
    select?:string
    filter:string
    orderBy?:string
    path?:string
}

type DataItem = {
    code:string,
    displayName:string
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
