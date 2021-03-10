import {createContext, Dispatch} from "react"
import {CBARSceneProperties, CBContentManager, CBMaterialProperties} from "react-home-ar";
import { polyfill } from "smoothscroll-polyfill"
import {BrowserProperties} from "react-client-info";
import * as qs from "querystring";
import {SiteConfig} from "cambrian-base";

polyfill();

export function getSubdomain() {
    const parts = window.location.host.split('.');
    const subdomain =  parts.length === 3 ? parts[0] : false;
    if (subdomain && subdomain.length > 0 && subdomain !== "www" && subdomain !== "dev-staging" && subdomain !== "stg" && subdomain !== "staging") {
        return subdomain
    }
    return null
}

export type DerivedSiteState = {
    browserProperties: BrowserProperties,
    error: Error | null
    siteData: SiteConfig | undefined
}

export type SharableVisualizerState = {
    selectedCollection: string | null
    selectedProduct: string | null
    selectedColor: string | null
    selectedSampleRoom: string | null
    selectedSampleRoomType: string | null
    selectedRoom:string|null
}

export type DerivedVisualizerState = {
    sceneData:CBARSceneProperties | undefined
    materialProperties: CBMaterialProperties | null
    onMaterialTextureChanged: ((path: string) => (void)) | null
    previewWidth: number | null
    previewHeight: number | null
    showControls?: boolean | undefined
}

export type SiteState = DerivedSiteState & SharableVisualizerState & DerivedVisualizerState

export type SiteStateContext = {
    state: SiteState
    dispatch: Dispatch<SiteAction>
}

export function createEmptyState(): SiteState {
    return {
        // shared
        selectedCollection:null,
        selectedProduct:null,
        selectedColor:null,

        browserProperties: {},
        error: null,
        siteData:undefined,

        // Visualizer shared
        selectedSampleRoom: null,
        selectedSampleRoomType: null,
        selectedRoom:null,

        // Visualizer derived
        sceneData: undefined,
        materialProperties: null,
        onMaterialTextureChanged: null,
        previewWidth: null,
        previewHeight: null,
        showControls: undefined
    }
}

function createUndefinedStateContext(): SiteStateContext | undefined {
    return undefined
}


export type SiteActionSetBrowserProperties = {
    type: "setBrowserProperties"
    browserProperties: BrowserProperties
}

export type SiteActionSetError = {
    type: "setError"
    error: Error | null
}

export type SiteActionSetCollection = {
    type: "setCollection"
    code: string | null
}

export type SiteActionSetProduct = {
    type: "setProduct"
    code: string | null
}

export type SiteActionSetColor = {
    type: "setColor"
    code: string | null
}

export type SiteActionSetSiteData = {
    type: "setSiteData"
    siteData: SiteConfig
}

export type SiteActionSetSceneData = {
    type: "setSceneData"
    sceneData: CBARSceneProperties | undefined
}

export type SiteActionSetSelectedSampleRoom = {
    type: "setSelectedSampleRoom"
    selectedSampleRoom: string | null
}

export type SiteActionSetSelectedSampleRoomType = {
    type: "setSelectedSampleRoomType"
    selectedSampleRoomType: string | null
}

export type SiteActionSetSelectedRoom = {
    type: "setSelectedRoom"
    selectedRoom: string | null
}

export type SiteActionClearRoomData = {
    type: "clearRoomData"
}

export type SiteActionSetFov = {
    type: "setFov"
    fov: number | null
}

export type SiteActionSetPosition = {
    type: "setPosition"
    position: [number, number, number] | null
}

export type SiteActionSetRotation = {
    type: "setRotation"
    rotation: [number, number, number] | null
}

export type SiteActionSetShowControls = {
    type: "setShowControls"
    showControls: boolean | undefined
}

export type ShawActionSetFloorTranslation = {
    type: "setFloorTranslation"
    xPos: number | null
    yPos: number | null
}

export type SiteAction = SiteActionSetBrowserProperties | SiteActionSetError | SiteActionSetSceneData | SiteActionSetFov |
    SiteActionSetPosition | SiteActionSetRotation | SiteActionSetShowControls | ShawActionSetFloorTranslation
    | SiteActionSetSelectedSampleRoom | SiteActionSetSelectedSampleRoomType | SiteActionSetSelectedRoom | SiteActionClearRoomData
    | SiteActionSetCollection | SiteActionSetProduct | SiteActionSetColor | SiteActionSetSiteData;

export function siteStateReducer(state: SiteState, action: SiteAction): SiteState {
    // Set the thing we are supposed to set. Also make sure anything depending
    // on the thing we set gets reset to null.
    const newState: SiteState = { ...state };

    switch (action.type) {
        // Site underived, null everything below in the hierarchy
        case "setBrowserProperties":
            newState.browserProperties = action.browserProperties;
            break;
        case "setError":
            newState.error = action.error;
            break;

        // Visualizer derived
        case "setSceneData":
            newState.sceneData = action.sceneData;
            break;
        case "setShowControls":
            newState.showControls = action.showControls;
            break;

        case "setSelectedSampleRoom":
            newState.selectedSampleRoom = action.selectedSampleRoom;
            break;
        case "setSelectedSampleRoomType":
            newState.selectedSampleRoomType = action.selectedSampleRoomType;
            break;
        case "setSelectedRoom":
            newState.selectedRoom = action.selectedRoom;
            break;
        case "clearRoomData":
            newState.selectedSampleRoomType = null;
            newState.selectedSampleRoom = null;
            newState.selectedRoom = null;
            break;

        case "setCollection":
            newState.selectedCollection = action.code;
            break;
        case "setProduct":
            newState.selectedProduct = action.code;
            break;
        case "setColor":
            newState.selectedColor = action.code;
            break;

        case "setSiteData":
            newState.siteData = action.siteData;
            break;

        default:
            throw new Error("Invalid action: " + JSON.stringify(action))
    }

    return newState
}

export function stateToUrl(shawState: SiteState, includeSceneParams?:boolean) {
    // Check if current search parameters are the same as the one cosntructed from search.
    // If not, modify the URL without navigating to it.

    const searchObject: any = {};

    if (shawState.selectedCollection) {
        searchObject.collection = shawState.selectedCollection
    }

    if (shawState.selectedProduct) {
        searchObject.product = shawState.selectedProduct
    }

    if (shawState.selectedColor) {
        searchObject.color = shawState.selectedColor
    }

    if (shawState.selectedSampleRoomType) {
        searchObject.rt = shawState.selectedSampleRoomType
    }
    if (shawState.selectedSampleRoom) {
        searchObject.r = shawState.selectedSampleRoom
    }
    else if (shawState.selectedRoom) {
        CBContentManager.default.synchronize(searchObject);
        searchObject.room = shawState.selectedRoom
    }

    if (includeSceneParams) {
        // Only copy fov / pos / rot for uploaded rooms as we can load them
        // ourselves for sample rooms.
        if (shawState.previewWidth && shawState.previewHeight) {
            searchObject.pw = shawState.previewWidth.toFixed(0);
            searchObject.ph = shawState.previewHeight.toFixed(0);
        }
    }

    if (shawState.showControls) {
        searchObject.controls = 1
    }


    let search = qs.stringify(searchObject);
    if (search.length > 0) {
        search = `?${search}`
    }

    return `${window.location.origin}${window.location.pathname}${search}`
}


export const SiteContext = createContext(createUndefinedStateContext());

export function redirectKeepSearch(props: any, target: string) {
    // Important: in the useEffect in index.tsx we listen to state changes and change
    // the window's history with pushState. This is not the same history as react's
    // so we need to use the search of the window here.
    // Ideally we modify react's history in index.tsx instead.
    const url = `${target}${window.location.search}`;
    props.history.push(url)
}
