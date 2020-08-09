const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");

// Load env vars from .env file
require("dotenv").config();

const app = express();

// Regex used for verifying room and preview ids
const idRegex = /^[a-zA-Z0-9]+$/;

const uploadsBaseUrl = process.env.CB_UPLOADS_URL;
if (!uploadsBaseUrl) {
    throw new Error("CB_UPLOADS_URL not set.")
}


const CONFIG_STORE = "config";

function getTitleDescription(route) {

    let title = undefined;
    let description = undefined;

    return {"title":title, "description":description}
}

function getPageAttributes(config, path, query) {

    const titleDesc = getTitleDescription(path);
    let _image = undefined;
    let _imageWidth = undefined;
    let _imageHeight = undefined;
    if (query.room && query.subroom && idRegex.test(query.room) && idRegex.test(query.subroom)) {
        _image = `${uploadsBaseUrl}/${query.room}/${query.subroom}/preview`;
        if (query.pw && query.ph) {
            _imageWidth = query.pw;
            _imageHeight = query.ph
        }
    }

    const pageAttributes = {
        title: titleDesc.title ? `${titleDesc.title} - ${config.shortSiteTitle}` : config.siteTitle,
        longTitle: titleDesc.title ? titleDesc.title : config.siteTitle,
        description: titleDesc.description  ? titleDesc.description : config.siteDescription,
        image: _image ? _image : `${config.basePath}/${config.siteImage}`,
        imageWidth: _image ? _imageWidth : config.siteImageWidth,
        imageHeight: _image ? _imageHeight : config.siteImageHeight,
        imageAlt: _image ? undefined : config.siteImageAlt,
    };

    return pageAttributes
}

function getMetaTags(config, baseUrl, path, query) {
    let metaTags = "";
    const url = `${baseUrl}${path}`;
    const route = path.split('?')[0];
    const attributes = getPageAttributes(config, route, query);

    metaTags += `<meta property="route" content="${route}" />`;

    // General tags
    metaTags += `<title>${attributes.title}</title>`;
    metaTags += `<meta name="HandheldFriendly" content="true">`;
    metaTags += `<meta name="description" content="${attributes.description}" />`;


    metaTags += `<link rel="shortcut icon" sizes="32x32" href="${config.basePath}/${config.favicon}" />`;
    metaTags += `<link rel="icon" sizes="32x32" href="${config.basePath}/${config.favicon}" />`;
    metaTags += `<link rel="icon" sizes="192x192" href="${config.basePath}/${config.favicon192x192}" />`;
    metaTags += `<link rel="apple-touch-icon" href="${config.basePath}/${config.appleShareIcon}" />`;


    // OpenGraph tags
    metaTags += `<meta property="og:url" content="${url}" />`;
    metaTags += `<meta property="og:type" content="website" />`;
    metaTags += `<meta property="og:title" content="${attributes.longTitle}" />`;
    metaTags += `<meta property="og:description" content="${attributes.description}" />`;
    metaTags += `<meta property="og:image" content="${attributes.image}" />`;

    if (attributes.imageWidth && attributes.imageHeight) {
        metaTags += `<meta property="og:image:width" content="${attributes.imageWidth}" />`;
        metaTags += `<meta property="og:image:height" content="${attributes.imageHeight}" />`;
    }

    // Twitter tags
    metaTags += `<meta name="twitter:title" content="${attributes.longTitle}" />`;
    metaTags += `<meta name="twitter:description" content="${attributes.description}" />`;
    metaTags += `<meta name="twitter:image" content="${attributes.image}" />`;
    metaTags += `<meta name="twitter:card" content="summary_large_image" />`;

    if (attributes.imageAlt) {
        metaTags += `<meta property="twitter:image:alt" content="${attributes.imageAlt}" />`;
        metaTags += `<meta property="og:image:alt" content="${attributes.imageAlt}" />`;
    }

    metaTags += `<meta name="twitter:site" content="${config.twitterAccount}" />`;

    //style:
    if (config.hasOwnProperty("primaryColor")) {
        metaTags += `<style>:root {--mdc-theme-secondary:${config.primaryColor};}</style>`;
    }
    if (config.hasOwnProperty("inactiveColor")) {
        metaTags += `<style>:root {--mdc-theme-inactive:${config.inactiveColor};}</style>`;
    }

    return metaTags
}

function getConfig(subdomain) {

    try {
        const configPath = path.join(__dirname, CONFIG_STORE);
        const filepath = path.join(configPath, `${subdomain}.json`);
        const defaultPath = path.join(configPath, `default.json`);
        const exists = fs.existsSync(filepath);
        const json = JSON.parse(fs.readFileSync(exists ? filepath : defaultPath, 'utf-8'));
        if (json) {
            json.name = exists ? subdomain : "default";
            return json.config;
        }
    } catch (err) {

    }

    return undefined;
}

app.get("*", function (req, res) {
    const parts = req.headers.host.split('.');
    const subdomain = parts.length === 3 ? parts[0] : req.headers.host;

    const config = getConfig(subdomain);

    fs.readFile(path.join(__dirname, "build", "index.html"), "utf8", function (err, data) {
        if (err) {
            res.sendStatus(404);
        } else {
            const protocol = req.headers.hasOwnProperty("x-forwarded-proto") ? req.headers["x-forwarded-proto"] : req.protocol;
            const baseUrl = `${protocol}://${req.headers.host}`;

            let metaTags = config ? getMetaTags(config, baseUrl, req.originalUrl, req.query) : "";
            metaTags += `<script>window.siteName="${config.name}"</script>`;

            data = data.replace("</head>", `${metaTags}</head>`);

            res.send(data);
        }
    });
});

http.createServer(app).listen(3000);