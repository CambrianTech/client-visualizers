import {oDataClientConfig, OpenDataClient} from "./OpenDataClient";
import {CollectionConfig, ProductConfig} from "./DataTypes";

export type shawConfig = oDataClientConfig & {

}

export class ShawDataClient extends OpenDataClient {
    constructor(protected config: shawConfig, debugPath:string|undefined) {
        super(config, debugPath)
    }

    protected parseProduct(item:any) : ProductConfig | undefined {

        const product:ProductConfig = {
            ppi:20,
            code:item.SellingStyleNbr,
            displayName:item.SellingStyleName,
            colors:[]
        };

        return product
    }

    protected parseColor(item:any) : CollectionConfig | undefined {
        return {
            code:item.SellingColorNbr,
            displayName:item.SellingColorName
        }
    }

    getCollection(brand:string, params:CollectionConfig) : Promise<CollectionConfig> {

        const collection:CollectionConfig = {
            code:params.code,
            displayName:params.displayName,
            products:[]
        };

        const filter = `${params.filter}`;
        const url = `${this.config.dataUrl}/${params.path}?$select=${params.select}&$orderby=${params.orderBy}&$filter=${filter}`;
        const colorPromises:Promise<any>[] = [];
        return this.oDataRequest(url, "@odata.count",(json:any)=>{
            const items = json.value as any[];
            const productCodes:string[] = [];
            const newProducts:ProductConfig[] = [];
            items.forEach(item=>{
                const product = this.parseProduct(item);
                newProducts.push(product);
                productCodes.push(`'${product.code}'`);
            });

            if (productCodes.length) {
                const filter = `IsDropped eq false and HasMainImage eq true and SellingStyleNbr in (${productCodes.join(',')})`;
                const select = `${params.select},SellingColorNbr`;
                const url = `${this.config.dataUrl}/${params.path}?$select=${select}&$orderby=${params.orderBy}&$filter=${filter}`;
                colorPromises.push(this.oDataRequest(url, "@odata.count",(json:any)=>{
                    const items:any[] = json.hasOwnProperty("value") ? json.value : json;
                    items.forEach(item=>{
                        const color = this.parseColor(item);
                        const productId = item.SellingStyleNbr;
                        newProducts.find(p=>p.code===productId).colors.push(color);
                    });
                }));
                collection.products = collection.products.concat(newProducts);
            }
            return newProducts
        }).then(()=>{
            return new Promise<CollectionConfig>((resolve)=>{
                Promise.all(colorPromises).then(()=>{
                    console.log(`Final collection has ${collection.products.length} products`);
                    resolve(collection)
                });
            })
        })
    }
}