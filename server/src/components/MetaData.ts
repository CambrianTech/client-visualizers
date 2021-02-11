
// Regex used for verifying room and preview ids
import {SiteConfig} from "../data/DataTypes";
import {HtmlTag, LinkTag, MetaDataTag, HtmlGenericTag} from "./HtmlTag";

const idRegex = /^[a-zA-Z0-9]+$/;

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

export function getHeaderTags(site:SiteConfig, path:string) {
    const allTags:HtmlTag[] = [];

    // primary tags:
    const title = site.config.title ? site.config.title : site.displayName;
    allTags.push(new HtmlGenericTag("title", title));
    allTags.push(new MetaDataTag("description", site.config.description));
    allTags.push(new MetaDataTag("HandheldFriendly", "true"));

    const route = path.split('?')[0];
    allTags.push(new MetaDataTag("route", route));

    // icons:
    allTags.push(new LinkTag("shortcut icon", site.config.favicon));
    allTags.push(new LinkTag("icon", site.config.favicon, 'sizes="32x32"'));
    if (site.config.favicon192x192) {
        allTags.push(new LinkTag("icon", site.config.favicon, 'sizes="192x192"'));
    }
    if (site.config.appleShareIcon) {
        allTags.push(new LinkTag("apple-touch-icon", site.config.appleShareIcon));
    }

    // OpenGraph tags
    allTags.push(new MetaDataTag("og:url", path));
    allTags.push(new MetaDataTag("og:type", "website"));
    allTags.push(new MetaDataTag("og:title", site.config.longTitle ? site.config.longTitle: title));
    allTags.push(new MetaDataTag("og:description", site.config.description));

    // site image
    if (site.config.image) {
        allTags.push(new MetaDataTag("og:image", site.config.image));
        if (site.config.imageAlt) {
            allTags.push(new MetaDataTag("og:image:alt", site.config.imageAlt));
        }
        if (site.config.imageWidth && site.config.imageHeight) {
            allTags.push(new MetaDataTag("og:image:width", site.config.imageWidth));
            allTags.push(new MetaDataTag("og:image:height", site.config.imageHeight));
        }
    }

    // twitter
    allTags.push(new MetaDataTag("twitter:title", site.config.longTitle ? site.config.longTitle: title));
    allTags.push(new MetaDataTag("twitter:description", site.config.description));
    allTags.push(new MetaDataTag("twitter:site", site.config.twitterAccount));
    allTags.push(new MetaDataTag("twitter:card", "summary_large_image"));
    if (site.config.image) {
        allTags.push(new MetaDataTag("twitter:image", site.config.image));
        if (site.config.imageAlt) {
            allTags.push(new MetaDataTag("twitter:image:alt", site.config.imageAlt));
        }
    }

    allTags.push(new HtmlGenericTag("script", `window.siteName="${site.code}"`));
    allTags.push(new HtmlGenericTag("style",
        `:root {
            --mdc-theme-primary:${site.config.buttonTextColor};
            --mdc-theme-secondary:${site.config.primaryColor};
            --mdc-theme-inactive:${site.config.inactiveColor};
        }`));

    return allTags;
}