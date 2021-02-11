import express from "express";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import {getHeaderTags} from './components/MetaData';

const app = express();
dotenv.config();

const isDevelop = process.env.IS_DEVELOP ? parseInt(process.env.IS_DEVELOP)===1 : false;
const port = 3000;
const buildPath = path.join(__dirname, isDevelop ? '../../build' : 'build');
const isDebug = process.env.IS_DEBUG ? parseInt(process.env.IS_DEBUG.trim())===1 : false;
const defaultSite = process.env.DEFAULT_SITE ? process.env.DEFAULT_SITE : "default";
const cacheRoot = path.join(__dirname, 'cache');
const debugRoot = path.join(__dirname, 'debug');
const CONFIG_STORE = "config";

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

function getConfig(subdomain:string) {

    const configPath = path.join(buildPath, CONFIG_STORE);
    try {
        const filepath = path.join(configPath, `${subdomain}.json`);
        const defaultPath = path.join(configPath, `default.json`);
        const exists = fs.existsSync(filepath);
        const json = JSON.parse(fs.readFileSync(exists ? filepath : defaultPath, 'utf-8'));
        if (json) {
            json.name = exists ? subdomain : "default";
            return json.config;
        }
    } catch (err) {
        console.error(`Could not find config at ${configPath}`);
    }

    return undefined;
}

app.get("*", (req, res) => {

    const parts = req.headers.host.split('.');
    const subdomain = parts.length === 3 ? parts[0] : defaultSite;

    if (req.path === "/" || req.path === "/index.html") {
        const config = getConfig(subdomain);
        const indexPath = path.join(buildPath, "index.html");
        fs.readFile(indexPath, "utf8", (err, data) => {
            if (err) {
                res.status(404).send(`${indexPath} couldn't be found`);
            } else {
                // const protocol = req.headers.hasOwnProperty("x-forwarded-proto") ? req.headers["x-forwarded-proto"] : req.protocol;
                // const baseUrl = `${protocol}://${req.headers.host}`;
                console.log("Got config", config);
                const tags = getHeaderTags(config, req.path);

                let content = "";
                tags.forEach(tag=>content += tag.render() + "\n");
                data = data.replace("</head>", `${content}</head>`);

                res.send(data);
            }
        });
    } else {
        const filePath = path.join(buildPath, decodeURI(req.path));
        console.log("Requested", req.path, subdomain);
        res.sendFile(filePath);
    }

});

// start the Express server
app.listen( port, () => {
    // tslint:disable-next-line:no-console
    console.log( `server started at http://localhost:${ port }` );
} );