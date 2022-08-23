import React, {ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import './Visualizer.css'

import {
    CBARAssetType,
    CBARContext,
    CBARFilledTiledAsset,
    CBARMaterialProperties,
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
    DebugLevel,
    Product,
    ProductBrand,
    ProductCollection,
    ProductColor,
    ProductItem,
    SceneCollection,
    SceneInfo,
    SwatchItem,
    THREE,
    ZoomState
} from "react-home-ar";

import {SiteContext} from '../data/SiteContext';
import {
    DefaultToolsMenuActions,
    EditSurfaceTool,
    ImageProperties,
    ImageUpload,
    openImageDialog,
    ProductBreadcrumb,
    ProductDetails,
    RotateTool,
    ServerProgress,
    ToolOperation,
    ToolsMenuAction,
    TranslateTool,
    VerticalListing,
    ZoomControls
} from "react-cambrian-ui";
import {Progress} from "../components/Progress";
import {getScenePaths, getUploadedRoomPaths, isFeatureEnabled, SITE_PATH} from "../index";
import {BrowserType} from "react-client-info";

import {Fab, Icon} from "@mui/material";
import {VisualizerTools} from "../components/VisualizerTools";
import {ColorLegend} from "../components/ColorLegend";
import {ApiCapabilityName} from "cambrian-base";
import {ChooseScene} from "../components/ChooseScene";
import {SwatchInfoParams} from "react-cambrian-ui/dist/products/SwatchListing";
import {ObjectSelection, SceneOptions} from "../components/SceneOptions";
import {ShareModal} from "../components/ShareModal";

enum Panel {
    None="",
    Products="products",
    Scenes="scenes",
    ProductInfo="product-info",
    Share="share"
}

const hexToRgb = (hex:string) => {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => {
        return r + r + g + g + b + b;
    });

    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

const PANEL_TIMEOUT=0;
const InsideIframe = (window !== window.parent);

if (!process.env.REACT_APP_CB_API_URL) {
    throw new Error('REACT_APP_CB_API_URL must be defined')
}

if (!process.env.REACT_APP_CB_UPLOADS_URL) {
    throw new Error('REACT_APP_CB_UPLOADS_URL must be defined')
}

export default function Visualizer() {
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

    const [context, setContext] = useState<CBARContext>();
    const [currentScene, setCurrentScene] = useState<CBARScene>();
    const [selectedSurface, setSelectedSurface] = useState<CBARSurface>();
    const [hasSeenProducts, setHasSeenProducts] = useState(false);
    const [needsScreenshot, setNeedsScreenshot] = useState(true);

    const selectedProduct = useMemo(()=>{
        return selectedColumn instanceof ProductItem ? selectedColumn as ProductItem : undefined;
    }, [selectedColumn]);

    const [selectedAsset, setSelectedAsset] = useState<CBARSurfaceAsset>();

    const primarySurfaceType = useMemo(()=>{
        if (siteContext && siteContext.state.siteData?.brands.length) {
            const firstBrand = siteContext.state.siteData.brands[0]
            return firstBrand.surfaceTypes ? firstBrand.surfaceTypes[0] : CBARSurfaceType.Floor;
        }
    }, [siteContext])

    const [shareImageUrl, setShareImageUrl] = useState<string>()

    useEffect(()=>{
        if (primarySurfaceType && process.env.REACT_APP_CB_API_URL && process.env.REACT_APP_CB_UPLOADS_URL) {
            cbInitialize({
                initialZoom:ZoomState.ZoomedOut,
                logLevel:DebugLevel.Warning,
                processingUrl: process.env.REACT_APP_CB_API_URL,
                hostingUrl: process.env.REACT_APP_CB_UPLOADS_URL,
                placeholderPath: primarySurfaceType === CBARSurfaceType.Floor ? "assets/img/blue-tile.png" : undefined,
                useLighting:!!process.env.REACT_APP_USE_LIGHTING && parseInt(process.env.REACT_APP_USE_LIGHTING) === 1
            })
        }
    }, [primarySurfaceType])

    const primarySurface = useMemo(()=>{
        if (currentScene && primarySurfaceType) {
            return currentScene.geometry.surfaces.find(surface=>surface.type === primarySurfaceType);
        }
    }, [currentScene, primarySurfaceType])

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

    const brandPath = useMemo(()=>{
        if (siteContext.state.siteData) {
            return SITE_PATH;
        }
    },[siteContext.state.siteData]);

    const _isFeatureEnabled = useCallback((name:ApiCapabilityName) => {
        if (siteContext.state.siteData) {
            return isFeatureEnabled(siteContext.state.siteData, name)
        }
        return false
    }, [siteContext.state.siteData]);

    const isMobile = useMemo(()=>{
        return siteContext.state.browserProperties.isPortrait;
    }, [siteContext.state.browserProperties.isPortrait]);

    const isPortrait = useMemo(()=>{
        return siteContext.state.browserProperties.isPortrait
    }, [siteContext.state.browserProperties.isPortrait]);

    const removeAsset = useCallback(()=>{
        if (selectedAsset) {
            selectedAsset.removeFromScene();
            setSelectedAsset(undefined);
            setSelectedColumn(undefined);
            setNeedsScreenshot(true);
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

        // dispatch({
        //     type: "setSelectedSampleRoom",
        //     selectedSampleRoom: null
        // });
        //
        // dispatch({
        //     type: "setSelectedSampleRoomType",
        //     selectedSampleRoomType: null
        // });
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

    const isDarkColor = (color:string|undefined) => {
        if (color) {
            const rgb = hexToRgb(color)
            if (rgb) {
                return rgb?.g < 128
            }
        }
        return false
    }

    const getColorSwatch = useCallback((params: SwatchInfoParams) : ReactNode => {
        return <div className={"swatch-info"}>
            <div className={isDarkColor(params.swatch.color) ? "code light" : "code"}>{(params.swatch as any).code}</div>
            <div className={"name"}>{params.swatch.displayName}</div>
        </div>
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

    const getBaseMaterialProps = (color:ProductItem) => {
        const material:CBARMaterialProperties = {};
        material.properties = {
            roughnessValue: 0.5,
            metalnessValue: 0.07
        };

        material.ppi = color.ppi ? color.ppi : 20;
        material.crop = color.crop;
        material.mirrored = color.mirrored;
        material.mirroredX = color.mirroredX;
        material.mirroredY = color.mirroredY;

        return material;
    }

    const showMaterial = useCallback((color:ProductItem) => {
        if (!context || !selectedSurface) {
            console.log("Show material failed", selectedSurface);
            return;
        }
        const materials:CBARMaterialProperties[] = [];

        if (color.textures && color.textures.length) {
            color.textures.forEach(tex=>{
                const material = getBaseMaterialProps(color);
                if (!material.properties) material.properties = {};
                material.textures = {};

                if (tex.albedoPath) {
                    material.textures.albedo = `${brandPath}/${tex.albedoPath}`;
                }
                if (tex.normalsPath) {
                    material.textures.normals = `${brandPath}/${tex.normalsPath}`;
                }
                if (tex.roughnessPath) {
                    material.textures.roughness = `${brandPath}/${tex.roughnessPath}`;
                }
                if (tex.specularPath) {
                    material.textures.specular = `${brandPath}/${tex.specularPath}`;
                }

                materials.push(material);
            });
        } else if (color.color) {

            const material = getBaseMaterialProps(color);
            if (!material.properties) material.properties = {};
            material.textures = {};

            if (color.color) {
                material.properties.color = color.color;
            }

            materials.push(material);
        } else if (color.metaData) {
            const material = getBaseMaterialProps(color);
            material.textures = {};

            //phase out this data approach:
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

            materials.push(material);
        }

        let elevation = 0.0;
        let currentAsset = selectedSurface.last();

        if (!currentAsset) {
            if (color.assetTypes.indexOf(CBARAssetType.PaintSurface) >= 0) {
                currentAsset = new CBARPaintAsset(context);
            } else if (color.assetTypes.indexOf(CBARAssetType.Rug) >= 0) {
                const rugAsset = currentAsset = new CBARRugAsset(context);
                rugAsset.dimensions = new THREE.Vector2(2,1);
                elevation = 0.005;
            } else {
                currentAsset = new CBARFilledTiledAsset(context);
            }
            //console.log(`Created asset of type ${currentAsset.type}, at elevation ${currentAsset.surfaceElevation}m`);
            selectedSurface.add(currentAsset, elevation);
        }

        if (materials.length) {
            setSelectedAsset(currentAsset);
            currentAsset.loadProduct(color, currentAsset.type === CBARAssetType.PaintSurface ? { material:materials[0]} : { materials:materials}).then(()=>{
                setNeedsScreenshot(true);
            }).catch((error:any) => {
                console.error(error)
            })
        }

    }, [brandPath, context, selectedSurface]);

    const productsClicked = useCallback((gotoRoot?:boolean)=>{
        if (rootItem && gotoRoot) {
            setListingItems(rootItem.children);
            setActivePanel(Panel.Products);
        } else if (currentScene) {
            setActivePanel((activePanel === Panel.Products || activePanel === Panel.Scenes) ? Panel.None : Panel.Products)
        } else {
            setActivePanel(activePanel === Panel.Scenes ? Panel.None : Panel.Scenes);
        }
    }, [activePanel, currentScene, rootItem]);

    useEffect(()=>{
        if (needsScreenshot && context) {
            //is this where i write to the canvas?
            context.captureScreenshot().then(image=>{
                setNeedsScreenshot(false);
                setShareImageUrl(image);
            })

        }
    }, [context, needsScreenshot])

    const onVisTouchMove = useCallback(()=>{
        if (!selectedAsset) return

        if (toolMode === CBARToolMode.Rotate) {
            setCurrentRotation(selectedAsset.surfaceRotation);
        } else if (toolMode === CBARToolMode.Translate) {
            setCurrentXPos(selectedAsset.surfacePosition.x);
            setCurrentYPos(selectedAsset.surfacePosition.y);
        }
    }, [selectedAsset, toolMode]);

    const onVisRotate = useCallback(()=>{
        setToolMode(CBARToolMode.Rotate);
    }, []);

    const onVisTranslate = useCallback(()=>{
        setToolMode(CBARToolMode.Translate);
    }, []);

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
        if (swatchItem.thumbnail) {
            return resolveThumbnailPath(swatchItem)
        }
        if (swatchItem instanceof SceneCollection) {
            const col = swatchItem as SceneCollection;
            if (col.scenes.length) {
                return resolveSceneThumbnailPath(col.scenes[0])
            }
        } else if (swatchItem instanceof SceneInfo) {
            const scene = swatchItem as SceneInfo;
            return getScenePaths(scene.collection.code, scene.code, scene.json.path).preview
        }

        return
    }, [resolveThumbnailPath]);

    const sceneSelected = useCallback((swatchItem:SwatchItem) => {
        if (swatchItem instanceof SceneInfo) {
            const sceneData = swatchItem as SceneInfo
            setSelectedSceneColumn(sceneData);

            dispatch({
                type: "setSelectedSampleRoomType",
                selectedSampleRoomType: sceneData.collection.code as string
            });

            dispatch({
                type: "setSelectedSampleRoom",
                selectedSampleRoom: sceneData.code as string,
            });

            if (sceneData.json.hasOwnProperty("path")) {
                dispatch({
                    type: "setDataPath",
                    dataPath: sceneData.json.path,
                });
            }

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
                if (process.env.REACT_APP_LOCAL_JSON_PATH) {
                    fetch(process.env.REACT_APP_LOCAL_JSON_PATH).then(res => res.json())
                        .then(json => {
                            // console.log("Got local scene json", json);
                            // brand.sceneCollections.push(json);
                            setSceneListingItems(brand.sceneCollections)
                        })
                } else {
                    setSceneListingItems(brand.sceneCollections)
                }
            }
        }
    }, [listingItems, rootItem, sceneListingItems, siteContext.state.selectedCollection, siteContext.state.selectedColor, siteContext.state.selectedProduct]);

    const allFilters = useMemo<DataFilter[]>(()=>{
        //const allFilters:DataFilter[] = filters ? filters:[];
        return filters ? filters:[]
    }, [filters]);

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
            return isPortrait ? undefined : "Colors";
        }
        return undefined
    },[activePanel, currentScene, isPortrait]);

    const rightPanelButtonText = useMemo(()=>{
        if (activePanel === Panel.None && currentScene) {
            return isPortrait ? "Details" : "Product Details";
        }
        return undefined
    },[activePanel, currentScene, isPortrait]);

    useEffect(()=>{
        if (siteContext.state.selectedSampleRoomType && siteContext.state.selectedSampleRoom) {
            setDataPath(getScenePaths(
                siteContext.state.selectedSampleRoomType,
                siteContext.state.selectedSampleRoom,
                siteContext.state.dataPath
            ).data);
        }
    }, [siteContext.state.selectedSampleRoom, siteContext.state.dataPath, siteContext.state.selectedSampleRoomType]);

    useEffect(()=>{
        if (siteContext.state.selectedRoom) {
            setDataPath(getUploadedRoomPaths(siteContext.state.selectedRoom).data);
        }
    }, [siteContext.state.selectedRoom]);

    const isLoading = useRef(false);

    useEffect(()=>{
        if (dataPath && context && rootItem && !isLoading.current) {
            const brand = rootItem as DataItem;
            isLoading.current = true;

            console.log("Loading static scene at path", dataPath)
            context.loadSceneAtPath(dataPath, brand.surfaceTypes).then((scene)=>{
                setCurrentScene(scene);
                console.log("Static Scene Loaded!");
            }).catch(error=>{
                console.log("Could not load scene!", error);
            }).finally(()=>{
                dispatch({
                    type: "setSceneData",
                    sceneData: undefined
                });
                isLoading.current = false;
                setDataPath(undefined);
            });
        }
    }, [context, dataPath, rootItem, isLoading, dispatch]);

    useEffect(() => {
        if (context && siteContext.state.sceneData && rootItem && !isLoading.current) {
            const brand = rootItem as DataItem;
            isLoading.current = true;

            context.loadSceneData(siteContext.state.sceneData, brand.surfaceTypes).then((scene)=>{
                console.log("Dynamic Scene Loaded!");
                setCurrentScene(scene);
            }).catch(error=>{
                console.log("Could not load scene!", error);
            }).finally(()=>{
                dispatch({
                    type: "setSceneData",
                    sceneData: undefined
                });
                isLoading.current = false;
                setDataPath(undefined);
            });
        }
    }, [context, rootItem, isLoading, dispatch, siteContext.state.sceneData]);

    useEffect(()=>{
        if (currentScene && primarySurface) {
            setSelectedSurface(primarySurface);
            //console.log(`Set initial selected surface to ${primarySurface.description}.`);
        }
    }, [currentScene, primarySurface]);

    const handleAction = useCallback((action:ToolsMenuAction) => {

        switch (action.operation) {
            case ToolOperation.ChooseColor:
                setActivePanel(Panel.Products)
                break;
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

        if (!_isFeatureEnabled("upload")) {
            actions = actions.filter(item=>item.operation !== ToolOperation.ChoosePhoto);
        }

        if (!_isFeatureEnabled("scenes")) {
            actions = actions.filter(item=>item.operation !== ToolOperation.ChooseScene);
        }

        if (!_isFeatureEnabled("share")) {
            actions = actions.filter(item=>item.operation !== ToolOperation.Share);
        }

        if (!selectedAsset || selectedAsset.type === CBARAssetType.PaintSurface) {
            actions = actions.filter(item=>item.operation !== CBARToolMode.Rotate && item.operation !== CBARToolMode.Translate);
        }

        actions = actions.filter(item=>item.operation !== ToolOperation.ChoosePattern);

        const canEdit = siteContext.state.browserProperties.browser !== BrowserType.LegacyIE
            && siteContext.state.browserProperties.browser !== BrowserType.IE11
            && isEditable();

        if (!canEdit) {
            actions = actions.filter(item=>item.operation !== CBARToolMode.DrawSurface && item.operation !== CBARToolMode.EraseSurface);
        }

        return actions
    }, [_isFeatureEnabled, isEditable, siteContext.state.browserProperties.browser, selectedAsset]);

    const editSurfaceFinished = useCallback(() => {
        if (!_isMounted.current) return;

        setToolMode(CBARToolMode.None);
    }, []);

    const rotateStarted = useCallback(() => {
        if (!_isMounted.current || !selectedAsset) return;

        setCurrentRotation(selectedAsset.surfaceRotation);

    }, [selectedAsset]);

    const rotateChanged = useCallback((radians: number) => {
        if (!_isMounted.current || !selectedAsset) return;

        selectedAsset.surfaceRotation = radians;

    }, [selectedAsset]);

    const rotateFinished = useCallback((commit: boolean, radians: number) => {
        if (!_isMounted.current) return;

        if (selectedAsset) {
            selectedAsset.surfaceRotation = commit ? radians : initialRotation;
            console.log("rotation difference from json value", selectedAsset.surfaceRotation);
        }

        setToolMode(CBARToolMode.None);
    }, [initialRotation, selectedAsset]);

    const translationStarted = useCallback(() => {
        if (!_isMounted.current || !selectedAsset) return;

        setCurrentXPos(selectedAsset.surfacePosition.x);
        setCurrentYPos(selectedAsset.surfacePosition.y);

    }, [selectedAsset]);

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
        return selectedProduct?.details
    }, [selectedProduct]);

    const hasDetailsPanel = useMemo<boolean>(()=>{
        if (!selectedProduct?.parent || !productDetails) {
            return false;
        }
        return !!(productDetails.preview || productDetails.content || productDetails.specifications?.length);
    }, [productDetails, selectedProduct])

    const productDetailsClicked = useCallback(()=>{
        if (hasDetailsPanel) {
            setActivePanel(activePanel === Panel.None ? Panel.ProductInfo :  Panel.None)
        } else if (productDetails?.url && selectedProduct) {
            let url = productDetails.url;
            if (selectedProduct instanceof ProductColor) {
                url = url.replace("{color}", `${selectedProduct.code}`);
                url = url.replace("{colorName}", `${selectedProduct.displayName?.toLowerCase().replace(/\s+/gi,"-")}`);
            }
            if (selectedProduct.collection) {
                url = url.replace("{collection}", `${selectedProduct.collection.code}`)
            }
            if (selectedProduct.brand) {
                url = url.replace("{brand}", `${selectedProduct.brand.code}`)
            }
            if (url) {
                window.open(url);
            }
        }
    }, [activePanel, hasDetailsPanel, productDetails, selectedProduct])

    const showUploadButton = useMemo(()=>{
        if ((!_isFeatureEnabled("scenes") && !_isFeatureEnabled("upload"))) {
            return false;
        }
        return !(currentScene || dataPath || siteContext.state.sceneData || progressVisible)
    }, [currentScene, dataPath, siteContext.state.sceneData, progressVisible, _isFeatureEnabled]);

    const panelTimer = useRef(0);
    const setPanelTimer = useCallback(()=>{
        if (PANEL_TIMEOUT) {
            panelTimer.current = window.setTimeout(()=>{
                setActivePanel(Panel.None);
            }, 1500);
        }
    }, [panelTimer]);

    const clearPanelTimer = useCallback(()=>{
        if (panelTimer.current) {
            window.clearTimeout(panelTimer.current);
        }
    }, [panelTimer]);

    const sourceChosen = useCallback((source:ApiCapabilityName)=>{
        if (source === 'upload') {
            openImageDialog();
        } else if (source === 'scenes') {
            setActivePanel(Panel.Scenes)
        }
    }, []);

    const showSceneSelector = useMemo(()=>{
        return showUploadButton;
    }, [showUploadButton]);

    const rightButtonIcon = useMemo(()=>{
        if (!hasDetailsPanel) {
            return <Icon>launch</Icon>
        } else if (rightPanelOpen) {
            return <Icon>{isPortrait ? "keyboard_arrow_down" : "keyboard_arrow_right"}</Icon>
        } else {
            return <Icon>{isPortrait ? "keyboard_arrow_up" : "keyboard_arrow_left"}</Icon>
        }
    }, [hasDetailsPanel, isPortrait, rightPanelOpen]);

    const selectionChanged = useCallback((object:ObjectSelection)=>{
        setSelectedSurface(object.surface);
        setSelectedAsset(object.asset);
    }, []);

    const [isShareModalOpen, setShareModal] = useState(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const products:ProductItem[] = []
    currentScene?.assets.all().forEach(asset=>{
        if (asset.product && products.indexOf(asset.product) < 0) {
            products.push(asset.product)
        }
    })

    const swatchClicked = useCallback((swatch:ProductItem)=>{
        const asset = currentScene?.assets.all().find(asset=>asset.product === swatch) as CBARSurfaceAsset;
        if (asset) {
            selectionChanged({surface:asset.surface, asset:asset})
        }
    }, [currentScene?.assets, selectionChanged])

    const logoSrc = siteContext.state.siteData?.appearance.logo.src;

    const brandLogo = useMemo(()=>{
        if (logoSrc) {
            return `${brandPath}/${logoSrc}`
        }
        return 'assets/img/DE_Logo.svg'
    }, [brandPath, logoSrc])

    return useMemo(() => (
        <div className={"panels " + activePanel}>

            <div className="panel a" onMouseOut={()=>setPanelTimer()} onMouseOver={()=>clearPanelTimer()}>
                <div className={"title"}>
                    {currentScene && <div className={"choose product" + (activePanel === Panel.Products ? " selected" : "")} onClick={()=>productsClicked(true)}>
                        <div className={"choose-text"}>Choose a Color</div>
                    </div>}
                    <div className={"choose scene" + (activePanel === Panel.Scenes ? " selected" : "")} onClick={()=>setActivePanel(Panel.Scenes)}>
                        <div className={"choose-text"}>Choose a Scene</div>
                    </div>
                </div>

                {activePanel === Panel.Products && <ProductBreadcrumb currentItem={navigationItem} onClick={navClicked} />}

                <VerticalListing className={"products"}
                                 visible={activePanel === Panel.Products}
                                 onClick={swatchSelected}
                                 swatches={listingItems}
                                 filters={allFilters}
                                 selectedSwatch={selectedRow}
                                 selectedSubSwatch={selectedColumn}
                                 getSubSwatchInfo={getColorSwatch}
                                 resolveThumbnailPath={resolveThumbnailPath}/>

                <VerticalListing className={"scenes"}
                                 visible={activePanel === Panel.Scenes}
                                 onClick={sceneSelected}
                                 swatches={sceneListingItems}
                                 selectedSwatch={selectedSceneRow}
                                 selectedSubSwatch={selectedSceneColumn}
                                 resolveThumbnailPath={resolveSceneThumbnailPath}/>

            </div>

            {siteContext.state.siteData &&
            <div className={"panel b"}>

                <CBARView onContextCreated={setContext}
                          toolMode={toolMode}
                          onTouchMove={onVisTouchMove}
                          onTranslate={onVisTranslate}
                          onRotate={onVisRotate}>
                    <SceneOptions scene={currentScene}
                                  selectionChanged={selectionChanged}
                                  handleOption={handleAction} />
                </CBARView>

                {_isFeatureEnabled("upload") && (<ImageUpload onImageChosen={onImageChosen} onProgress={onProgress} />)}

                <ChooseScene hidden={!showSceneSelector} siteData={siteContext.state.siteData} onSourceClicked={sourceChosen} />

                <div className={"visualizer-buttons-right"} style={{visibility:showUploadButton || !currentScene || isToolOverlayOpen ? "hidden" : "visible"}}>
                    <ZoomControls context={context} />
                    <Fab onClick={() => setShareModal(true)} className="MuiFab-primary">
                        <Icon>share</Icon>
                    </Fab>
                    <VisualizerTools actions={toolActions} handleAction={handleAction} />
                </div>

                <ShareModal
                  onClose={() => setShareModal(false)}
                  logoSrc={brandLogo}
                  resolveThumbnailPath={resolveThumbnailPath}
                  isOpen={isShareModalOpen}
                  products={products}
                  shareImageUrl={shareImageUrl}
                  scene={currentScene}
                />

                <EditSurfaceTool onEditFinished={editSurfaceFinished}
                                 surface={selectedSurface}
                                 toolMode={toolMode}
                                 onToolChanged={setToolMode} />

                <RotateTool visible={toolMode === CBARToolMode.Rotate}
                            rotation={toolMode === CBARToolMode.Rotate ? currentRotation : initialRotation}
                            onRotationStarted={rotateStarted}
                            onRotationChanged={rotateChanged}
                            onRotationFinished={rotateFinished} />

                <TranslateTool visible={toolMode === CBARToolMode.Translate}
                               xPos={toolMode === CBARToolMode.Translate ? currentXPos : initialXPos}
                               yPos={toolMode === CBARToolMode.Translate ? currentYPos : initialYPos}
                               onTranslationStarted={translationStarted}
                               onTranslationChanged={translationChanged}
                               onTranslationFinished={translationFinished} />
                   
                <ColorLegend swatches={products} activeSwatch={selectedProduct ? selectedProduct : undefined} resolveThumbnailPath={resolveThumbnailPath} swatchClicked={swatchClicked}  />

                {/*logo button*/}
                {!InsideIframe && siteContext.state.siteData && siteContext.state.siteData.appearance.logo &&
                    <img className={"floating-logo"} src={`${brandPath}/${siteContext.state.siteData.appearance.logo.src}`} alt={"logo"} />}

                {/*left panel open button*/}
                {(currentScene || activePanel !== Panel.None) && <Fab variant={leftPanelButtonText ? "extended" : "circular"} className={"MuiFab-primary close-button panel-a" + (hasSeenProducts ? "" : " bounce")}
                                                                      onClick={()=>productsClicked()}>
                    <Icon>
                        {leftPanelOpen ? (isPortrait ? "keyboard_arrow_down" : "keyboard_arrow_left") : (isPortrait ? "keyboard_arrow_up" : "keyboard_arrow_right")}
                    </Icon>
                    <span>{leftPanelButtonText}</span>
                </Fab>}

                {/*right panel open button or open product url*/}
                {currentScene && selectedProduct && <Fab variant={rightPanelButtonText ? "extended" : "circular"}
                                                         className={`MuiFab-primary close-button panel-c ${hasDetailsPanel ? "" : "call-to-action"}`}
                                                         onClick={()=>productDetailsClicked()}>
                    {rightButtonIcon}
                    <span>{rightPanelButtonText}</span>
                </Fab>}

            </div>}

            <div className={"panel c"} style={{visibility:hasDetailsPanel ? "visible" : "hidden"}} onMouseOut={()=>setPanelTimer()} onMouseOver={()=>clearPanelTimer()}>

                {!isPortrait && <div className={"title"}>
                    <div className={"choose info" + (activePanel === Panel.ProductInfo ? " selected" : "")} onClick={()=>setActivePanel(Panel.Products)}>
                        <div className={"choose-text"}>Product Details</div>
                    </div>
                    {siteContext.state.siteData && siteContext.state.siteData.appearance.sharing &&
                    <div className={"choose share" + (activePanel === Panel.Share ? " selected" : "")} onClick={()=>setActivePanel(Panel.Share)}>
                        <div className={"choose-text"}>Share</div>
                    </div>}
                </div>}

                {hasDetailsPanel && selectedProduct?.parent && (
                    <ProductDetails className={"info"}
                                 visible={activePanel === Panel.ProductInfo}
                                 title={selectedProduct.parent.displayName}
                                 subTitle={selectedProduct.displayName}
                                 code={selectedProduct.code}
                                 resolveUrl={resolveDetailsUrl}
                                 details={productDetails}
                    />)}
            </div>

            {isMobile && activePanel === Panel.ProductInfo && <Fab className={"mobile-close"} onClick={()=>setActivePanel(Panel.None)}><Icon>close</Icon></Fab>}

            <Progress visible={progressVisible} percentage={progressPercentage} statusText={progressText} />
        </div>
    ), [activePanel, currentScene, navigationItem, navClicked, swatchSelected, listingItems, allFilters, selectedRow, selectedColumn, getColorSwatch, resolveThumbnailPath, sceneSelected, sceneListingItems, selectedSceneRow, selectedSceneColumn, resolveSceneThumbnailPath, siteContext.state.siteData, toolMode, onVisTouchMove, onVisTranslate, onVisRotate, selectionChanged, handleAction, _isFeatureEnabled, onImageChosen, onProgress, showSceneSelector, sourceChosen, showUploadButton, isToolOverlayOpen, context, toolActions, shareImageUrl, isShareModalOpen, brandLogo, products, editSurfaceFinished, selectedSurface, currentRotation, initialRotation, rotateStarted, rotateChanged, rotateFinished, currentXPos, initialXPos, currentYPos, initialYPos, translationStarted, translationChanged, translationFinished, selectedProduct, swatchClicked, brandPath, leftPanelButtonText, hasSeenProducts, leftPanelOpen, isPortrait, rightPanelButtonText, hasDetailsPanel, rightButtonIcon, resolveDetailsUrl, productDetails, isMobile, progressVisible, progressPercentage, progressText, setPanelTimer, clearPanelTimer, productsClicked, productDetailsClicked])
}
