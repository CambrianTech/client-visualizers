import 'react-app-polyfill/ie9'
import 'react-app-polyfill/stable'
import cssVars from 'css-vars-ponyfill'

import React, {useReducer, useEffect, useCallback, useState, useRef, Dispatch} from "react"
import * as ReactDOM from "react-dom"

import {BrowserRouter as Router, Redirect, Route, Switch} from "react-router-dom"
import {SiteContext, createEmptyState, siteStateReducer, SiteAction} from "./data/SiteContext"
import {BrowserProperties, WebClientInfo} from "react-client-info"

import 'react-circular-progressbar/dist/styles.css'
import '@material/react-button/dist/button.css';
import '@material/react-fab/dist/fab.css';

import * as qs from "querystring";
import {objectToLowerCase, selectScene} from "./utilities/Methods";

import Visualizer from "./pages/Visualizer"

const objectFitImages = require('object-fit-images')

export const api:any = (window as any).cb

export function dispatchDataProperties(basePath:string, data:any, dispatch: Dispatch<SiteAction>) {
    dispatch({
        type: "setSceneData",
        sceneData: {
            backgroundUrl: basePath + "/" + data.images["main"],
            lightingUrl: basePath + "/" + data.images["lighting"],
            masks:{
                "floor": basePath + "/" + data.images["masks"]["floor"]
            }
        }
    })

    dispatch({
        type: "setFov",
        fov: data.fov
    })

    dispatch({
        type: "setPosition",
        position: data.cameraPosition
    })

    dispatch({
        type: "setRotation",
        rotation: [data.cameraRotation[0], data.floorRotation, data.cameraRotation[2]]
    })
}


function App() {
    const initialSiteState = createEmptyState()
    const [siteState, dispatchSiteState] = useReducer(siteStateReducer, initialSiteState)
    const [browserProperties, setBrowserProperties] = useState<BrowserProperties>({})
    // Url load states

    //component mounted:
    useEffect(() => {
        cssVars()
        objectFitImages()

        return () => {
            //unmount
        }
    }, [])

    useEffect(() => {
        if (browserProperties.hasTouchpad) {
            document.documentElement.style.setProperty("--scrollbar-style", "none")
            document.documentElement.style.setProperty("--scrollbar-display", "none")
            document.documentElement.style.setProperty("--scrollbar-thickness", "0px")
        }
    }, [browserProperties.hasTouchpad])

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

    }, [browserProperties.browser])

    // useEffect(() => {
    //     dispatchSiteState({ type: "setBrowserProperties", browserProperties: browserProperties })
    //     setCssVars()
    // }, [browserProperties, setCssVars])

    const updateFromLocation = useCallback((location:any) => {

        // Parse URL search string without the first character (typically question mark).
        // Also turn the keys into lowercase so their case doesn't matter.
        const searchObject = objectToLowerCase(qs.parse(location.search.substr(1)));

        searchObject.rt = "bedroom";
        searchObject.r = "2-bedroom";

        const searchFov = searchObject.f as string;
        if (searchFov) {
            const fov = parseFloat(searchFov)
            if (!siteState.fov || (fov - siteState.fov) > 0.0001) {
                dispatchSiteState({
                    type: "setFov",
                    fov: fov
                })
            }
        }

        const searchPosX = searchObject.px as string
        const searchPosY = searchObject.py as string
        const searchPosZ = searchObject.pz as string
        if (searchPosX && searchPosY && searchPosZ) {
            const px = parseFloat(searchPosX)
            const py = parseFloat(searchPosY)
            const pz = parseFloat(searchPosZ)

            if (!siteState.position || siteState.position[0] - px > 0.0001 || siteState.position[1] - py > 0.0001 || siteState.position[2] - pz > 0.0001) {
                dispatchSiteState({
                    type: "setPosition",
                    position: [px, py, pz]
                })
            }
        }

        const searchRotX = searchObject.rx as string
        const searchRotY = searchObject.ry as string
        const searchRotZ = searchObject.rz as string
        if (searchRotX && searchRotY && searchRotZ) {
            const rx = parseFloat(searchRotX)
            const ry = parseFloat(searchRotY)
            const rz = parseFloat(searchRotZ)

            if (!siteState.rotation || siteState.rotation[0] - rx > 0.0001 || siteState.rotation[1] - ry > 0.0001 || siteState.rotation[2] - rz > 0.0001) {
                dispatchSiteState({
                    type: "setRotation",
                    rotation: [rx, ry, rz]
                })
            }
        }

        const floorRotationOffset = searchObject.fro as string
        if (floorRotationOffset) {
            dispatchSiteState({
                type: "setFloorRotationOffset",
                floorRotationOffset: parseFloat(floorRotationOffset)
            })
        }

        const scene = searchObject.scene as string
        if (scene) {
            selectScene(scene, dispatchSiteState)
        }

        if (searchObject.controls) {
            dispatchSiteState({
                type: "setShowControls",
                showControls: searchObject.controls
            })
        }

        if (searchObject.rt) {
            if (!siteState.selectedSampleRoomType || searchObject.rt !== siteState.selectedSampleRoomType) {
                dispatchSiteState({
                    type: "setSelectedSampleRoomType",
                    selectedSampleRoomType: searchObject.rt as string
                })
            }

            if (searchObject.r && (!siteState.selectedSampleRoom || searchObject.r !== siteState.selectedSampleRoom)) {
                dispatchSiteState({
                    type: "setSelectedSampleRoom",
                    selectedSampleRoom: searchObject.r as string,
                    selectedSamplePath: searchObject.rt as string
                })

                const path = searchObject.rt + "/" + searchObject.r
                const basePath = "assets/scenes/" + path

                fetch(basePath + "/data.json")
                    .then(res => res.json())
                    .then(data => {
                        dispatchDataProperties(basePath, data, dispatchSiteState)
                    })
            }
        }

    }, [siteState.fov, siteState.position, siteState.rotation, siteState.selectedSampleRoom, siteState.selectedSampleRoomType])

    const initialize = useCallback(() => {
        setCssVars()
        window.addEventListener("resize", setCssVars)
        window.addEventListener("orientation", setCssVars)
        window.setInterval(()=>{
            setCssVars()
        }, 500)

        updateFromLocation(window.location)

    }, [setCssVars, updateFromLocation])

    const initializeRef = useRef(initialize);
    useEffect(() => { initializeRef.current = initialize; }, [initialize]);

    useEffect(() => {
        if (initializeRef.current) {
            initializeRef.current()
        }
    }, []);

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
)