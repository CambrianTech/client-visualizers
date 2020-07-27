import React, {createRef, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import 'react-dat-gui/build/react-dat-gui.css'
import './Visualizer.css'

import {
    cbInitialize,
    DataFilter,
    DataItem,
    Product,
    ProductBrand,
    ProductCollection,
    ProductColor, ProductItem,
    SceneCollection,
    SceneInfo,
    SwatchItem
} from "react-home-ar";

import {SiteContext} from '../data/SiteContext';
import MaterialIcon from "@material/react-material-icon";
import {Fab} from "@material/react-fab";
import {
    ImageUpload,
    openImageDialog,
    ProductBreadcrumb,
    UploadProgress,
    VerticalListing,
    VisualizerToolMode,
    VisualizerTools,
    ProductInfo
} from "react-cambrian-ui";
import {Progress} from "../components/Progress";
import orientationImage from "../data/orientation6.jpg";

import {CBMaterialProperties, CBToolMode, CBVisualizer,} from "react-home-harmony";
import {dispatchDataProperties} from "../index";

export enum ServerFile {
    Mask = "mask",
    Preview = "preview",
}

const PANEL_TIMEOUT = 1000;

if (process.env.REACT_APP_CB_GET_UPLOAD_URLS_URL && process.env.REACT_APP_CB_UPLOADS_URL && process.env.REACT_APP_CB_SEGMENT_URL) {
    cbInitialize({
        uploadUrl: process.env.REACT_APP_CB_GET_UPLOAD_URLS_URL,
        projectHostingUrl: process.env.REACT_APP_CB_UPLOADS_URL,
        processingUrl: process.env.REACT_APP_CB_SEGMENT_URL,
        orientationImage:orientationImage,
        uploadNames: [ServerFile.Mask, ServerFile.Preview],
        logLevel:process.env.REACT_APP_CB_LOG_LEVEL
    })
} else {
    throw new Error('REACT_APP_CB_GET_UPLOAD_URLS_URL, REACT_APP_CB_UPLOADS_URL, and REACT_APP_CB_SEGMENT_URL must be defined')
}

export default function Visualizer(props: any) {
    const siteContext = useContext(SiteContext)!;
    const dispatch = siteContext.dispatch;

    const [isToolOverlayOpen, setIsToolOverlayOpen] = useState(false);

    const _isMounted = useRef(false);

    const [showScenes, setShowScenes] = useState(false);

    const [statusText, setStatusText] = useState("");
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [progressVisible, setProgressVisible] = useState(false);

    const [rootItem, setRootItem] = useState<SwatchItem>();

    const [navigationItem, setNavigationItem] = useState<SwatchItem>();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [filters, setFilters] = useState<DataFilter[]>();
    const [listingItems, setListingItems] = useState<SwatchItem[]>();
    const [selectedRow, setSelectedRow] = useState<SwatchItem>();
    const [selectedColumn, setSelectedColumn] = useState<SwatchItem>();
    const [basePath, setBasePath] = useState();
    const [logoPath, setLogoPath] = useState();

    const [sceneListingItems, setSceneListingItems] = useState<SwatchItem[]>();
    const [selectedSceneRow, setSelectedSceneRow] = useState<SwatchItem>();
    const [selectedSceneColumn, setSelectedSceneColumn] = useState<SwatchItem>();

    //legacy stuff:
    const [materialProperties, setMaterialProperies] = useState<CBMaterialProperties>();
    const position = siteContext.state.position || [0, 1, 0];
    const rotation = siteContext.state.rotation || [0, 0, 0];
    const fov = siteContext.state.fov || 60;

    const [rotationControlActive, setRotationControlActive] = useState(false);
    const [rotationControlValue, setRotationControlValue] = useState(0); // Temporary rotation offset (not applied yet)

    const [toolMode, setToolMode] = useState(VisualizerToolMode.None);
    const [historySize] = useState<number>(0);
    const [hasPhotoUpload, setHasPhotoUpload] = useState(false);
    const [hasScenes, setHasScenes] = useState(true);
    const [lightingOffset, setLightingOffset] = useState(0);

    const [, setNeedsUpload] = useState(false);
    const [floorSize, ] = useState([100,100]);
    const [translationControlActive, setTranslationControlActive] = useState(false);
    const floorTranslationOrigin = [0,0,-2]
    const [translationControlValue, setTranslationControlValue] = useState(floorTranslationOrigin); // Temporary rotation offset (not applied yet)

    useEffect(() => {
        _isMounted.current = true;

        fetch('assets/data/products.json').then(res => res.json())
            .then(json => {
                setBasePath(json.basePath);

                if (json.hasOwnProperty("hasPhotoUpload")) {
                    setHasPhotoUpload(json.hasPhotoUpload)
                }

                if (json.hasOwnProperty("hasScenes")) {
                    setHasScenes(json.hasScenes)
                }

                if (json.hasOwnProperty("lightingOffset")) {
                    setLightingOffset(json.lightingOffset)
                }

                if (json.hasOwnProperty("siteLogoImage")) {
                    setLogoPath(json.siteLogoImage)
                }

                const brands:ProductBrand[] = [];
                for (const brandJson of json.brands) {
                    const brand = new ProductBrand();
                    brand.load(brandJson);
                    brands.push(brand)
                }

                let rootItem:SwatchItem = brands[0];
                while (rootItem.children.length === 1) {
                    if (!(rootItem.children[0] instanceof Product)) {
                        rootItem = rootItem.children[0]
                    } else {
                        break;
                    }
                }

                setRootItem(rootItem)
            });

        return () => {
            _isMounted.current = false
        }
    }, []);

    const leftPanel = createRef<HTMLDivElement>();
    const [leftPanelOpen, _setLeftPanelOpen] = useState<boolean>(false);

    const rightPanel = createRef<HTMLDivElement>();
    const [rightPanelOpen, _setRightPanelOpen] = useState<boolean>(false);

    const setPanelOpenClose = useCallback((panel:React.RefObject<HTMLDivElement>, open:boolean) => {
        if (panel.current) {
            panel.current.classList.remove("open");
            if (open) {
                panel.current.classList.add("open")
            } else {
                setShowScenes(false)
            }
        }
        if (panel === leftPanel) {
            _setLeftPanelOpen(open)
        } else {
            _setRightPanelOpen(open)
        }
    }, [leftPanel]);

    const onImageChosen = useCallback((data: any) => {
        console.log(data)
    }, []);

    const onProgress = useCallback((uploadProgress: UploadProgress) => {
        if (!_isMounted.current) return;
        if (uploadProgress.message) {
            setStatusText(uploadProgress.message)
        }
        if (uploadProgress.progress !== undefined) {
            setProgressPercentage(uploadProgress.progress)
        }
        setProgressVisible(uploadProgress.visible);

        if (uploadProgress.error) {
            switch (uploadProgress.error.constructor) {
                case Promise: {
                    const promise = uploadProgress.error as Promise<any>;
                    promise.catch((error: any) => {
                        dispatch({ type: "setError", error: error })
                    });
                    break;
                }
                default: {
                    dispatch({ type: "setError", error: uploadProgress.error })
                }
            }
        }

    }, [dispatch]);

    const resolveThumbnailPath = useCallback((swatchItem:SwatchItem) : string | undefined => {

        if (!(swatchItem instanceof DataItem)) return;

        if (!swatchItem.thumbnail && swatchItem.children.length) {
            return resolveThumbnailPath(swatchItem.children[0])
        }

        const path = `${basePath}/textures/${swatchItem.thumbnail}`;

        return path

    }, [basePath]);

    const showMaterial = useCallback((color:Product|ProductColor) => {

        const albedoPath = `${basePath}/textures/${color.metaData.albedo}`;
        const ppi = color.ppi ? color.ppi : 20;

        const normalsPath = color.metaData.hasOwnProperty("normals") ? `${basePath}/textures/${color.metaData.normals}` : undefined;
        const specularPath = color.metaData.hasOwnProperty("specular") ? `${basePath}/textures/${color.metaData.specular}` : undefined;

        setMaterialProperies(new CBMaterialProperties(ppi, albedoPath, normalsPath, specularPath))

    }, [basePath]);

    const swatchSelected = useCallback((swatchItem:SwatchItem) => {

        if (swatchItem.parent && swatchItem.parent.hasColumns) {
            setSelectedColumn(swatchItem);
        } else {
            setSelectedRow(swatchItem)
        }

    }, []);

    const getScenePath = useCallback((info:SceneInfo)=>{
        const isLocal = info.metaData && info.metaData.hasOwnProperty("isLocal") && info.metaData.isLocal;
        return `${isLocal ? "assets" : basePath}/scenes/${info.collection.name}/${info.name}`
    },[basePath]);

    const resolveSceneThumbnailPath = useCallback((swatchItem:SwatchItem) : string | undefined => {
        if (swatchItem instanceof SceneCollection) {
            const col = swatchItem as SceneCollection;
            if (col.scenes.length) {
                return resolveSceneThumbnailPath(col.scenes[0])
            }
        } else if (swatchItem instanceof SceneInfo) {
            const scene = swatchItem as SceneInfo;
            return `${getScenePath(scene)}/preview.jpg`
        }

        return
    }, [getScenePath]);

    const sceneSelected = useCallback((swatchItem:SwatchItem) => {
        if (swatchItem instanceof SceneInfo) {
            const scene = swatchItem as SceneInfo;
            setSelectedSceneColumn(swatchItem);

            const scenePath = getScenePath(scene);

            fetch(scenePath + "/data.json")
                .then(res => res.json())
                .then(data => {
                    dispatchDataProperties(scenePath, data, siteContext.dispatch)
                })

        } else if (swatchItem instanceof SceneCollection) {
            setSelectedSceneRow(swatchItem)
        }
    }, [getScenePath, siteContext.dispatch]);

    const navClicked = useCallback((swatchItem:SwatchItem) => {
        setListingItems(swatchItem.children);
        setNavigationItem(swatchItem)
    }, []);

    useEffect(()=>{
        if (selectedColumn instanceof Product || selectedColumn instanceof ProductColor) {
            showMaterial(selectedColumn)
        }
    }, [selectedColumn, showMaterial])

    useEffect(() => {
        if (selectedRow && (!selectedColumn || selectedColumn.parent !== selectedRow)) {
            const swatch = selectedRow.children.length ? selectedRow.children[0] : undefined; //or default here
            setSelectedColumn(swatch);
            setPanelOpenClose(leftPanel, true);
        }
    }, [leftPanel, selectedColumn, selectedRow, setPanelOpenClose, swatchSelected])

    useEffect(() => {
        if (rootItem) {
            if (!listingItems) {
                let items = rootItem.children as DataItem[];

                const collection = siteContext.state.selectedCollection ? items.find(item=>item instanceof ProductCollection && item.code === siteContext.state.selectedCollection) as ProductCollection : undefined;
                const product = siteContext.state.selectedProduct ? (collection ? collection.products : items).find(item=>item instanceof Product && item.code === siteContext.state.selectedProduct) as Product : undefined;
                const color = siteContext.state.selectedColor ? (product ? product.colors : items).find(item=>item instanceof ProductColor && item.code === siteContext.state.selectedColor) as ProductColor : undefined;

                let selectedRw:SwatchItem|undefined;
                let selectedCol:SwatchItem|undefined;

                if (color) {
                    selectedCol = color;
                    selectedRw = color.product;
                    items = color.product.collection.products;
                } else if (product) {
                    if (product.hasColumns) {
                        selectedRw = product
                    } else {
                        selectedRw = product.collection;
                        selectedCol = product
                    }

                } else if (collection) {
                    if (collection.hasColumns) {
                        selectedRw = collection
                    } else {
                        selectedRw = collection.brand;
                        selectedCol = collection
                    }
                }

                setListingItems(items);
                setSelectedRow(selectedRw);
                setSelectedColumn(selectedCol);
            }

            if (!sceneListingItems) {
                const brand = (rootItem as DataItem).brand;
                setSceneListingItems(brand.sceneCollections)
            }
        }
    }, [listingItems, rootItem, sceneListingItems, siteContext.state.selectedCollection, siteContext.state.selectedColor, siteContext.state.selectedProduct]);

    const panelMouseTimeout = useRef(0);
    const panelMouseOver = useCallback(() => {
        if (panelMouseTimeout.current) {
            clearTimeout(panelMouseTimeout.current);
            panelMouseTimeout.current = 0
        }
    }, []);

    const panelMouseOut = useCallback(() => {
        if (panelMouseTimeout.current) return;

        if (PANEL_TIMEOUT) {
            panelMouseTimeout.current = setTimeout(()=>{
                setPanelOpenClose(leftPanel, false)
            }, PANEL_TIMEOUT)
        }

    }, [leftPanel, setPanelOpenClose]);


    const allFilters = useMemo<DataFilter[]>(()=>{
        const allFilters:DataFilter[] = filters ? filters:[];

        return allFilters
    }, [filters]);

    const isUploadedImage = useCallback(() => {
        if (siteContext.state.sceneData) {
            return siteContext.state.sceneData.backgroundUrl.indexOf("/scenes/") < 0
        }
        return false
    }, [siteContext.state.sceneData]);

    const cbToolMode = useMemo(()=>{
        switch (toolMode) {
            case VisualizerToolMode.DrawSurface:
                return CBToolMode.Draw;
            case VisualizerToolMode.EraseSurface:
                return CBToolMode.Erase;
            case VisualizerToolMode.Rotate:
                return CBToolMode.Rotate;
            case VisualizerToolMode.Translate:
                return CBToolMode.Translate;
            default:
                return CBToolMode.Select
        }
    }, [toolMode]);

    const isModePermitted = useCallback((mode: VisualizerToolMode) => {
        if (mode === VisualizerToolMode.DrawSurface || mode === VisualizerToolMode.EraseSurface) {
            return isUploadedImage()
        } else if (mode === VisualizerToolMode.Translate) {
            return false
        } else if (mode === VisualizerToolMode.ChoosePhoto) {
            return hasPhotoUpload
        } else if (mode === VisualizerToolMode.ChooseScene) {
            return hasScenes
        }

        return true
    }, [hasPhotoUpload, hasScenes, isUploadedImage]);

    const toolChanged = useCallback((mode: VisualizerToolMode) => {
        if (!_isMounted.current) return;
        setToolMode(mode);

        if (mode === VisualizerToolMode.ChoosePhoto) {
            openImageDialog()
        } else if (mode === VisualizerToolMode.ChooseScene) {
            setShowScenes(true)
        }

        //panels will close for all modes except scenes.
        setPanelOpenClose(leftPanel, mode === VisualizerToolMode.ChooseScene)

    }, [leftPanel, setPanelOpenClose]);

    const toolsShowHideButtons = useCallback((show: boolean) => {
        if (!_isMounted.current) return;
        setIsToolOverlayOpen(!show)
    }, []);

    const rotateChanged = useCallback((radians: number) => {
        if (!_isMounted.current) return;
        setRotationControlActive(true);
        setRotationControlValue(radians)
    }, []);

    const rotateFinished = useCallback((commit: boolean, radians: number) => {
        if (!_isMounted.current) return;
        if (commit) {
            dispatch({
                type: "setRotation",
                rotation: siteContext.state.rotation ? [siteContext.state.rotation[0], radians, siteContext.state.rotation[2]] : [0,radians,0]
            });
            setNeedsUpload(true)
        }
        setRotationControlActive(false)
        setToolMode(VisualizerToolMode.None)

    }, [dispatch, siteContext.state.rotation]);

    const translateChanged = useCallback((xPos: number, yPos: number) => {
        if (!_isMounted.current) return;
        setTranslationControlActive(true);
        setTranslationControlValue([xPos, 0, yPos]);
    }, []);

    const translateFinished = useCallback((commit: boolean, xPos: number, yPos: number) => {
        if (!_isMounted.current) return;
        if (commit) {
            dispatch({
                type: "setFloorTranslation",
                xPos: xPos,
                yPos: yPos
            });
            setNeedsUpload(true)
        }

        setToolMode(VisualizerToolMode.None)
        setTranslationControlActive(false)

    }, [dispatch]);

    const resolveDetailsUrl = useCallback((name:string, url:string)=>{
        //console.log(`${basePath}/textures/${url}`)
        return `${basePath}/textures/${url}`
    }, [basePath]);

    const floorRotation = useMemo(()=>{
        if (rotationControlActive) {
            return rotationControlValue
        }
        else {
            return siteContext.state.rotation ? siteContext.state.rotation[1] : 0
        }
    }, [rotationControlActive, rotationControlValue, siteContext.state.rotation])

    const floorPosition = useMemo(()=>{
        if (translationControlActive) {
            return translationControlValue
        }
        else if (siteContext.state.floorTranslation) {
            return siteContext.state.floorTranslation
        } else {
            return floorTranslationOrigin
        }
    }, [floorTranslationOrigin, siteContext.state.floorTranslation, translationControlActive, translationControlValue])

    const isPortrait = window.innerHeight > window.innerWidth;

    const selectedProduct = selectedColumn instanceof ProductItem ? selectedColumn as ProductItem : undefined;

    return useMemo(() => (
        <div className={"visualizer"}>

            {logoPath && <img className={"floating-logo"} src={`${basePath}/${logoPath}`} alt={"logo"} />}

            <CBVisualizer
                toolMode={cbToolMode}
                canLoad={true}
                material={materialProperties}
                defaultMaterial = {new CBMaterialProperties(20,"assets/scenes/blue-tile.png")}
                scene={siteContext.state.sceneData}
                fov={fov}
                cameraPosition={position}
                cameraRotation={[rotation[0], 0, rotation[2]]}
                floorSize={floorSize}
                floorRotation={floorRotation}
                blendEdges={isUploadedImage()}
                lightingOffset={lightingOffset}
                floorPosition={translationControlActive ? translationControlValue : floorPosition}
                floorPositionUpdated={pos=>translateChanged(pos[0], pos[2])}
                floorRotationUpdated={rot=>rotateChanged(rot)}
                showControls={siteContext.state.showControls} />

            <VisualizerTools
                visible={!isToolOverlayOpen}
                mode={toolMode}
                isModePermitted={isModePermitted}

                changeMode={toolChanged}

                onRotationChanged={rotateChanged}
                onRotationFinished={rotateFinished}

                onTranslationChanged={translateChanged}
                onTranslationFinished={translateFinished}

                initialRotation={floorRotation}
                initialXPos={floorPosition[0]}
                initialYPos={floorPosition[2]}

                minTranslation={[-10, -10]}
                maxTranslation={[10,0]}

                historySize={historySize}
                onShowHideButtons={toolsShowHideButtons}
            />

            <div ref={leftPanel} className={"product-selector"} onMouseOver={panelMouseOver} onMouseOut={panelMouseOut}>
                <div className={"panel"}>
                    <div className={"title"}>
                        <div className={"choose product" + (showScenes ? "" : " selected")} onClick={()=>setShowScenes(false)}>Choose a Product</div>
                        <div className={"choose scene" + (showScenes ? " selected" : "")} onClick={()=>setShowScenes(true)}>Choose a Scene</div>
                    </div>

                    {!showScenes && <ProductBreadcrumb currentItem={navigationItem} onClick={navClicked} />}

                    <VerticalListing visible={!showScenes}
                                     onClick={swatchSelected}
                                     swatches={listingItems}
                                     filters={allFilters}
                                     selectedSwatch={selectedRow}
                                     selectedSubSwatch={selectedColumn}
                                     resolveThumbnailPath={resolveThumbnailPath}/>

                    <VerticalListing visible={showScenes}
                                     onClick={sceneSelected}
                                     swatches={sceneListingItems}
                                     selectedSwatch={selectedSceneRow}
                                     selectedSubSwatch={selectedSceneColumn}
                                     resolveThumbnailPath={resolveSceneThumbnailPath}/>
                </div>
                <div className={"close-button-container"}>
                    <Fab className={"close-button"} onClick={()=>setPanelOpenClose(leftPanel, !leftPanelOpen)} icon={<MaterialIcon icon={leftPanelOpen ? (isPortrait ? "keyboard_arrow_down" : "keyboard_arrow_left") : (isPortrait ? "keyboard_arrow_up" : "keyboard_arrow_right")} />} />
                </div>
            </div>

            {selectedRow && selectedProduct && (
                <div className={"product-name"}>{selectedRow.displayName} - {selectedProduct.displayName}</div>
            )}

            {selectedProduct && selectedProduct.details && (
                <div ref={rightPanel} className="product-details">
                    <div className={"close-button-container"}>
                        <Fab className={"close-button"} onClick={()=>setPanelOpenClose(rightPanel, !rightPanelOpen)} icon={<MaterialIcon icon={rightPanelOpen ? (isPortrait ? "keyboard_arrow_down" : "keyboard_arrow_right") : (isPortrait ? "keyboard_arrow_up" : "keyboard_arrow_left")} />} />
                    </div>
                    <ProductInfo className={"panel"}
                                 product={selectedProduct}
                                 resolveUrl={resolveDetailsUrl} />
                </div>
            )}

            <ImageUpload onImageChosen={onImageChosen} onProgress={onProgress}/>

            <Progress visible={progressVisible} percentage={progressPercentage} statusText={statusText} />
        </div>
    ), [logoPath, basePath, cbToolMode, materialProperties, siteContext.state.sceneData, siteContext.state.showControls, fov, position, rotation, floorSize, floorRotation, isUploadedImage, lightingOffset, translationControlActive, translationControlValue, floorPosition, isToolOverlayOpen, toolMode, isModePermitted, toolChanged, rotateChanged, rotateFinished, translateChanged, translateFinished, historySize, toolsShowHideButtons, leftPanel, panelMouseOver, panelMouseOut, showScenes, navigationItem, navClicked, swatchSelected, listingItems, allFilters, selectedRow, selectedColumn, resolveThumbnailPath, sceneSelected, sceneListingItems, selectedSceneRow, selectedSceneColumn, resolveSceneThumbnailPath, leftPanelOpen, isPortrait, selectedProduct, rightPanel, rightPanelOpen, resolveDetailsUrl, onImageChosen, onProgress, progressVisible, progressPercentage, statusText, setPanelOpenClose])
}
