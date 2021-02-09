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
    CBARRugAsset,
    CBARScene,
    CBARSurface,
    CBARSurfaceAsset,
    CBARSurfaceType,
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
    SwatchItem,
    THREE
} from "react-home-ar";

import {SiteContext, stateToUrl} from '../data/SiteContext';
import MaterialIcon from "@material/react-material-icon";
import {Fab} from "@material/react-fab";
import {
    DefaultToolsMenuActions,
    EditSurfaceTool,
    ImageProperties,
    ImageUpload,
    openImageDialog,
    ProductBreadcrumb,
    ProductInfo, RotateTool,
    ServerProgress,
    SharePanel,
    ToolOperation,
    ToolsMenu,
    ToolsMenuAction, TranslateTool,
    VerticalListing
} from "react-cambrian-ui";
import {Progress} from "../components/Progress";
import orientationImage from "../data/orientation6.jpg";

import {getScenePaths, getUploadedRoomPaths} from "../index";
import {BrowserType} from "react-client-info";
import {Button} from "@material-ui/core";

enum Panel {
    None="",
    Products="products",
    Scenes="scenes",
    ProductInfo="product-info",
    Share="share"
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

    const [activePanel,setActivePanel] = useState(Panel.None);

    const [progressText, setProgressText] = useState("");
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [progressVisible, setProgressVisible] = useState(false);

    const [rootItem, setRootItem] = useState<SwatchItem>();
    const [navigationItem, setNavigationItem] = useState<SwatchItem>();
    const [dataPath, setDataPath] = useState<string>();

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

    const brandPath = useMemo(()=>{
        if (config) {
            return `${config.basePath}`
        }
    }, [config]);

    const [context, setContext] = useState<CBARContext>();
    const [currentScene, setCurrentScene] = useState<CBARScene>();
    const [selectedSurface, setSelectedSurface] = useState<CBARSurface>();
    const [hasSeenProducts, setHasSeenProducts] = useState(false);
    const [needsUpload, setNeedsUpload] = useState(false);

    const selectedProduct = useMemo(()=>{
        return selectedColumn instanceof ProductItem ? selectedColumn as ProductItem : undefined;
    }, [selectedColumn]);

    const [selectedAsset, setSelectedAsset] = useState<CBARSurfaceAsset>();

    const [initialRotation, setInitialRotation] = useState<number>(0);
    const [currentRotation, setCurrentRotation] = useState<number>(0);
    useEffect(()=>{setCurrentRotation(initialRotation);}, [initialRotation]);

    const [initialXPos, setInitialXPos] = useState<number>(0);
    const [currentXPos, setCurrentXPos] = useState<number>(0);
    useEffect(()=>{setCurrentXPos(initialXPos);}, [initialXPos]);

    const [initialYPos, setInitialYPos] = useState<number>(0);
    const [currentYPos, setCurrentYPos] = useState<number>(0);
    useEffect(()=>{setCurrentYPos(initialYPos);}, [initialYPos]);

    const isToolOverlayOpen = useMemo(()=>{
        return toolMode === CBARToolMode.Rotate || toolMode === CBARToolMode.Translate || toolMode === CBARToolMode.DrawSurface || toolMode === CBARToolMode.EraseSurface
    }, [toolMode]);

    const hasShare = useMemo(()=>{
        //disabled for now:
        // if (config && selectedProduct) {
        //     return config.hasOwnProperty("hasShare") ? config.hasShare : true;
        // }
        return false
    },[]);

    const hasPhotoUpload = useMemo(()=>{
        if (config) {
            return config.hasOwnProperty("hasPhotoUpload") ? config.hasPhotoUpload : true;
        }
        return false
    },[config]);

    const hasScenes = useMemo(()=>{
        if (config) {
            return config.hasOwnProperty("hasScenes") ? config.hasScenes : true;
        }
        return false
    },[config]);

    const isMobile = useMemo(()=>{
        return siteContext.state.browserProperties.isPortrait;
    }, [siteContext.state.browserProperties.isPortrait]);

    const isPortrait = useMemo(()=>{
        return siteContext.state.browserProperties.isPortrait
    }, [siteContext.state.browserProperties.isPortrait]);

    const removeAsset = useCallback(()=>{
        if (selectedAsset) {
            selectedAsset.removeFromScene();
        }
    }, [selectedAsset]);

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

        dispatch({type: "clearRoomData"});

        dispatch({
            type: "setSceneData",
            sceneData: props
        });

        dispatch({
            type: "setSelectedRoom",
            selectedRoom: props.roomId
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

        if (!(swatchItem instanceof DataItem)) return;

        if (!swatchItem.thumbnail && swatchItem.children.length) {
            return resolveThumbnailPath(swatchItem.children[0])
        }

        return swatchItem.thumbnail && swatchItem.thumbnail.startsWith("http") ? swatchItem.thumbnail : `${brandPath}/${swatchItem.thumbnail}`;

    }, [brandPath]);

    const assetClicked = useCallback((asset:CBARSurfaceAsset) => {
        setSelectedAsset(asset);
    }, []);

    useEffect(()=>{
        if (selectedAsset && selectedAsset.product) {
            setSelectedRow(selectedAsset.product.parent);
            setSelectedColumn(selectedAsset.product);
        }
    }, [selectedAsset]);

    useEffect(()=>{
        if (selectedAsset) {
            setInitialXPos(selectedAsset.surfacePosition.x);
            setInitialYPos(selectedAsset.surfacePosition.y);
            setInitialRotation(selectedAsset.surfaceRotation);
        }
    },[selectedAsset]);

    const showMaterial = useCallback((color:Product|ProductColor) => {
        if (!context || !selectedSurface) {
            console.log("Show material failed", selectedSurface);
            return;
        };

        let material:CBARMaterialProperties = {};
        material.properties = {
            metalnessValue: -0.05
        };
        material.textures = {};
        material.ppi = color.ppi ? color.ppi : 20;

        if (color.metaData) {
            if (color.metaData.hasOwnProperty("albedo")) {
                material.textures.albedo = `${brandPath}/${color.metaData.albedo}`;
            }
            if (color.metaData.hasOwnProperty("normals")) {
                material.textures.normals = `${brandPath}/${color.metaData.normals}`;
            }
            if (color.metaData.hasOwnProperty("specular")) {
                material.textures.roughness = `${brandPath}/${color.metaData.specular}`;
            }
            if (color.metaData.hasOwnProperty("mirrored")) {
                material.mirrored = color.metaData.mirrored;
            }
            if (color.metaData.hasOwnProperty("mirroredX")) {
                material.mirroredX = color.metaData.mirroredX;
            }
            if (color.metaData.hasOwnProperty("mirroredY")) {
                material.mirroredY = color.metaData.mirroredY;
            }
            if (color.metaData.hasOwnProperty("crop")) {
                material.crop = color.metaData.crop;
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
    }, [brandPath, context, selectedSurface]);

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

            //console.log("click", event.intersections);

            if (asset) {
                assetClicked(asset);
            }
        } else if (selectedAsset && event.type === CBAREventType.TouchMove) {
            setCurrentRotation(selectedAsset.surfaceRotation);
            setCurrentXPos(selectedAsset.surfacePosition.x);
            setCurrentYPos(selectedAsset.surfacePosition.y);
        }
    }, [assetClicked, currentScene, selectedAsset]);

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

    useEffect(()=>{
        if (selectedProduct) {
            setHasSeenProducts(true);
        }
    }, [selectedProduct]);

    const productsClicked = useCallback((gotoRoot?:boolean)=>{
        if (activePanel === Panel.Products || activePanel === Panel.Scenes) {
            setActivePanel(Panel.None);
        } else {
            if (currentScene) {
                setActivePanel(Panel.Products);
            } else {
                setActivePanel(Panel.Scenes);
            }
        }
        if (rootItem && gotoRoot) {
            setListingItems(rootItem.children);
        }
    }, [activePanel, currentScene, rootItem]);

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
            setListingItems(swatchItem.children);
        } else if (swatchItem instanceof Product) {
            const product = swatchItem as Product;
            dispatch({
                type: "setProduct",
                code: `${product.code}`
            });
            if (product.colors.length) {
                swatchSelected(product.colors[0])
            }
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
            return getScenePaths(scene.collection.code, scene.code).preview
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

            dispatch({
                type: "setSelectedRoom",
                selectedRoom: null
            });

            setActivePanel(Panel.None);

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
        return !dataPath;
    }, [dataPath]);

    const resolveDetailsUrl = useCallback((name:string, url:string|undefined)=>{
        //console.log(`${basePath}/textures/${url}`)
        if (!url && selectedProduct) {
            if (name === "preview") {
                return `${brandPath}/${selectedProduct.thumbnail}`
            } else if (name==="share") {
                return `${brandPath}/${selectedProduct.thumbnail}`
            }
        }
        if (url) {
            return url.startsWith("http") ? url : `${brandPath}/${url}`
        }
        return "";
    }, [brandPath, selectedProduct]);

    const leftPanelOpen = useMemo(()=>{
        return activePanel === Panel.Scenes || activePanel === Panel.Products
    },[activePanel]);

    const rightPanelOpen = useMemo(()=>{
        return activePanel === Panel.ProductInfo || activePanel === Panel.Share
    },[activePanel]);

    const leftPanelButtonText = useMemo(()=>{
        if (activePanel === Panel.None && currentScene) {
            return isPortrait && selectedProduct ? "" : "Products";
        }
        return undefined
    },[activePanel, currentScene, isPortrait, selectedProduct]);

    const rightPanelButtonText = useMemo(()=>{
        if (activePanel === Panel.None && currentScene) {
            return isPortrait ? "Details" : "Product Details";
        }
        return undefined
    },[activePanel, currentScene, isPortrait]);

    const getShareUrl = useCallback((socialNetwork:string) => {
        return stateToUrl(siteContext.state, true)
    }, [siteContext.state]);

    const shareCompleted = useCallback(() => {
        setActivePanel(Panel.None);
    }, []);

    const shareUploadComplete = useCallback(()=>{
        setNeedsUpload(false);
    }, []);

    useEffect(()=>{
        if (siteContext.state.selectedSampleRoomType && siteContext.state.selectedSampleRoom) {
            setDataPath(getScenePaths(siteContext.state.selectedSampleRoomType, siteContext.state.selectedSampleRoom).data);
        }
    }, [siteContext.state.selectedSampleRoom, siteContext.state.selectedSampleRoomType]);

    useEffect(()=>{
        if (siteContext.state.selectedRoom) {
            setDataPath(getUploadedRoomPaths(siteContext.state.selectedRoom).data);
        }
    }, [siteContext.state.selectedRoom]);

    useEffect(()=>{
        if (dataPath && context && rootItem) {
            const brand = rootItem as DataItem;
            context.loadSceneAtPath(dataPath, brand.surfaceTypes).then((scene)=>{
                setCurrentScene(scene);
                console.log("Static Scene Loaded!");
            }).catch(error=>{
                console.log("Could not load scene!", error)
            });
        }
    }, [context, dataPath, rootItem]);

    useEffect(() => {
        if (context && siteContext.state.sceneData && rootItem) {
            const brand = rootItem as DataItem;
            context.loadSceneData(siteContext.state.sceneData, brand.surfaceTypes).then((scene)=>{
                console.log("Dynamic Scene Loaded!");
                setCurrentScene(scene);
                setDataPath(undefined);
            }).catch(error=>{
                console.log("Could not load scene!", error)
            })
        }
    }, [context, rootItem, siteContext.state.sceneData]);

    useEffect(()=>{
        if (currentScene) {
            const floor = currentScene.geometry.surfaces.find(surface=>surface.type === CBARSurfaceType.Floor);
            if (floor) {
                setSelectedSurface(floor);
                console.log("Set selected surface to first floor.")
            }
        }
    }, [currentScene]);

    const handleAction = useCallback((action:ToolsMenuAction) => {

        switch (action.operation) {
            case ToolOperation.Remove:
                removeAsset();
                break;
            case ToolOperation.ChoosePhoto:
                openImageDialog();
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

    }, [removeAsset]);

    const isEditable = useCallback(() => {
        if (currentScene) {
            return currentScene.isEditable && !dataPath;
        }
        return false
    }, [currentScene, dataPath]);

    const toolActions = useMemo<ToolsMenuAction[]>(()=>{
        let actions = [...DefaultToolsMenuActions];

        if (!hasPhotoUpload) {
            actions = actions.filter(item=>item.operation !== ToolOperation.ChoosePhoto);
        }

        if (!hasScenes) {
            actions = actions.filter(item=>item.operation !== ToolOperation.ChooseScene);
        }

        if (!hasShare) {
            actions = actions.filter(item=>item.operation !== ToolOperation.Share);
        }

        actions = actions.filter(item=>item.operation !== ToolOperation.ChoosePattern);

        const canEdit = siteContext.state.browserProperties.browser !== BrowserType.LegacyIE
            && siteContext.state.browserProperties.browser !== BrowserType.IE11
            && isEditable();

        if (!canEdit) {
            actions = actions.filter(item=>item.operation !== CBARToolMode.DrawSurface && item.operation !== CBARToolMode.EraseSurface);
        }

        return actions
    }, [hasPhotoUpload, hasScenes, hasShare, isEditable, siteContext.state.browserProperties.browser]);

    const editSurfaceFinished = useCallback(() => {
        if (!_isMounted.current) return;

        setToolMode(CBARToolMode.None);
    }, []);

    const rotateChanged = useCallback((radians: number) => {
        if (!_isMounted.current || !selectedAsset) return;

        selectedAsset.surfaceRotation = radians;
        console.log(radians);

    }, [selectedAsset]);

    const rotateFinished = useCallback((commit: boolean, radians: number) => {
        if (!_isMounted.current) return;

        if (selectedAsset) {
            selectedAsset.surfaceRotation = commit ? radians : initialRotation;
        }

        setToolMode(CBARToolMode.None);
    }, [initialRotation, selectedAsset]);

    const translationChanged = useCallback((xPos: number, yPos: number) => {
        if (!_isMounted.current) return;

        if (selectedAsset) {
            selectedAsset.setSurfacePosition(xPos, yPos);
        }

    }, [selectedAsset]);

    const translationFinished = useCallback((commit: boolean, xPos: number, yPos: number) => {
        if (!_isMounted.current) return;

        if (selectedAsset) {
            selectedAsset.setSurfacePosition(commit ? xPos : initialXPos, commit ? yPos : initialYPos);
        }

        setToolMode(CBARToolMode.None);
    }, [initialXPos, initialYPos, selectedAsset]);

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

    const showUploadButton = useMemo(()=>{
        return !(currentScene || dataPath || siteContext.state.sceneData || progressVisible)
    }, [currentScene, dataPath, siteContext.state.sceneData, progressVisible]);

    const panelTimer = useRef(0);
    const setPanelTimer = useCallback(()=>{
        panelTimer.current = window.setTimeout(()=>{
            setActivePanel(Panel.None);
        }, 1000);
    }, [panelTimer]);

    const clearPanelTimer = useCallback(()=>{
        if (panelTimer.current) {
            window.clearTimeout(panelTimer.current);
        }
    }, [panelTimer]);

    return useMemo(() => (
        <div className={"panels " + activePanel}>

            <div className={"panel a"} onMouseOut={()=>setPanelTimer()} onMouseOver={()=>clearPanelTimer()}>
                <div className={"title"}>
                    {currentScene && <div className={"choose product" + (activePanel === Panel.Products ? " selected" : "")} onClick={()=>productsClicked(true)}>
                        <div className={"choose-text"}>Choose a Product</div>
                    </div>}
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

            {config &&
            <div className={"panel b"}>

                <CBARView className={"cbarview"} onContextCreated={setContext} toolMode={toolMode} />

                {config && config.hasPhotoUpload && (<ImageUpload onImageChosen={onImageChosen} onProgress={onProgress} />)}

                <div className={"image-upload"} style={{visibility:showUploadButton ? "visible":"hidden"}}>
                    <div className="content">
                        <Button variant="contained" color="primary" onClick={()=>setActivePanel(Panel.Scenes)}>
                            <div className={"upload-room-button"}>
                                <MaterialIcon icon='insert_photo' className={"upload-room-icon"} />
                                <div className={"upload-room-text"}>Choose a Scene</div>
                            </div>
                        </Button>
                        <Button variant="contained" color="secondary" onClick={()=>openImageDialog()}>
                            <div className={"upload-room-button"}>
                                <MaterialIcon icon='add_a_photo' className={"upload-room-icon"} />
                                <div className={"upload-room-text"}>Upload My Room</div>
                            </div>
                        </Button>
                    </div>
                </div>

                {!showUploadButton && currentScene && !isToolOverlayOpen && <ToolsMenu
                    className={"tools-menu"}
                    actions={toolActions}
                    selectedAsset={selectedAsset}
                    selectedSurface={selectedSurface}
                    onAction={handleAction}
                />}

                <EditSurfaceTool onEditFinished={editSurfaceFinished}
                                 surface={selectedSurface}
                                 toolMode={toolMode}
                                 onToolChanged={setToolMode} />

                <RotateTool visible={toolMode === CBARToolMode.Rotate}
                            rotation={toolMode === CBARToolMode.Rotate ? currentRotation : initialRotation}
                            onRotationChanged={rotateChanged}
                            onRotationFinished={rotateFinished} />

                <TranslateTool visible={toolMode === CBARToolMode.Translate}
                               xPos={toolMode === CBARToolMode.Translate ? currentXPos : initialXPos}
                               yPos={toolMode === CBARToolMode.Translate ? currentYPos : initialYPos}
                               onTranslationChanged={translationChanged}
                               onTranslationFinished={translationFinished} />


                {!rightPanelOpen && selectedRow && selectedProduct && (
                    <div className={"floating-product-info"}>
                        <div className={"product-swatch"} style={{background:selectedProduct.color}}>
                            {brandPath && <img alt={selectedProduct.displayName} src={`${brandPath}/${selectedProduct.thumbnail}`} />}
                        </div>
                        <div className={"product-name"}>
                            {selectedRow.displayName} - {selectedProduct.displayName}
                        </div>
                    </div>
                )}

                <img className={"floating-logo"} src={`${brandPath}/${config.siteLogoImage}`} alt={"logo"} />

                {(currentScene || activePanel !== Panel.None) && <Fab className={"close-button panel-a" + (hasSeenProducts ? "" : " bounce")} onClick={()=>productsClicked()}
                     textLabel={leftPanelButtonText}
                     icon={<MaterialIcon icon={leftPanelOpen ? (isPortrait ? "keyboard_arrow_down" : "keyboard_arrow_left") : (isPortrait ? "keyboard_arrow_up" : "keyboard_arrow_right")} />} />}

                {currentScene && selectedProduct && <Fab className={"close-button panel-c"} onClick={()=>setActivePanel(activePanel === Panel.None ? Panel.ProductInfo :  Panel.None)}
                     textLabel={rightPanelButtonText}
                     icon={<MaterialIcon icon={rightPanelOpen ? (isPortrait ? "keyboard_arrow_down" : "keyboard_arrow_right") : (isPortrait ? "keyboard_arrow_up" : "keyboard_arrow_left")} />} />}

            </div>}

            <div className={"panel c"} onMouseOut={()=>setPanelTimer()} onMouseOver={()=>clearPanelTimer()}>

                {!isPortrait && <div className={"title"}>
                    <div className={"choose info" + (activePanel === Panel.ProductInfo ? " selected" : "")} onClick={()=>setActivePanel(Panel.ProductInfo)}>
                        <div className={"choose-text"}>Product Details</div>
                    </div>
                    {hasShare &&
                    <div className={"choose share" + (activePanel === Panel.Share ? " selected" : "")} onClick={()=>setActivePanel(Panel.Share)}>
                        <div className={"choose-text"}>Share</div>
                    </div>}
                </div>}

                {selectedProduct && selectedProduct.parent && (
                    <ProductInfo className={"info"}
                                 visible={activePanel === Panel.ProductInfo}
                                 title={selectedProduct.parent.displayName}
                                 subTitle={selectedProduct.displayName}
                                 code={selectedProduct.code}
                                 resolveUrl={resolveDetailsUrl}
                                 details={productDetails}
                    />)}

                {config && currentScene && (
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

            {isMobile && activePanel === Panel.ProductInfo && <Fab className={"mobile-close"} icon={<MaterialIcon icon='close' />} onClick={()=>setActivePanel(Panel.None)}  />}

            <Progress visible={progressVisible} percentage={progressPercentage} statusText={progressText} />
        </div>
    ), [activePanel, currentScene, productsClicked, navigationItem, navClicked, swatchSelected, listingItems, allFilters, selectedRow, selectedColumn, resolveThumbnailPath, sceneSelected, sceneListingItems, selectedSceneRow, selectedSceneColumn, resolveSceneThumbnailPath, config, toolMode, onImageChosen, onProgress, showUploadButton, isToolOverlayOpen, toolActions, selectedAsset, selectedSurface, handleAction, editSurfaceFinished, currentRotation, initialRotation, rotateChanged, rotateFinished, currentXPos, initialXPos, currentYPos, initialYPos, translationChanged, translationFinished, rightPanelOpen, selectedProduct, brandPath, hasSeenProducts, leftPanelButtonText, leftPanelOpen, isPortrait, rightPanelButtonText, hasShare, resolveDetailsUrl, productDetails, needsUpload, getShareUrl, shareCompleted, isUploadedImage, shareUploadComplete, isMobile, progressVisible, progressPercentage, progressText, setPanelTimer, clearPanelTimer])
}
