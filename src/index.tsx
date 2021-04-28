import 'react-app-polyfill/ie9'
import 'react-app-polyfill/stable'
import cssVars from 'css-vars-ponyfill'

import React, {useReducer, useEffect, useCallback, useState, useRef} from "react"
import * as ReactDOM from "react-dom"

import {BrowserRouter as Router, Redirect, Route, Switch} from "react-router-dom"
import {SiteContext, createEmptyState, siteStateReducer, stateToUrl} from "./data/SiteContext"
import {BrowserProperties, WebClientInfo} from "react-client-info"

import * as qs from "querystring";
import {objectToLowerCase, selectScene} from "./utilities/Methods";

import Visualizer from "./pages/Visualizer"
import {ApiCapabilityName, FeatureAppearanceConfig, SiteConfig} from "cambrian-base";

const objectFitImages = require('object-fit-images');

export let siteName = (window as any).siteName;

if (!siteName) {
    siteName = process.env.REACT_APP_SITE_NAME ? process.env.REACT_APP_SITE_NAME : "default"
}

const isLocal = process.env.REACT_APP_IS_LOCAL==="1";
export const SITE_PATH = !isLocal && process.env.REACT_APP_SITES_ROOT ? `${process.env.REACT_APP_SITES_ROOT}/${siteName}` : `cambrianar-sites/${siteName}`;
const CONFIG_PATH = `config/${siteName}.json`;

export const isFeatureEnabled = (siteData:SiteConfig, name:ApiCapabilityName):boolean => {
    const feature = siteData.features.find(f=>f.name === name);
    return feature ? feature.enabled : false;
};

export const getFeatureAppearance = (siteData:SiteConfig, name:ApiCapabilityName, defaultAppearance:FeatureAppearanceConfig) => {
    let match:FeatureAppearanceConfig | undefined
    if (siteData.appearance.features) {
        match = siteData.appearance.features.find(f=>f.name === name);
    }
    return match ? match : defaultAppearance
};

export type RoomPaths = {
    base:string,
    data:string,
    thumbnail:string,
    preview:string
}

export const getScenePaths = (collectionName?:string, sceneName?:string):RoomPaths =>{
    const basePath = `${SITE_PATH}/scenes/${collectionName}/${sceneName}`;
    return {
        base:basePath,
        data:`${basePath}/data.json`,
        thumbnail:`${basePath}/thumbnail.jpg`,
        preview:`${basePath}/preview.jpg`
    }
};

export const getUploadedRoomPaths = (roomID?:string):RoomPaths=>{
    const basePath = `${process.env.REACT_APP_CB_UPLOADS_URL}/${roomID}`;
    return {
        base:basePath,
        data:`${basePath}/data_v3.json`,
        thumbnail:`${basePath}/thumbnail.jpg`,
        preview:`${basePath}/preview.jpg`
    }
};

function App() {
    const initialSiteState = createEmptyState();
    const [siteState, dispatchSiteState] = useReducer(siteStateReducer, initialSiteState);
    const [browserProperties, setBrowserProperties] = useState<BrowserProperties>({});
    const [customStylesheet, setCustomStylesheet] = useState<string>()
    // Url load states

    //component mounted:
    useEffect(() => {
        cssVars();
        objectFitImages();

        return () => {
            //unmount
        }
    }, []);

    useEffect(() => {
        if (browserProperties.hasTouchpad) {
            document.documentElement.style.setProperty("--scrollbar-style", "none");
            document.documentElement.style.setProperty("--scrollbar-display", "none");
            document.documentElement.style.setProperty("--scrollbar-thickness", "0px")
        }
    }, [browserProperties.hasTouchpad]);

    const setCssVars = useCallback(() => {
        if (!browserProperties.browser) return;

        const doc = document.documentElement;

        //without this check, causes WebGL flicker on desktop
        const width = window.innerWidth;
        const height = window.innerHeight;

        doc.style.setProperty("--app-height",  `${height}px`);
        doc.style.setProperty("--inverse-app-height", `${-height}px`);
        doc.style.setProperty("--half-app-height", `${height / 2}px`);
        doc.style.setProperty("--inverse-half-app-height", `${-height / 2}px`);
        doc.style.setProperty("--app-width", `${width}px`);
        doc.style.setProperty("--inverse-app-width", `${-width}px`)

    }, [browserProperties.browser]);

    useEffect(() => {
        dispatchSiteState({ type: "setBrowserProperties", browserProperties: browserProperties });
        setCssVars();
    }, [browserProperties, setCssVars]);

    const loadScene = useCallback((collection:string, scene:string)=> {

        dispatchSiteState({
            type: "setSelectedSampleRoomType",
            selectedSampleRoomType: collection as string
        });

        dispatchSiteState({
            type: "setSelectedSampleRoom",
            selectedSampleRoom: scene as string,
        });

    }, []);

    const updateFromLocation = useCallback((location:any) => {

        // Parse URL search string without the first character (typically question mark).
        // Also turn the keys into lowercase so their case doesn't matter.
        const searchObject = objectToLowerCase(qs.parse(location.search.substr(1)));

        const scene = searchObject.scene as string;
        if (scene) {
            selectScene(scene, dispatchSiteState)
        }

        if (searchObject.controls) {
            dispatchSiteState({
                type: "setShowControls",
                showControls: searchObject.controls
            })
        }

        if (searchObject.collection) {
            dispatchSiteState({
                type: "setCollection",
                code:searchObject.collection
            })
        }

        if (searchObject.product) {
            dispatchSiteState({
                type: "setProduct",
                code:searchObject.product
            })
        }

        if (searchObject.color) {
            dispatchSiteState({
                type: "setColor",
                code:searchObject.color
            })
        }

        if (searchObject.room) {
            dispatchSiteState({
                type: "setSelectedRoom",
                selectedRoom: searchObject.room
            });
        } else if (searchObject.r && searchObject.rt) {
            dispatchSiteState({
                type: "setSelectedSampleRoomType",
                selectedSampleRoomType: searchObject.rt
            });

            dispatchSiteState({
                type: "setSelectedSampleRoom",
                selectedSampleRoom: searchObject.r,
            });
        }

        //load defaults
        fetch(CONFIG_PATH).then(res => res.json())
            .then(json => {
                const config = json as SiteConfig;

                dispatchSiteState({
                    type: "setSiteData",
                    siteData:json
                });

                if (searchObject.rt && searchObject.r) {
                    loadScene(searchObject.rt, searchObject.r);
                }

                // if (!document.title && config.appearance.header) {
                //     const header = getHeader(config.appearance.header, "/");
                //     if (header) {
                //         document.title = header.title;
                //     }
                // }

                if (!document.documentElement.style.getPropertyValue("--mdc-theme-primary")) {
                    document.documentElement.style.setProperty("--mdc-theme-primary", config.appearance.primaryColor)
                }

                if (!document.documentElement.style.getPropertyValue("--mdc-theme-on-primary")) {
                    document.documentElement.style.setProperty("--mdc-theme-on-primary", config.appearance.primaryTextColor)
                }

                if (!document.documentElement.style.getPropertyValue("--mdc-theme-secondary")) {
                    document.documentElement.style.setProperty("--mdc-theme-secondary", config.appearance.secondaryColor)
                }

                if (!document.documentElement.style.getPropertyValue("--mdc-theme-on-secondary")) {
                    document.documentElement.style.setProperty("--mdc-theme-on-secondary", config.appearance.secondaryTextColor)
                }

                if (!document.documentElement.style.getPropertyValue("--mdc-theme-surface")) {
                    document.documentElement.style.setProperty("--mdc-theme-surface", config.appearance.surfaceColor)
                }

                if (!document.documentElement.style.getPropertyValue("--mdc-theme-on-surface")) {
                    document.documentElement.style.setProperty("--mdc-theme-on-surface", config.appearance.surfaceTextColor)
                }

                if (!document.documentElement.style.getPropertyValue("--mdc-theme-inactive")) {
                    document.documentElement.style.setProperty("--mdc-theme-inactive", config.appearance.inactiveColor)
                }

                if (config.appearance.customStylesheet) {
                    setCustomStylesheet(`${SITE_PATH}/${config.appearance.customStylesheet}`)
                }

            });

    }, [loadScene]);

    const initialize = useCallback(() => {
        setCssVars();
        window.addEventListener("resize", setCssVars);
        window.addEventListener("orientation", setCssVars);
        window.setInterval(()=>{
            setCssVars()
        }, 500);

        updateFromLocation(window.location)

    }, [setCssVars, updateFromLocation]);

    const initializeRef = useRef(initialize);
    useEffect(() => { initializeRef.current = initialize; }, [initialize]);

    useEffect(() => {
        if (initializeRef.current) {
            initializeRef.current()
        }
    }, []);

    useEffect(() => {
        const url = stateToUrl(siteState, true);
        if (url !== window.history.state) {
            window.history.replaceState({}, "", url)
        }
    }, [siteState]);

    return (
        <Router>
            <link rel="stylesheet" href={customStylesheet} />
            <Route
                render={({ // @ts-ignore
                             location }) => {
                    return (
                        <SiteContext.Provider value={{ state: siteState, dispatch: dispatchSiteState }}>
                            <WebClientInfo onClientStateChanged={setBrowserProperties} />
                            <Switch location={location}>
                                <Route exact path="/" component={Visualizer} />
                                <Route>
                                    <Redirect to="/"/>
                                </Route>
                            </Switch>
                        </SiteContext.Provider>
                    )
                }}
            />
        </Router>
    )

}

ReactDOM.render(
    <App />,
    document.getElementById("root")
);