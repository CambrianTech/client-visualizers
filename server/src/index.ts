import express from "express";
import compression from "compression";
import * as dotenv from "dotenv-flow";
import * as path from "path";
import * as fs from "fs";
import {getHeader, getHeaderTags, RequestContext, SiteConfig} from "cambrian-base";

const app = express();
dotenv.config();

const isDevelop = process.env.NODE_ENV === "development";
const port = isDevelop ? 3010 : 3000;
const buildPath = path.join(__dirname, isDevelop ? '../../build' : '../build');
const isDebug = process.env.IS_DEBUG ? parseInt(process.env.IS_DEBUG.trim())===1 : false;
const defaultSite = process.env.DEFAULT_SITE ? process.env.DEFAULT_SITE : "divinefloor";
const cacheRoot = path.join(__dirname, 'cache');
const debugRoot = path.join(__dirname, 'debug');
const domain = process.env.BASE_DOMAIN ? process.env.BASE_DOMAIN.trim() : "";
const CONFIG_STORE = "config";
const baseDataPath = process.env.CB_SITE_DATA_URL ? process.env.CB_SITE_DATA_URL.trim() : "";

const uploadsBaseUrl = process.env.CB_UPLOADS_URL;
if (!uploadsBaseUrl) {
    throw new Error("CB_UPLOADS_URL not set.")
}

if (!fs.existsSync(cacheRoot)) {
    fs.mkdirSync(cacheRoot);
}

if (isDebug) {
    console.log("Debug mode is ON");
    if (!fs.existsSync(debugRoot)) {
        fs.mkdirSync(debugRoot);
    }
}

function getDomain(host:string) {
    return (host.indexOf("staging.") >= 0) ? "staging." + domain : domain;
}

function getConfig(subdomain:string) : SiteConfig | undefined {

    const configPath = path.join(buildPath, CONFIG_STORE);
    try {
        const filepath = path.join(configPath, `${subdomain}.json`);
        const defaultPath = path.join(configPath, `${defaultSite}.json`);
        const exists = fs.existsSync(filepath);
        const json = JSON.parse(fs.readFileSync(exists ? filepath : defaultPath, 'utf-8'));
        return json
    } catch (err) {
        console.error(`Could not find config at ${configPath}`);
    }

    return undefined;
}

app.use(compression());

app.get("*", (req, res) => {

    const filePath = path.join(buildPath, decodeURI(req.path));
    if (req.path !== "/" && req.path !== "/index.html" && fs.existsSync(filePath)) {
        res.sendFile(filePath);
    }
    else {
        const domain = getDomain(req.headers.host);
        const subdomain = req.headers.host.replace("." + domain, "");

        console.log("Requested", req.path, subdomain);

        const config = getConfig(subdomain);
        const indexPath = path.join(buildPath, "index.html");
        fs.readFile(indexPath, "utf8", (err, data) => {
            if (err) {
                res.status(404).send(`${indexPath} couldn't be found`);
            } else {
                const request:RequestContext = {
                    site: config,
                    host: `${baseDataPath}/${config.code}`,
                    path: req.path,
                    query: req.query
                };
                const tags = getHeaderTags(request, getHeader(config.appearance.header, req.path));

                let content = "";
                tags.forEach(tag=>content += tag.render() + "\n");
                data = data.replace("</head>", `${content}</head>`);

                res.send(data);
            }
        });
    }
});

// start the Express server
app.listen( port, () => {
    // tslint:disable-next-line:no-console
    console.log( `Server started at http://localhost:${ port }` );
} );