import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import 'react-dat-gui/build/react-dat-gui.css'
import './Visualizer.css'

import {
    CBARAssetType,
    CBARContext,
    CBAREventType,
    CBARFilledTiledAsset,
    CBARIntersection,
    CBARMaterialProperties,
    CBARMouseEvent,
    CBARPaintAsset,
    CBARRugAsset, CBARScene, CBARSurface,
    CBARSurfaceAsset,
    CBARToolMode,
    CBARView,
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
    SwatchItem, THREE
} from "react-home-ar";

import {SiteContext, stateToUrl} from '../data/SiteContext';
import MaterialIcon from "@material/react-material-icon";
import {Fab} from "@material/react-fab";
import {
    DefaultToolsMenuActions, EditSurfaceTool,
    ImageProperties,
    ImageUpload, openImageDialog,
    ProductBreadcrumb,
    ProductInfo, ServerProgress, SharePanel, ToolOperation, ToolsMenu, ToolsMenuAction,
    VerticalListing
} from "react-cambrian-ui";
import {Progress} from "../components/Progress";
import orientationImage from "../data/orientation6.jpg";

import {getScenePaths} from "../index";
import {BrowserType} from "react-client-info";

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
        opencvJsLocation:"assets/opencv.js"
    })
} else {
    throw new Error('REACT_APP_CB_GET_UPLOAD_URLS_URL, REACT_APP_CB_UPLOADS_URL, and REACT_APP_CB_SEGMENT_URL must be defined')
}

export default function Visualizer(props: any) {
    const siteContext = useContext(SiteContext)!;
    const dispatch = siteContext.dispatch;

    const _isMounted = useRef(false);

    const [activePanel, setActivePanel] = useState(Panel.None);

    const [progressText, setProgressText] = useState("");
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

    const [toolMode, setToolMode] = useState(CBARToolMode.None);
    const config = useMemo(()=>{
        if (siteContext.state.siteData) {
            return siteContext.state.siteData.config;
        }
    }, [siteContext.state.siteData]);

    const [context, setContext] = useState<CBARContext>();
    const [currentScene, setCurrentScene] = useState<CBARScene>();
    const [selectedSurface, setSelectedSurface] = useState<CBARSurface>();

    const [needsUpload, setNeedsUpload] = useState(false);

    const selectedProduct = useMemo(()=>{
        return selectedColumn instanceof ProductItem ? selectedColumn as ProductItem : undefined;
    }, [selectedColumn]);

    const [selectedAsset, setSelectedAsset] = useState<CBARSurfaceAsset>();

    const isToolOverlayOpen = useMemo(()=>{
        return toolMode === CBARToolMode.Rotate || toolMode === CBARToolMode.Translate || toolMode === CBARToolMode.DrawSurface || toolMode === CBARToolMode.EraseSurface
    }, [toolMode]);

    const hasShare = useMemo(()=>{
        if (config && selectedProduct) {
            return config.hasOwnProperty("hasShare") ? config.hasShare : true;
        }
        return false
    },[config, selectedProduct]);

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

    const getPhoto = useCallback(()=>{
        openImageDialog();
    }, []);

    const removeAsset = useCallback(()=>{
        if (selectedAsset) {
            selectedAsset.removeFromScene();
        }
    }, [selectedAsset]);

    useEffect(()=>{
        if (isPortrait) {
            setActivePanel(Panel.None)
        } else {
            setActivePanel(Panel.Products)
        }
    }, [isPortrait]);

    useEffect(()=>{
        if (siteContext.state.siteData) {
            const brands:ProductBrand[] = [];
            for (const brandJson of siteContext.state.siteData.brands) {
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
        }

    }, [siteContext.state.siteData]);

    useEffect(() => {
        _isMounted.current = true;

        return () => {
            _isMounted.current = false
        }
    }, []);

    const onImageChosen = useCallback((props: ImageProperties) => {
        dispatch({
            type: "setSceneData",
            sceneData: props
        });
    },[dispatch]);

    const onProgress = useCallback((uploadProgress: ServerProgress) => {
        if (!_isMounted.current) return;
        if (uploadProgress.message) {
            setProgressText(uploadProgress.message)
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

        return `${config.basePath}/${swatchItem.thumbnail}`;

    }, [config]);

    const assetClicked = useCallback((asset:CBARSurfaceAsset) => {
        setSelectedAsset(asset);
    }, []);

    useEffect(()=>{
        if (selectedAsset && selectedAsset.product) {
            setSelectedRow(selectedAsset.product.parent);
            setSelectedColumn(selectedAsset.product);
        }
    }, [selectedAsset]);

    const showMaterial = useCallback((color:Product|ProductColor) => {
        if (!config || !context || !selectedSurface) return;

        let material:CBARMaterialProperties = {
            properties: {
                roughnessValue: 0.4,
                metalnessValue: 0.07,
                color:0.0,
            }
        };
        material.properties = {};
        material.textures = {};
        material.ppi = color.ppi ? color.ppi : 20;

        if (color.metaData) {
            if (color.metaData.hasOwnProperty("albedo")) {
                material.textures.albedo = `${config.basePath}/${color.metaData.albedo}`
            }
            if (color.metaData.hasOwnProperty("normals")) {
                material.textures.normals = `${config.basePath}/${color.metaData.normals}`
            }
            if (color.metaData.hasOwnProperty("specular")) {
                material.textures.roughness = `${config.basePath}/${color.metaData.specular}`
            }
        }

        if (color.color) {
            material.properties.color = color.color;
        }

        let elevation = 0.0;
        let currentAsset = selectedSurface.last();

        if (!currentAsset) {
            if (color.assetType === CBARAssetType.PaintSurface) {
                currentAsset = new CBARPaintAsset(context);
            } else if (color.assetType === CBARAssetType.Rug) {
                const rugAsset = currentAsset = new CBARRugAsset(context);
                rugAsset.dimensions = new THREE.Vector2(2,1);
                elevation = 0.005;
            } else {
                currentAsset = new CBARFilledTiledAsset(context);
            }
            console.log(`Created asset of type ${currentAsset.type}, ${color.assetType} at elevation ${currentAsset.surfaceElevation}m`);
            selectedSurface.add(currentAsset, elevation);
        }

        setSelectedAsset(currentAsset);

        currentAsset.loadProduct(color, currentAsset.type === CBARAssetType.PaintSurface ? { material:material} : { materials:[material]}).then(()=>{
            setNeedsUpload(true);
        }).catch((error:any) => {
            console.error(error)
        })
    }, [config, context, selectedSurface]);

    const handleVisualizerEvent = useCallback((event:CBARMouseEvent) => {
        if (!currentScene) return;

        if (event.type === CBAREventType.Rotate) {
            setToolMode(CBARToolMode.Rotate);
        } else if (event.type === CBAREventType.Translate) {
            setToolMode(CBARToolMode.Translate)
        }
        else if (event.type === CBAREventType.TouchDown) {

            const assetIntersections = event.intersections.filter(x => x.object instanceof CBARSurfaceAsset);
            const surfaceIntersection = event.intersections.find(x => x.object instanceof CBARSurface);
            const surface = surfaceIntersection ? surfaceIntersection.object as CBARSurface : undefined;
            const asset = assetIntersections.length > 0 ? assetIntersections.sort((a:CBARIntersection,b:CBARIntersection)=>{
                const assetA = a.object as CBARSurfaceAsset;
                const assetB = b.object as CBARSurfaceAsset;
                if (assetA.type === assetB.type) return 0;
                return assetA.type === CBARAssetType.Rug ? -1 : 1;
            })[0].object as CBARSurfaceAsset : undefined;

            if (surface) {
                setSelectedSurface(surface);
            }

            console.log("click", event.intersections);

            if (asset) {
                assetClicked(asset);
            }
        } else if (event.type === CBAREventType.TouchMove && selectedSurface) {
            //setCurrentRotation(selectedAsset.surfaceRotation);
            //setCurrentXPos(selectedAsset.surfacePosition.x);
            //setCurrentYPos(selectedAsset.surfacePosition.y);
        }
    }, [assetClicked, currentScene, selectedSurface]);

    useEffect(() => {
        if (context) {
            context.setHandler(handleVisualizerEvent)
        }
    }, [context, handleVisualizerEvent]);

    useEffect(()=>{
        if (selectedColumn && selectedSurface && !selectedSurface.length()) {
            showMaterial(selectedColumn as ProductColor);
        }
    }, [selectedColumn, selectedSurface, showMaterial]);

    const swatchSelected = useCallback((swatchItem:SwatchItem) => {

        if (swatchItem.parent && swatchItem.parent.hasColumns) {
            setSelectedColumn(selectedColumn === swatchItem ? undefined : swatchItem);
            showMaterial(swatchItem as ProductColor);
        } else {
            setSelectedRow(swatchItem);
        }

        if (swatchItem instanceof ProductCollection) {
            const collection = swatchItem as ProductCollection;
            dispatch({
                type: "setCollection",
                code: `${collection.code}`
            });
        } else if (swatchItem instanceof Product) {
            const product = swatchItem as Product;
            dispatch({
                type: "setProduct",
                code: `${product.code}`
            });
        } else if (swatchItem instanceof ProductColor) {
            const color = swatchItem as ProductColor;
            dispatch({
                type: "setColor",
                code: `${color.code}`
            });
        }

    }, [dispatch, selectedColumn, showMaterial]);

    const resolveSceneThumbnailPath = useCallback((swatchItem:SwatchItem) : string | undefined => {
        if (swatchItem instanceof SceneCollection) {
            const col = swatchItem as SceneCollection;
            if (col.scenes.length) {
                return resolveSceneThumbnailPath(col.scenes[0])
            }
        } else if (swatchItem instanceof SceneInfo) {
            const scene = swatchItem as SceneInfo;
            return getScenePaths(scene.collection.name, scene.name).preview
        }

        return
    }, []);

    const sceneSelected = useCallback((swatchItem:SwatchItem) => {
        if (swatchItem instanceof SceneInfo) {
            setSelectedSceneColumn(swatchItem);

            dispatch({
                type: "setSelectedSampleRoomType",
                selectedSampleRoomType: swatchItem.collection.code as string
            });

            dispatch({
                type: "setSelectedSampleRoom",
                selectedSampleRoom: swatchItem.code as string,
            });

        } else if (swatchItem instanceof SceneCollection) {
            setSelectedSceneRow(swatchItem)
        }
    }, [dispatch]);

    const navClicked = useCallback((swatchItem:SwatchItem) => {
        setListingItems(swatchItem.children);
        setNavigationItem(swatchItem)
    }, []);

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
        // if (siteContext.state.sceneData) {
        //     return siteContext.state.sceneData.backgroundUrl.indexOf("/scenes/") < 0
        // }
        return false
    }, []);

    const resolveDetailsUrl = useCallback((name:string, url:string|undefined)=>{
        //console.log(`${basePath}/textures/${url}`)
        if (!url && selectedProduct) {
            if (name === "preview") {
                return `${config.basePath}/${selectedProduct.thumbnail}`
            } else if (name==="share") {
                return `${config.basePath}/${selectedProduct.thumbnail}`
            }
        }
        return `${config.basePath}/${url}`
    }, [config, selectedProduct]);

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
        return stateToUrl(siteContext.state, true)
    }, [siteContext.state]);

    const shareCompleted = useCallback(() => {
        setActivePanel(defaultLeftPanel);
    }, [defaultLeftPanel]);

    const shareUploadComplete = useCallback(()=>{
        setNeedsUpload(false);
    }, []);

    const [dataPath, setDataPath] = useState<string>();

    useEffect(()=>{
        if (siteContext.state.selectedSampleRoomType && siteContext.state.selectedSampleRoom) {
            setDataPath(getScenePaths(siteContext.state.selectedSampleRoomType, siteContext.state.selectedSampleRoom).data);
        }
    }, [siteContext.state.selectedSampleRoom, siteContext.state.selectedSampleRoomType]);

    useEffect(()=>{
        if (dataPath && context && rootItem) {
            const brand = rootItem as DataItem;
            context.loadSceneAtPath(dataPath, brand.surfaceTypes).then((scene)=>{
                setCurrentScene(scene);
                console.log("Scene Loaded!");
            }).catch(error=>{
                console.log("Could not load scene!", error)
            });
        }
    }, [context, dataPath, rootItem]);

    useEffect(() => {
        if (context && siteContext.state.sceneData) {
            context.loadSceneData(siteContext.state.sceneData).then((scene)=>{
                console.log("V2 Scene Loaded!");
                setCurrentScene(scene);
            }).catch(error=>{
                console.log("Could not load scene!", error)
            })
        }
    }, [context, siteContext.state.sceneData]);

    const handleAction = useCallback((action:ToolsMenuAction) => {

        switch (action.operation) {
            case ToolOperation.Remove:
                removeAsset();
                break;
            case ToolOperation.ChoosePhoto:
                getPhoto();
                break;
            case ToolOperation.ChooseScene:
                setActivePanel(Panel.Scenes);
                break;
            case ToolOperation.Share:
                setActivePanel(Panel.Share);
                break;
        }

        if (action.operation && (Object.values(CBARToolMode) as string[]).indexOf(action.operation) >= 0) {
            setToolMode(action.operation as CBARToolMode);
        } else {
            setToolMode(CBARToolMode.None);
        }

    }, [getPhoto, removeAsset]);

    const isEditable = useCallback(() => {
        if (currentScene) {
            return currentScene.isEditable;
        }
        return false
    }, [currentScene]);

    const toolActions = useMemo<ToolsMenuAction[]>(()=>{
        let actions = [...DefaultToolsMenuActions];

        if (isEditable()) {
            actions = actions.filter(item=>item.operation !== ToolOperation.ChooseScene);
        } else {
            actions = actions.filter(item=>item.operation !== ToolOperation.ChoosePhoto);
        }

        const canEdit = siteContext.state.browserProperties.browser !== BrowserType.LegacyIE
            && siteContext.state.browserProperties.browser !== BrowserType.IE11
            && isEditable();

        if (!canEdit) {
            actions = actions.filter(item=>item.operation !== CBARToolMode.DrawSurface && item.operation !== CBARToolMode.EraseSurface);
        }

        return actions
    }, [isEditable, siteContext.state.browserProperties.browser]);

    const editSurfaceFinished = useCallback(() => {
        if (!_isMounted.current) return;

        setToolMode(CBARToolMode.None);
    }, []);

    const productDetails = useMemo(()=>{
        let product:DataItem|undefined = selectedProduct;
        while (product) {
            if (product.details) {
                return product.details
            }
            product = product.parent as DataItem
        }
        return undefined
    }, [selectedProduct]);

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
                {toolMode === CBARToolMode.None && (selectedProduct || isPortrait) && (defaultRightPanel !== Panel.None || defaultLeftPanel === Panel.None) && (
                    <div className={"products-button close-button-container"}>
                        <Fab className={"close-button"} onClick={()=>setActivePanel(leftPanelOpen ? defaultRightPanel : Panel.Products)} icon={<MaterialIcon icon={leftPanelOpen ? (isPortrait ? "keyboard_arrow_down" : "keyboard_arrow_left") : (isPortrait ? "keyboard_arrow_up" : "keyboard_arrow_right")} />} />
                    </div>
                )}

                <CBARView className={"cbarview"} onContextCreated={setContext} toolMode={toolMode} />

                <img className={"floating-logo"} src={`${config.basePath}/${config.siteLogoImage}`} alt={"logo"} />

                <ToolsMenu
                    actions={toolActions}
                    hidden={isToolOverlayOpen}
                    selectedAsset={selectedAsset}
                    selectedSurface={selectedSurface}
                    onAction={handleAction}
                />

                <EditSurfaceTool onEditFinished={editSurfaceFinished}
                                 surface={selectedSurface}
                                 toolMode={toolMode}
                                 onToolChanged={setToolMode} />

                <ImageUpload onImageChosen={onImageChosen} onProgress={onProgress} />

                {!rightPanelOpen && selectedRow && selectedProduct && (
                    <div className={"floating-product-info"}>
                        <div className={"product-swatch"} style={{background:selectedProduct.color}}>
                            {selectedProduct.thumbnail && <img alt={selectedProduct.thumbnail} src={selectedProduct.thumbnail} />}
                        </div>
                        <div className={"product-name"}>
                            {selectedRow.displayName} - {selectedProduct.displayName}
                        </div>
                    </div>
                )}

                {toolMode === CBARToolMode.None && selectedProduct && (!leftPanelOpen || !isPortrait) && (
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

                    {selectedProduct && selectedProduct.parent && (
                        <ProductInfo className={"info"}
                                     visible={activePanel === Panel.ProductInfo}
                                     title={selectedProduct.parent.displayName}
                                     subTitle={selectedProduct.displayName}
                                     resolveUrl={resolveDetailsUrl}
                                     details={productDetails}
                        />)}

                    {config && siteContext.state.sceneData && (
                        <SharePanel className={"share"}
                                    visible={activePanel === Panel.Share}
                                    needsUpload={needsUpload}
                                    product={selectedProduct}
                                    resolveThumbnailPath={resolveThumbnailPath}
                                    getShareUrl={getShareUrl}
                                    shareSubject={config.shareSubject}
                                    onClose={shareCompleted}
                                    isUploadedImage={isUploadedImage()}
                                    onImageUploadCompleted={shareUploadComplete} />
                        )}
                </div>

            </div>

            {isMobile && activePanel === Panel.ProductInfo && <Fab className={"mobile-close"} icon={<MaterialIcon icon='close' />} onClick={()=>setActivePanel(defaultLeftPanel)}  />}

            {config && config.hasPhotoUpload && <ImageUpload onImageChosen={onImageChosen} onProgress={onProgress}/>}

            <Progress visible={progressVisible} percentage={progressPercentage} statusText={progressText} />
        </div>
    ), [className, activePanel, navigationItem, navClicked, swatchSelected, listingItems, allFilters, selectedRow, selectedColumn, resolveThumbnailPath, sceneSelected, sceneListingItems, selectedSceneRow, selectedSceneColumn, resolveSceneThumbnailPath, config, toolMode, selectedProduct, isPortrait, defaultRightPanel, defaultLeftPanel, leftPanelOpen, toolActions, isToolOverlayOpen, selectedAsset, selectedSurface, handleAction, editSurfaceFinished, onImageChosen, onProgress, rightPanelOpen, rightPanelButtonText, hasShare, resolveDetailsUrl, productDetails, siteContext.state.sceneData, needsUpload, getShareUrl, shareCompleted, isUploadedImage, shareUploadComplete, isMobile, progressVisible, progressPercentage, progressText])
}
