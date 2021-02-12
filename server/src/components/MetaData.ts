
// Regex used for verifying room and preview ids
import {HtmlTag, LinkTag, MetaDataTag, HtmlGenericTag} from "./HtmlTag";
import {SiteConfig} from "cambrian-base";

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
    allTags.push(new LinkTag("icon", `${site.basePath}/${site.config.favicon}`, 'type="image/png"'));
    allTags.push(new LinkTag("shortcut icon", `${site.basePath}/${site.config.favicon}`,'type="image/png"'));
    if (site.config.favicon192x192) {
        allTags.push(new LinkTag("icon", `${site.basePath}/${site.config.favicon}`, 'type="image/png" sizes="192x192"'));
    }
    if (site.config.appleShareIcon) {
        allTags.push(new LinkTag("apple-touch-icon", `${site.basePath}/${site.config.appleShareIcon}`));
    }

    // OpenGraph tags
    allTags.push(new MetaDataTag("og:url", `${site.basePath}/${path}`));
    allTags.push(new MetaDataTag("og:type", "website"));
    allTags.push(new MetaDataTag("og:title", site.config.longTitle ? site.config.longTitle: title));
    allTags.push(new MetaDataTag("og:description", site.config.description));

    // site image
    if (site.config.image) {
        allTags.push(new MetaDataTag("og:image", `${site.basePath}/${site.config.image}`));
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
        allTags.push(new MetaDataTag("twitter:image", `${site.basePath}/${site.config.image}`));
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