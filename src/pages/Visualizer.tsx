import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import 'react-dat-gui/build/react-dat-gui.css'
import './Visualizer.css'

import {
    cbInitialize,
    DataFilter,
    DataItem,
    Product,
    ProductBrand,
    ProductCollection,
    ProductColor,
    ProductItem,
    SceneCollection,
    SceneInfo,
    SwatchItem
} from "react-home-ar";

import {SiteContext} from '../data/SiteContext';
import MaterialIcon from "@material/react-material-icon";
import {Fab} from "@material/react-fab";
import {
    ImageProperties,
    ImageUpload,
    openImageDialog,
    ProductBreadcrumb,
    ProductInfo,
    SharePanel,
    UploadProgress,
    VerticalListing,
    VisualizerToolMode,
    VisualizerTools
} from "react-cambrian-ui";
import {Progress} from "../components/Progress";
import orientationImage from "../data/orientation6.jpg";

import {
    CBContentManager,
    CBMaterialProperties,
    CBMethods,
    CBSceneData,
    CBToolMode,
    CBVisualizer,
} from "react-home-harmony";
import {CONFIG_PATH, dispatchSceneProperties} from "../index";

export enum ServerFile {
    Mask = "mask",
    Preview = "preview",
}

enum Panel {
    None,
    Products,
    Scenes,
    ProductInfo,
    Share
}

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

    const [activePanel, setActivePanel] = useState(Panel.None);

    const [statusText, setStatusText] = useState("");
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [progressVisible, setProgressVisible] = useState(false);

    const [rootItem, setRootItem] = useState<SwatchItem>();

    const [navigationItem, setNavigationItem] = useState<SwatchItem>();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [filters, ] = useState<DataFilter[]>();
    const [listingItems, setListingItems] = useState<SwatchItem[]>();
    const [selectedRow, setSelectedRow] = useState<SwatchItem>();
    const [selectedColumn, setSelectedColumn] = useState<SwatchItem>();

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
    const [config, setConfig] = useState<any>(undefined);

    const [, setNeedsUpload] = useState(false);
    const [floorSize, ] = useState([100,100]);
    const [translationControlActive, setTranslationControlActive] = useState(false);
    const floorTranslationOrigin = [0,0,-2];
    const [translationControlValue, setTranslationControlValue] = useState(floorTranslationOrigin); // Temporary rotation offset (not applied yet)

    const selectedProduct = useMemo(()=>{
        return selectedColumn instanceof ProductItem ? selectedColumn as ProductItem : undefined;
    }, [selectedColumn]);

    const selectedProductIsLight = useMemo(()=>{
        if (selectedProduct && selectedProduct.metaData.hasOwnProperty("isLightColor")) {
            return selectedProduct.metaData.isLightColor;
        }
        return false;
    }, [selectedProduct]);

    const hasShare = useMemo(()=>{
        if (config && selectedProduct) {
            return config.hasOwnProperty("hasShare") ? config.hasShare : true;
        }
        return false
    },[config, selectedProduct]);

    const api = useRef<CBMethods>();
    const scene = useRef<CBSceneData>();

    const isMobile = useMemo(()=>{
        return siteContext.state.browserProperties.isPortrait;
    }, [siteContext.state.browserProperties.isPortrait]);

    const isPortrait = useMemo(()=>{
        return siteContext.state.browserProperties.isPortrait
    }, [siteContext.state.browserProperties.isPortrait]);

    const defaultLeftPanel = useMemo(()=>{
        if (isPortrait) {
            return Panel.None
        } else {
            return Panel.Products
        }
    }, [isPortrait]);

    const defaultRightPanel = useMemo(()=>{
        if (isPortrait) {
            return Panel.None
        } else {
            return Panel.ProductInfo
        }
    }, [isPortrait]);

    useEffect(()=>{
        if (isPortrait) {
            setActivePanel(Panel.None)
        } else {
            setActivePanel(Panel.Products)
        }
    }, [isPortrait]);


    useEffect(() => {
        _isMounted.current = true;

        fetch(CONFIG_PATH).then(res => res.json())
            .then(json => {

                if (json.hasOwnProperty("config")) {
                    setConfig(json.config)
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

    const onImageChosen = useCallback((data: ImageProperties) => {
        dispatchSceneProperties(data, siteContext.dispatch);
        setNeedsUpload(true);
    }, [siteContext.dispatch]);

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

        if (!config || !(swatchItem instanceof DataItem)) return;

        if (!swatchItem.thumbnail && swatchItem.children.length) {
            return resolveThumbnailPath(swatchItem.children[0])
        }

        return `${config.basePath}/textures/${swatchItem.thumbnail}`;

    }, [config]);

    const showMaterial = useCallback((color:Product|ProductColor) => {
        if (!config) return;

        const albedoPath = `${config.basePath}/textures/${color.metaData.albedo}`;
        const ppi = color.ppi ? color.ppi : 20;

        const normalsPath = !isMobile && color.metaData.hasOwnProperty("normals") ? `${config.basePath}/textures/${color.metaData.normals}` : undefined;
        const specularPath = !isMobile && color.metaData.hasOwnProperty("specular") ? `${config.basePath}/textures/${color.metaData.specular}` : undefined;

        setMaterialProperies(new CBMaterialProperties(ppi, albedoPath, normalsPath, specularPath))

    }, [config, isMobile]);

    const swatchSelected = useCallback((swatchItem:SwatchItem) => {

        if (swatchItem.parent && swatchItem.parent.hasColumns) {
            setSelectedColumn(swatchItem);
        } else {
            setSelectedRow(swatchItem)
        }

    }, []);

    const getScenePath = useCallback((info:SceneInfo)=>{
        if (!config) return undefined;
        const isLocal = info.metaData && info.metaData.hasOwnProperty("isLocal") && info.metaData.isLocal;
        return `${isLocal ? "assets" : config.basePath}/scenes/${info.collection.name}/${info.name}`
    },[config]);

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

            if (scenePath) {
                fetch(scenePath + "/data.json")
                    .then(res => res.json())
                    .then(data => {
                        dispatchSceneProperties(data, siteContext.dispatch, scenePath)
                    })
            }

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
    }, [selectedColumn, showMaterial]);

    useEffect(() => {
        if (selectedRow && (!selectedColumn || selectedColumn.parent !== selectedRow)) {
            const swatch = selectedRow.children.length ? selectedRow.children[0] : undefined; //or default here
            setSelectedColumn(swatch);
        }
    }, [selectedColumn, selectedRow, swatchSelected]);

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
            return config.hasPhotoUpload
        } else if (mode === VisualizerToolMode.ChooseScene) {
            return config.hasScenes
        } else if (mode === VisualizerToolMode.Share) {
            return hasShare
        }

        return true
    }, [config, isUploadedImage, hasShare]);

    const toolChanged = useCallback((mode: VisualizerToolMode) => {
        if (!_isMounted.current) return;

        if (mode === VisualizerToolMode.ChoosePhoto) {
            openImageDialog()
        } else if (mode === VisualizerToolMode.ChooseScene) {
            setActivePanel(Panel.Scenes)
        } else if (mode === VisualizerToolMode.Share) {
            setActivePanel(Panel.Share)
        } else {
            setActivePanel(defaultLeftPanel);
            setToolMode(mode);
        }

    }, [defaultLeftPanel]);

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
        setRotationControlActive(false);
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

        setToolMode(VisualizerToolMode.None);
        setTranslationControlActive(false)

    }, [dispatch]);

    const resolveDetailsUrl = useCallback((name:string, url:string|undefined)=>{
        //console.log(`${basePath}/textures/${url}`)
        if (!url && selectedProduct) {
            if (name === "preview") {
                return `${config.basePath}/textures/${selectedProduct.thumbnail}`
            } else if (name==="share") {
                return `${config.basePath}/textures/${selectedProduct.thumbnail}`
            }
        }
        return `${config.basePath}/textures/${url}`
    }, [config, selectedProduct]);

    const floorRotation = useMemo(()=>{
        if (rotationControlActive) {
            return rotationControlValue
        }
        else {
            return siteContext.state.rotation ? siteContext.state.rotation[1] : 0
        }
    }, [rotationControlActive, rotationControlValue, siteContext.state.rotation]);

    const floorPosition = useMemo(()=>{
        if (translationControlActive) {
            return translationControlValue
        }
        else if (siteContext.state.floorTranslation) {
            return siteContext.state.floorTranslation
        } else {
            return floorTranslationOrigin
        }
    }, [floorTranslationOrigin, siteContext.state.floorTranslation, translationControlActive, translationControlValue]);

    const className = useMemo(()=>{
        switch (activePanel) {
            case Panel.Scenes:
                return "visualizer scenes";
            case Panel.Products:
                return "visualizer products";
            case Panel.ProductInfo:
                return "visualizer product-info";
            case Panel.Share:
                return "visualizer share";
            default:
                return "visualizer";
        }

    }, [activePanel]);

    const leftPanelOpen = useMemo(()=>{
        return activePanel === Panel.Scenes || activePanel === Panel.Products
    },[activePanel]);

    const rightPanelOpen = useMemo(()=>{
        return activePanel === Panel.ProductInfo || activePanel === Panel.Share
    },[activePanel]);

    const rightPanelButtonText = useMemo(()=>{
        if (rightPanelOpen && !isPortrait) {
            return ""
        }
        else if (activePanel === Panel.Share) {
            return isPortrait ? "Share" : "Share Project";
        } else {
            return isPortrait ? "Details" : "Product Details";
        }
    },[activePanel, isPortrait, rightPanelOpen]);

    const getShareUrl = useCallback((socialNetwork:string) => {

        // if (shareImageUrl && shawState.selectedSubMaterial) {
        //     deliverRenderedImage(`${shawState.selectedSubMaterial.displayName}-${shawState.selectedSubMaterial.name}-${shawState.selectedSubMaterial.json['SellingStyleNbr']}.png`, shareImageUrl)
        // }

        return "https://www.cnn.com";
    }, []);

    const saveClicked = useCallback(() => {

        // if (shareImageUrl && shawState.selectedSubMaterial) {
        //     deliverRenderedImage(`${shawState.selectedSubMaterial.displayName}-${shawState.selectedSubMaterial.name}-${shawState.selectedSubMaterial.json['SellingStyleNbr']}.png`, shareImageUrl)
        // }

    }, []);

    const shareCompleted = useCallback(() => {

        // if (shareImageUrl && shawState.selectedSubMaterial) {
        //     deliverRenderedImage(`${shawState.selectedSubMaterial.displayName}-${shawState.selectedSubMaterial.name}-${shawState.selectedSubMaterial.json['SellingStyleNbr']}.png`, shareImageUrl)
        // }

    }, []);

    const shareProgress = useCallback((visible: boolean, status: string, percentage: number) => {
        if (isMobile) {
            setProgressVisible(visible);
            setProgressPercentage(percentage);
            setStatusText(status);
        }
    }, [isMobile]);

    const uploadFile = useCallback((canvas, name) => {
        if (api.current) {
            //TODO: put uploadFile into api
            return CBContentManager.default.uploadFile(canvas, name);
        }
    }, [api]);

    const sceneLoaded = useCallback((data: CBSceneData, methods:CBMethods) => {
        api.current = methods;
        scene.current = data;

        if (!siteContext.state.floorTranslation) {
            const forward = methods.getFloorCenter();
            dispatch({
                type: "setFloorTranslation",
                xPos: forward[0],
                yPos: forward[2]
            });

            setTranslationControlValue(forward)
        } else {
            setTranslationControlValue(siteContext.state.floorTranslation)
        }

    }, [dispatch, siteContext.state.floorTranslation]);

    const sceneRendered = useCallback((data: CBSceneData) => {
        scene.current = data
    }, [scene]);

    return useMemo(() => (
        <div className={className}>

            <div className={"primary-panel"}>
                <div className={"panel"}>
                    <div className={"title"}>
                        <div className={"choose product" + (activePanel === Panel.Products ? " selected" : "")} onClick={()=>setActivePanel(Panel.Products)}>
                            <div className={"choose-text"}>Choose a Product</div>
                        </div>
                        <div className={"choose scene" + (activePanel === Panel.Scenes ? " selected" : "")} onClick={()=>setActivePanel(Panel.Scenes)}>
                            <div className={"choose-text"}>Choose a Scene</div>
                        </div>
                    </div>

                    {activePanel === Panel.Products && <ProductBreadcrumb currentItem={navigationItem} onClick={navClicked} />}

                    <VerticalListing visible={activePanel === Panel.Products}
                                     onClick={swatchSelected}
                                     swatches={listingItems}
                                     filters={allFilters}
                                     selectedSwatch={selectedRow}
                                     selectedSubSwatch={selectedColumn}
                                     resolveThumbnailPath={resolveThumbnailPath}/>

                    <VerticalListing visible={activePanel === Panel.Scenes}
                                     onClick={sceneSelected}
                                     swatches={sceneListingItems}
                                     selectedSwatch={selectedSceneRow}
                                     selectedSubSwatch={selectedSceneColumn}
                                     resolveThumbnailPath={resolveSceneThumbnailPath}/>
                </div>
            </div>

            {config && <div className={"visualizer-container"}>
                {toolMode === VisualizerToolMode.None && (selectedProduct || isPortrait) && (defaultRightPanel !== Panel.None || defaultLeftPanel === Panel.None) && (
                    <div className={"products-button close-button-container"}>
                        <Fab className={"close-button"} onClick={()=>setActivePanel(leftPanelOpen ? defaultRightPanel : Panel.Products)} icon={<MaterialIcon icon={leftPanelOpen ? (isPortrait ? "keyboard_arrow_down" : "keyboard_arrow_left") : (isPortrait ? "keyboard_arrow_up" : "keyboard_arrow_right")} />} />
                    </div>
                )}

                <CBVisualizer
                    toolMode={cbToolMode}
                    canLoad={true}
                    onSceneLoaded={sceneLoaded}
                    onSceneRender={sceneRendered}
                    material={materialProperties}
                    defaultMaterial = {new CBMaterialProperties(20,"assets/img/blue-tile.png")}
                    scene={siteContext.state.sceneData}
                    fov={fov}
                    cameraPosition={position}
                    cameraRotation={[rotation[0], 0, rotation[2]]}
                    floorSize={floorSize}
                    floorRotation={floorRotation}
                    blendEdges={isUploadedImage()}
                    lightingOffset={config.lightingOffset}
                    floorPosition={translationControlActive ? translationControlValue : floorPosition}
                    floorPositionUpdated={pos=>translateChanged(pos[0], pos[2])}
                    floorRotationUpdated={rot=>rotateChanged(rot)}
                    showControls={siteContext.state.showControls} />

                <img className={"floating-logo"} src={`${config.basePath}/${config.siteLogoImage}`} alt={"logo"} />

                <VisualizerTools
                    visible={!isToolOverlayOpen && !rightPanelOpen}
                    mode={toolMode}
                    isModePermitted={isModePermitted}
                    showLabels={!isPortrait}
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

                {!rightPanelOpen && selectedRow && selectedProduct && (
                    <div className={`product-name${selectedProductIsLight ? " dark":""}`}>{selectedRow.displayName} - {selectedProduct.displayName}</div>
                )}

                {toolMode === VisualizerToolMode.None && selectedProduct && (!leftPanelOpen || !isPortrait) && (
                    <div className={"product-details-button close-button-container"}>
                        <Fab className={"close-button"} onClick={()=>setActivePanel(rightPanelOpen ? defaultLeftPanel : Panel.ProductInfo)}
                             textLabel={rightPanelButtonText}
                             icon={<MaterialIcon icon={rightPanelOpen ? (isPortrait ? "keyboard_arrow_down" : "keyboard_arrow_right") : (isPortrait ? "keyboard_arrow_up" : "keyboard_arrow_left")} />} />
                    </div>
                )}
            </div>}

            <div className="secondary-panel">
                <div className={"panel"}>

                    {!isPortrait && hasShare && <div className={"title"}>
                        <div className={"choose info" + (activePanel === Panel.ProductInfo ? " selected" : "")} onClick={()=>setActivePanel(Panel.ProductInfo)}>
                            <div className={"choose-text"}>Product Details</div>
                        </div>
                        <div className={"choose share" + (activePanel === Panel.Share ? " selected" : "")} onClick={()=>setActivePanel(Panel.Share)}>
                            <div className={"choose-text"}>Share</div>
                        </div>
                    </div>}

                    <ProductInfo className={"info"}
                                 visible={activePanel === Panel.ProductInfo}
                                 product={selectedProduct}
                                 resolveUrl={resolveDetailsUrl} />

                    {config && siteContext.state.sceneData && api.current && scene.current && (
                        <SharePanel className={"share"}
                                    visible={activePanel === Panel.Share}
                                    product={selectedProduct}
                                    getShareUrl={getShareUrl}
                                    shareSubject={config.shareSubject}
                                    onClose={()=>setActivePanel(defaultRightPanel)}
                                    onSave={saveClicked}
                                    api={api.current}
                                    scene={siteContext.state.sceneData}
                                    data={scene.current}
                                    uploadFile={uploadFile}
                                    isUploadedImage={isUploadedImage()}
                                    onCompleted={shareCompleted}
                                    onProgress={shareProgress} />
                        )}
                </div>
            </div>

            {config && config.hasPhotoUpload && <ImageUpload onImageChosen={onImageChosen} onProgress={onProgress}/>}

            <Progress visible={progressVisible} percentage={progressPercentage} statusText={statusText} />
        </div>
    ), [className, activePanel, navigationItem, navClicked, swatchSelected, listingItems, allFilters, selectedRow, selectedColumn, resolveThumbnailPath, sceneSelected, sceneListingItems, selectedSceneRow, selectedSceneColumn, resolveSceneThumbnailPath, config, toolMode, selectedProduct, isPortrait, defaultRightPanel, defaultLeftPanel, leftPanelOpen, cbToolMode, sceneLoaded, sceneRendered, materialProperties, siteContext.state.sceneData, siteContext.state.showControls, fov, position, rotation, floorSize, floorRotation, isUploadedImage, translationControlActive, translationControlValue, floorPosition, isToolOverlayOpen, rightPanelOpen, isModePermitted, toolChanged, rotateChanged, rotateFinished, translateChanged, translateFinished, historySize, toolsShowHideButtons, selectedProductIsLight, rightPanelButtonText, hasShare, resolveDetailsUrl, getShareUrl, saveClicked, uploadFile, shareCompleted, shareProgress, onImageChosen, onProgress, progressVisible, progressPercentage, statusText])
}
