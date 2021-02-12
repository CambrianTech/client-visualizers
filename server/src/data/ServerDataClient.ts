import {CollectionConfig} from "cambrian-base";

export abstract class ServerDataClient {
    protected constructor(protected debugPath:string|undefined) {

    }
    public abstract getCollection(brand:string, collection:CollectionConfig) : Promise<CollectionConfig>;
}