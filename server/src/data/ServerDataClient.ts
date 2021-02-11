import {CollectionConfig} from "./DataTypes";


export abstract class ServerDataClient {
    protected constructor(protected debugPath:string|undefined) {

    }
    public abstract getCollection(brand:string, collection:CollectionConfig) : Promise<CollectionConfig>;
}