import {CollectionConfig, ColorConfig, ProductConfig} from "./DataTypes";
import {oDataClientConfig, OpenDataClient} from "./OpenDataClient";

export type pdmsConfig = oDataClientConfig & {
    uid:string
    region:string
}

export class PdmsDataClient extends OpenDataClient {
    constructor(protected config: pdmsConfig, debugPath:string|undefined) {
        super(config, debugPath)
    }

    protected parseProduct(item:any) : ProductConfig | undefined {
        if (!item.hasOwnProperty("sellingStyleName")
            || !item.hasOwnProperty("sellingStyleNumber")
            || !item.hasOwnProperty("colors")
            || !item.hasOwnProperty("kenticoCloudData")
            || !item.kenticoCloudData
            || !item.kenticoCloudData.showOnSite
            || !item.colors.length) {
            return
        }

        const product:ProductConfig = {
            ppi:20,
            code:item.sellingStyleNumber,
            displayName:item.sellingStyleName,
            colors:[]
        };

        // in the case of carpet tile, recommendedInstallationMethodsInfo is what we need, otherwise hardwoods: recommendedInstallationMethods
        const patterns = item.recommendedInstallationMethodsInfo ? item.recommendedInstallationMethodsInfo : item.recommendedInstallationMethods;

        if (patterns && patterns.length) {
            product.patterns = [];
            patterns.forEach((pattern:any)=>{
                product.patterns.push({
                    code:pattern.tricycleCode,
                    displayName:pattern.name,
                    image:pattern.imageLink
                })
            })
        }

        product.colors = [];
        item.colors.forEach((c:any)=>{
            const color = this.parseColor(c);
            if (color) product.colors.push(color);
        });

        return product
    }

    protected parseColor(item:any) : ColorConfig | undefined {
        if (!item.hasOwnProperty("colorName")
            || !item.hasOwnProperty("colorNumber")) {
            return
        }

        return {
            code:item.colorNumber,
            displayName:item.colorName
        }
    }

    getCollection(brand:string, params:CollectionConfig) : Promise<CollectionConfig> {

        const collection:CollectionConfig = {
            code:params.code,
            displayName:params.displayName,
            products:[]
        };

        const filter = `Region eq '${this.config.region}' and BrandGroup eq '${brand}' and SpecStatus eq 'Active' and RunningLine eq 'Yes' and (${params.filter})`;
        const url = `${this.config.dataUrl}/Specifications?$filter=${filter}&region=${this.config.region}&uid=${this.config.uid}`;

        const productCodes:string[] = [];
        return this.oDataRequest(url, "count", (json:any)=>{
            const items:any[] = json.hasOwnProperty("items") ? json.items : json;
            items.forEach(item=>{
                const product = this.parseProduct(item)
                if (product && productCodes.indexOf(product.code) < 0) {
                    productCodes.push(product.code);
                    collection.products.push(product);
                }
            });
        }).then(()=>{
            return new Promise<CollectionConfig>((resolve)=>{
                resolve(collection)
            })
        })
    }
}