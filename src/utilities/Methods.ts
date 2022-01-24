import {Dispatch} from "react";
import {SiteAction} from "../data/SiteContext";
import {MediaPaths} from "./Constants";

export function dispatchDataProperties(basePath:string|undefined, data:any, dispatch: Dispatch<SiteAction>) {
    // dispatch({
    //     type: "setSceneData",
    //     sceneData: {
    //         backgroundUrl: basePath + "/" + data.images["main"],
    //         lightingUrl: basePath + "/" + data.images["lighting"],
    //         masks:{
    //             "floor": basePath + "/" + data.images["masks"]["floor"]
    //         },
    //         ancorPoint:[0,0.75]
    //     },
    // });

    dispatch({
        type: "setFov",
        fov: data.fov
    });

    dispatch({
        type: "setPosition",
        position: data.cameraPosition
    });

    dispatch({
        type: "setRotation",
        rotation: [data.cameraRotation[0], -data.floorRotation, data.cameraRotation[2]]
    })
}

export function selectScene(path: string, dispatch: Dispatch<SiteAction>) {
    const jsonPath = MediaPaths.Scenes + "/" + path + "/data.json";
    fetch(jsonPath).then(res => res.json())
        .then(data => {
            dispatchDataProperties(MediaPaths.Scenes + "/" + path, data, dispatch)
        })
}

export function objectToLowerCase(object: any) {
    const newObject: any = {};

    for (const key of Object.keys(object)) {
        newObject[key.toLocaleLowerCase()] = object[key]
    }

    return newObject
}

function fallbackCopyTextToClipboard(text: string) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        const msg = successful ? 'successful' : 'unsuccessful';
    } catch (err) {
        //Do we have an error handler?
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}

export function copyTextToClipboard(text: string) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function() {
    }, function(err) {
        //Do we have an error handler?
        console.error('Async: Could not copy text: ', err);
    });
}

export function download(url: string, filename: string) {
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
        })
        .catch(console.error);
}
