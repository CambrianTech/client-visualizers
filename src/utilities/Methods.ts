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