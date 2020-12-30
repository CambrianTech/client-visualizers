import 'react-app-polyfill/ie9'
import 'react-app-polyfill/stable'
import cssVars from 'css-vars-ponyfill'

import React, {useReducer, useEffect, useCallback, useState, useRef} from "react"
import * as ReactDOM from "react-dom"

import {BrowserRouter as Router, Redirect, Route, Switch} from "react-router-dom"
import {SiteContext, createEmptyState, siteStateReducer, stateToUrl} from "./data/SiteContext"
import {BrowserProperties, WebClientInfo} from "react-client-info"

import 'react-circular-progressbar/dist/styles.css'
import '@material/react-fab/dist/fab.css';

import * as qs from "querystring";
import {objectToLowerCase, selectScene} from "./utilities/Methods";

import Visualizer from "./pages/Visualizer"

const objectFitImages = require('object-fit-images');

let siteName = (window as any).siteName;

if (!siteName) {
    siteName = process.env.REACT_APP_SITE_NAME ? process.env.REACT_APP_SITE_NAME : "default"
}

const isLocal = process.env.REACT_APP_IS_LOCAL==="1";
export const SITE_PATH = !isLocal && process.env.REACT_APP_SITES_ROOT ? `${process.env.REACT_APP_SITES_ROOT}/${siteName}` : `cambrianar-sites/${siteName}`;
const CONFIG_PATH = `config/${siteName}.json`;

export const getScenePaths = (collectionName?:string, sceneName?:string)=>{
    const basePath = `${SITE_PATH}/scenes/${collectionName}/${sceneName}`;
    return {
        base:basePath,
        data:`${basePath}/data.json`,
        thumbnail:`${basePath}/thumbnail.jpg`,
        preview:`${basePath}/preview.jpg`
    }
};

function App() {
    const initialSiteState = createEmptyState();
    const [siteState, dispatchSiteState] = useReducer(siteStateReducer, initialSiteState);
    const [browserProperties, setBrowserProperties] = useState<BrowserProperties>({});
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

        //load defaults
        fetch(CONFIG_PATH).then(res => res.json())
            .then(json => {
                const config = json.config as any;

                config.basePath = SITE_PATH;

                dispatchSiteState({
                    type: "setSiteData",
                    siteData:json
                });

                if (searchObject.rt && searchObject.r) {
                    loadScene(searchObject.rt, searchObject.r);
                } else if (config.hasOwnProperty("defaultSceneCollection") && config.hasOwnProperty("defaultScene")) {
                    dispatchSiteState({
                        type: "setSelectedSampleRoomType",
                        selectedSampleRoomType: config.defaultSceneCollection
                    });

                    dispatchSiteState({
                        type: "setSelectedSampleRoom",
                        selectedSampleRoom: config.defaultScene
                    });
                }

                if (!document.title && config.hasOwnProperty("siteTitle")) {
                    document.title = config.siteTitle;
                }

                if (config.hasOwnProperty("primaryColor") && !document.documentElement.style.getPropertyValue("--mdc-theme-secondary")) {
                    document.documentElement.style.setProperty("--mdc-theme-secondary", config.primaryColor)
                }

                if (config.hasOwnProperty("inactiveColor") && !document.documentElement.style.getPropertyValue("--mdc-theme-inactive")) {
                    document.documentElement.style.setProperty("--mdc-theme-inactive", config.inactiveColor)
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
            <Route
                render={({ location }) => {
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