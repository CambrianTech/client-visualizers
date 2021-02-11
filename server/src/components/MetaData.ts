
// Regex used for verifying room and preview ids
import {BrandConfig} from "../data/DataTypes";
import {HtmlTag, LinkTag, MetaDataTag, HtmlGenericTag} from "./HtmlTag";

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

export function getHeaderTags(config:BrandConfig, path:string) {
    const allTags:HtmlTag[] = [];

    // primary tags:
    const title = config.siteConfig.title ? config.siteConfig.title : config.displayName;
    allTags.push(new HtmlGenericTag("title", title));
    allTags.push(new MetaDataTag("description", config.siteConfig.description));
    allTags.push(new MetaDataTag("HandheldFriendly", "true"));

    const route = path.split('?')[0];
    allTags.push(new MetaDataTag("route", route));

    // icons:
    allTags.push(new LinkTag("shortcut icon", config.siteConfig.favicon));
    allTags.push(new LinkTag("icon", config.siteConfig.favicon, 'sizes="32x32"'));
    if (config.siteConfig.favicon192x192) {
        allTags.push(new LinkTag("icon", config.siteConfig.favicon, 'sizes="192x192"'));
    }
    if (config.siteConfig.appleShareIcon) {
        allTags.push(new LinkTag("apple-touch-icon", config.siteConfig.appleShareIcon));
    }

    // OpenGraph tags
    allTags.push(new MetaDataTag("og:url", path));
    allTags.push(new MetaDataTag("og:type", "website"));
    allTags.push(new MetaDataTag("og:title", config.siteConfig.longTitle ? config.siteConfig.longTitle: title));
    allTags.push(new MetaDataTag("og:description", config.siteConfig.description));

    // site image
    if (config.siteConfig.image) {
        allTags.push(new MetaDataTag("og:image", config.siteConfig.image));
        if (config.siteConfig.imageAlt) {
            allTags.push(new MetaDataTag("og:image:alt", config.siteConfig.imageAlt));
        }
        if (config.siteConfig.imageWidth && config.siteConfig.imageHeight) {
            allTags.push(new MetaDataTag("og:image:width", config.siteConfig.imageWidth));
            allTags.push(new MetaDataTag("og:image:height", config.siteConfig.imageHeight));
        }
    }

    // twitter
    allTags.push(new MetaDataTag("twitter:title", config.siteConfig.longTitle ? config.siteConfig.longTitle: title));
    allTags.push(new MetaDataTag("twitter:description", config.siteConfig.description));
    allTags.push(new MetaDataTag("twitter:site", config.siteConfig.twitterAccount));
    allTags.push(new MetaDataTag("twitter:card", "summary_large_image"));
    if (config.siteConfig.image) {
        allTags.push(new MetaDataTag("twitter:image", config.siteConfig.image));
        if (config.siteConfig.imageAlt) {
            allTags.push(new MetaDataTag("twitter:image:alt", config.siteConfig.imageAlt));
        }
    }

    allTags.push(new HtmlGenericTag("script", `window.siteName="${config.code}"`));
    allTags.push(new HtmlGenericTag("style",
        `:root {
            --mdc-theme-primary:${config.siteConfig.buttonTextColor};
            --mdc-theme-secondary:${config.siteConfig.primaryColor};
            --mdc-theme-inactive:${config.siteConfig.inactiveColor};
        }`));

    return allTags;
}