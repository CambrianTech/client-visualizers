import {ServerDataClient} from "./ServerDataClient";
import * as https from "https";
import * as fs from "fs";

export type oDataClientConfig = {
    dataUrl:string
    pageSize:number
    maxPages:number
}

export abstract class OpenDataClient extends ServerDataClient {

    protected constructor(protected config: oDataClientConfig, debugPath:string|undefined) {
        super(debugPath)
    }

    private oDataRequestPartial(url:string, page?:number) {
        let path = `${url}&$top=${this.config.pageSize}`;
        if (page) {
            path += "&$skip=" + page * this.config.pageSize;
        } else {
            path += "&$count=true";
        }

        console.log("Getting url", path);

        return new Promise<any>((resolve, reject) => {
            https.get(path, (resp) => {
                let data = '';

                // A chunk of data has been received.
                resp.on('data', (chunk) => {
                    data += chunk;
                });

                // The whole response has been received. Print out the result.
                resp.on('end', () => {
                    const json = JSON.parse(data);

                    if (this.debugPath) {
                        const writePath = page ? this.debugPath.replace('.',`_${page}.`) : this.debugPath;
                        fs.writeFile(writePath, JSON.stringify(json, null, 4), () => {
                            console.log(`Saved data to ${writePath}`);
                        });
                    }

                    // error like:
                    // { "statusText": "Bad Request", "status": 400, "message": "The string 'Hardwoods' is not a valid enumeration type constant." }
                    if (json.hasOwnProperty("message")) {
                        reject(new Error(json.message))
                    } else {
                        resolve(json);
                    }
                });

            }).on("error", (err) => {
                reject(err);
            })
        });
    }

    protected oDataRequest(url:string, countParamName:string, parser:(json:any)=>void) {

        return new Promise((resolve, reject) => {
            const first = this.oDataRequestPartial(url);
            first.then(json=>{
                if (json.hasOwnProperty("error")) {
                    reject(new Error(json.error.message))
                    return
                }
                const count = json[countParamName];
                const numPages = Math.ceil(count / this.config.pageSize);
                const numPagesRemaining = Math.min(numPages-1, this.config.maxPages);

                console.log(`Getting ${count} items in ${numPages} pages`);

                if (process.env.DEBUG) {

                }
                parser(json);

                if (numPagesRemaining > 0) {
                    const promises = [];
                    let remainingRequests = numPagesRemaining;
                    for (let i=0; i<numPagesRemaining; i++) {
                        promises.push( this.oDataRequestPartial(url, i+1));
                    }

                    promises.forEach(promise=>promise.then(json=>{
                        parser(json);
                        remainingRequests --;
                        if (remainingRequests===0) {
                            resolve(json)
                        }
                    }).catch(err=>reject(err)));
                } else {
                    resolve(json);
                }
            }).catch(err=>{
                reject(err);
            });
        });
    }
}