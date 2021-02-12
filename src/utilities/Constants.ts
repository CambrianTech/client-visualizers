import {CBMaterialProperties} from "react-home-ar";

export enum MediaPaths {
    Images = "assets/img",
    Scenes = "assets/scenes",
    Brands = "brands",
    Textures = "assets/textures",
}

export const MAX_IMAGE_SIZE = 2048;
export const DEFAULT_SCENE = "bedroom/bedroom-3"

export const GRID_MATERIAL:CBMaterialProperties = {
    ppi:13,
    diffuseUrl:"assets/textures/grid.jpg"
};


export const DEFAULT_MATERIAL:CBMaterialProperties = {
    ppi:40,
    diffuseUrl:"assets/textures/concrete/Concrete17_col.jpg",
    normalsUrl:"assets/textures/concrete/Concrete17_nrm.jpg",
    specularUrl:"assets/textures/concrete/Concrete17_rgh.jpg"
};
