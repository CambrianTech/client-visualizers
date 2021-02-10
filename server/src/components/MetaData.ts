
// Regex used for verifying room and preview ids
const idRegex = /^[a-zA-Z0-9]+$/;

// const config = {
//     shortSiteTitle: "Shaw",
//     siteTitle: "Floorvana+ by Shaw",
//     siteDescription: "Take inspiration to the next level. See YOUR room come to life",
//     siteImage: "assets/social/site-image.jpg",
//     siteImageWidth: "1200",
//     siteImageHeight: "1000",
//     siteImageAlt: "Kitchen",
//
//     favicon: "favicon.ico",
//     favicon192x192: "favicon-180x180.png",
//
//     appleShareIcon: "assets/social/apple-touch-icon-180x180.png",
//     twitterAccount: "@shawfloors"
// };

function getTitleDescription(route:string) {

    let title;
    let description;

    switch (route) {
        case "/choose-source":
            description = "Choose an image type, either a sample or an your own uploaded image, to see it visualized";
            break;
        case "/sample-images":
            description = "Choose a room type to see it in the visualizer";
            break;
        case "/sample-image-listing":
            description = "Choose a room to see it in the visualizer";
            break;
        case "/visualizer":
            title = "Check out this flooring I found with the Floorvana+ visualizer by Shaw. What do you think? Feel free to edit and share back.";
            description = "Interactive web visualizer for flooring. Upload your own image to see your space transformed.";
            break;
        default:

    }

    return {"title":title, "description":description}
}

function getPageAttributes(config:any, uploadsBaseUrl:string, path:string, query:any) {

    const titleDesc = getTitleDescription(path);
    let _image;
    let _imageWidth;
    let _imageHeight;
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

export function getMetaTags(config:any, uploadsBaseUrl:string,baseUrl:string, path:string, query:any) {
    let metaTags = "";
    const url = `${baseUrl}${path}`;
    const route = path.split('?')[0];
    const attributes = getPageAttributes(config, uploadsBaseUrl, route, query);

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

    // style:
    if (config.hasOwnProperty("buttonTextColor")) {
        metaTags += `<style>:root {--mdc-theme-primary:${config.buttonTextColor};}</style>`;
    }
    if (config.hasOwnProperty("primaryColor")) {
        metaTags += `<style>:root {--mdc-theme-secondary:${config.primaryColor};}</style>`;
    }
    if (config.hasOwnProperty("inactiveColor")) {
        metaTags += `<style>:root {--mdc-theme-inactive:${config.inactiveColor};}</style>`;
    }

    return metaTags
}