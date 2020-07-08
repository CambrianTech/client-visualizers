import React, {createRef, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import 'react-dat-gui/build/react-dat-gui.css'
import './Visualizer.css'

import {
    CBARAssetType,
    CBARContext,
    CBAREventType,
    CBARMode,
    CBARMouseEvent,
    CBARPaintAsset,
    CBARRugAsset,
    CBARScene,
    CBARSurface,
    CBARSurfaceAsset,
    CBARSurfaceType,
    CBARTangibleAsset,
    CBARTiledAsset,
    cbInitialize,
    DataFilter,
    DataFilterOperator,
    Product,
    ProductBase,
    ProductBrand,
    ProductColor,
    SurfaceTypeFilter,
    SwatchItem,
} from "react-home-ar";

import {SiteContext} from '../data/SiteContext';
import MaterialIcon from "@material/react-material-icon";
import {Fab} from "@material/react-fab";
import {
    ContextMenu,
    ContextMenuItem,
    ImageUpload,
    openImageDialog,
    ProductBreadcrumb,
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
    CBTextureLoadError,
    CBTextureLoadErrorReason,
    CBToolMode,
    CBVisualizer,
} from "react-home-harmony";

enum ContextMenuAction {
    setMaterial,
    remove,
    editArea,
    rotateAsset,
    moveAsset,
}

const SCENE7_ROOT = "https://d1ejxwivgbbibc.cloudfront.net"

let SCENE_NAME:string|undefined = undefined

SCENE_NAME = "assets/scenes/simple-room"

export enum ServerFile {
    Mask = "mask",
    Preview = "preview",
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
    const dispatch = siteContext.dispatch

    const [isToolOverlayOpen, setIsToolOverlayOpen] = useState(false);

    const [toolMode, setToolMode] = useState(CBToolMode.Select);
    const [historySize] = useState<number>(0);

    const [initialRotation, setInitialRotation] = useState<number>(0);

    const [initialXPos, setInitialXPos] = useState<number>(0);
    const [initialYPos, setInitialYPos] = useState<number>(0);

    const _isMounted = useRef(false);

    const [ , setIsUploadedImage] = useState<boolean>();
    const contextMenu = createRef<ContextMenu>();

    const [cbar, setCBAR] = useState<CBARContext>();
    const [currentScene, setCurrentScene] = useState<CBARScene>();
    const [selectedSurface, setSelectedSurface] = useState<CBARSurface>();
    const [selectedAsset, setSelectedAsset] = useState<CBARTangibleAsset>();
    const surfaceAsset = selectedAsset instanceof CBARSurfaceAsset ? selectedAsset as CBARSurfaceAsset : undefined

    const [statusText, setStatusText] = useState("")
    const [progressPercentage, setProgressPercentage] = useState(0)
    const [progressVisible, setProgressVisible] = useState(false)

    const [rootItem, setRootItem] = useState<SwatchItem>();

    const [navigationItem, setNavigationItem] = useState<SwatchItem>();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [filters, setFilters] = useState<DataFilter[]>();
    const [listingItems, setListingItems] = useState<SwatchItem[]>();
    const [selectedRow, setSelectedRow] = useState<SwatchItem>();
    const [selectedColumn, setSelectedColumn] = useState<SwatchItem>();
    const [basePath, setBasePath] = useState()

    //legacy stuff:
    const [materialProperties, setMaterialProperies] = useState<CBMaterialProperties>()
    const position = siteContext.state.position || [0, 1, 0];
    const rotation = siteContext.state.rotation || [0, 0, 0];
    const fov = siteContext.state.fov || 60;

    const [rotationControlActive, setRotationControlActive] = useState(false);
    const [rotationControlValue, setRotationControlValue] = useState(0); // Temporary rotation offset (not applied yet)

    useEffect(() => {
        _isMounted.current = true;

        fetch('assets/data/products.json').then(res => res.json())
            .then(json => {
                setBasePath(json.basePath)

                const brands:ProductBrand[] = []
                for (const brandJson of json.brands) {
                    const brand = new ProductBrand()
                    brand.load(brandJson)
                    brands.push(brand)
                }

                let rootItem:SwatchItem = brands[0]
                while (!(rootItem instanceof Product) && rootItem.children.length === 1) {
                    rootItem = rootItem.children[0]
                }

                setRootItem(rootItem)
            })

        return () => {
            _isMounted.current = false
        }
    }, []);

    const [panelOpen, _setPanelOpen] = useState<boolean>(false);
    const productSelectorPanel = createRef<HTMLDivElement>()
    const setPanelOpenClose = useCallback((open:boolean) => {
        if (productSelectorPanel.current) {
            productSelectorPanel.current.classList.remove("open")
            if (open) {
                productSelectorPanel.current.classList.add("open")
            }
        }
        _setPanelOpen(open)
    }, [productSelectorPanel]);

    const onChangeImage = useCallback(() => {
        openImageDialog()
    }, [])

    const onImageChosen = useCallback((data: any) => {
        if (!cbar) return

        setIsUploadedImage(true)

        cbar.loadSceneData(data).then(()=>{
            //context.startVideoCamera()
            console.log("V2 Scene Loaded!")
        }).catch(error=>{
            console.log("Could not load scene!")
        })

    }, [cbar])

    const onProgress = useCallback((uploadProgress: UploadProgress) => {
        if (!_isMounted.current) return
        if (uploadProgress.message) {
            setStatusText(uploadProgress.message)
        }
        if (uploadProgress.progress !== undefined) {
            setProgressPercentage(uploadProgress.progress)
        }
        setProgressVisible(uploadProgress.visible)

        if (uploadProgress.error) {
            switch (uploadProgress.error.constructor) {
                case Promise: {
                    const promise = uploadProgress.error as Promise<any>;
                    promise.catch((error: any) => {
                        dispatch({ type: "setError", error: error })
                    })
                    break;
                }
                default: {
                    dispatch({ type: "setError", error: uploadProgress.error })
                }
            }
        }

    }, [dispatch]);

    const toolsShowHideButtons = useCallback((show: boolean) => {
        if (!_isMounted.current) return
        setIsToolOverlayOpen(!show)
    }, []);

    const rotateChanged = useCallback((radians: number) => {
        if (!_isMounted.current || !surfaceAsset) return

        surfaceAsset.surfaceRotation = radians

    }, [surfaceAsset]);

    const rotateFinished = useCallback((commit: boolean, radians: number) => {
        if (!_isMounted.current || !surfaceAsset) return

        surfaceAsset.surfaceRotation = commit ? radians : initialRotation

    }, [initialRotation, surfaceAsset]);

    const translationChanged = useCallback((xPos: number, yPos: number) => {
        if (!_isMounted.current || !surfaceAsset) return

        surfaceAsset.setSurfacePosition(xPos, yPos)

    }, [surfaceAsset]);

    const translationFinished = useCallback((commit: boolean, xPos: number, yPos: number) => {
        if (!_isMounted.current || !surfaceAsset) return

        surfaceAsset.setSurfacePosition(commit ? xPos : initialXPos, commit ? yPos : initialYPos)

    }, [initialXPos, initialYPos, surfaceAsset]);

    const toolChanged = useCallback((mode: VisualizerToolMode) => {
        if (!_isMounted.current || !surfaceAsset) return

        // setToolMode(mode)
        //
        // if (toolMode === VisualizerToolMode.Rotate) {
        //     setInitialRotation(surfaceAsset.surfaceRotation)
        // } else if (toolMode === VisualizerToolMode.Translate) {
        //     setInitialXPos(surfaceAsset.surfacePosition.x)
        //     setInitialYPos(surfaceAsset.surfacePosition.y)
        // }

    }, [surfaceAsset]);

    const captureClicked = useCallback(() => {
        if (!cbar) return

        if (cbar.getMode() === CBARMode.Video) {
            cbar.captureImage().then(image=>{
                cbar.loadImage(image)
            })
        } else {
            cbar.startVideoCamera()
        }

    }, [cbar]);


    const resolveThumbnailPath = useCallback((swatchItem:SwatchItem) => {

        if (!(swatchItem instanceof ProductBase)) return

        const path = `${basePath}/textures/${swatchItem.thumbnail}`

        return path

    }, [basePath]);

    const resolveTileImagePath = useCallback((name:string) => {
        return `assets/img/installation-types/pattern-${name.toLowerCase()}.svg`
    }, []);

    const chooseColor = useCallback((color:ProductColor) => {

        if (!cbar) return;

        if (!selectedSurface) {
            console.log("No surface is selected")
            return
        }

        let surfaceAsset:CBARSurfaceAsset = selectedAsset as CBARSurfaceAsset


        if (!selectedSurface.length()) {
            const type = color.assetType ? color.assetType : CBARAssetType.TiledSurface

            if (type === CBARAssetType.PaintSurface) {
                surfaceAsset = new CBARPaintAsset(cbar)
            } else if (type === CBARAssetType.Rug) {
                surfaceAsset = new CBARRugAsset(cbar)
            } else {
                surfaceAsset = new CBARTiledAsset(cbar)
            }

            //console.log(`Created asset of type ${surfaceAsset.type}`)
            selectedSurface.add(surfaceAsset)
            setSelectedAsset(surfaceAsset)
        }

        let materialProps:any = undefined
        if (surfaceAsset.type === CBARAssetType.PaintSurface) {
            //take sheen and stuff into account
            materialProps = {material:{
                    properties: {
                        color: color.color,
                        roughnessValue: 0.3,
                        metalnessValue: 0.35,
                    }
                }
            }
        }
        else if (surfaceAsset.type === CBARAssetType.Rug) {
            //take sheen and stuff into account
            materialProps = {materials:[ {
                    ppi: 20,
                    properties: {
                        roughnessValue: 0.3,
                        metalnessValue: 0.15
                    }
                }]
            }
        }
        else {
            color.ppi = color.ppi ? color.ppi : 20
            const scale = color.scale ? color.scale : 1.0

            const textures = []

            if (color.textures.length) {
                for (const tex of color.textures) {
                    textures.push(tex.json)
                }
            } else {
                let data:any = {}

                if (color.metaData.hasOwnProperty("albedo")) {
                    data.albedo = `${basePath}/textures/${color.metaData.albedo}`
                }
                if (color.metaData.hasOwnProperty("roughness")) {
                    data.roughness = `${basePath}/textures/${color.metaData.roughness}`
                }
                if (color.metaData.hasOwnProperty("normals")) {
                    data.normals = `${basePath}/textures/${color.metaData.normals}`
                }

                textures.push(data)
            }

            const materials = []

            for (let json of textures) {
                materials.push( {
                    ppi: color.ppi / scale,
                    textures: json,
                    properties: {
                        roughnessValue: 0.3,
                        metalnessValue: 0.15
                    }
                })
            }

            materialProps = {materials:materials}

        }

        surfaceAsset.loadProduct(color, materialProps).catch((error:any) => {
            console.error(error)
        })

    }, [basePath, cbar, selectedAsset, selectedSurface]);

    const swatchSelected = useCallback((swatchItem:SwatchItem) => {

        if (!cbar) return;

        if (swatchItem instanceof ProductColor) {
            setSelectedColumn(swatchItem)
            chooseColor(swatchItem)
        } else if (swatchItem instanceof Product) {
            setSelectedRow(swatchItem)
        } else if (swatchItem instanceof ProductBase) {
            setListingItems(swatchItem.children)
            setNavigationItem(swatchItem)
        }

    }, [cbar, chooseColor]);

    const navClicked = useCallback((swatchItem:SwatchItem) => {
        setListingItems(swatchItem.children)
    }, []);

    const rootNavClicked = useCallback(() => {
        if (rootItem) {
            setListingItems(rootItem.children)
            setNavigationItem(rootItem)
        }
    }, [rootItem]);

    useEffect(() => {
        if (rootItem && !listingItems) {
            setListingItems(rootItem.children)
        }
    }, [listingItems, rootItem]);

    useEffect(() => {
        if (selectedSurface && !selectedSurface.length() && rootItem) {
            setListingItems(rootItem.children)
            setNavigationItem(rootItem)
        }
        else if (selectedAsset && selectedAsset.product && selectedAsset.product instanceof ProductColor) {
            const color = selectedAsset.product as ProductColor
            setListingItems(color.collection.products)
            setNavigationItem(color.collection)
            setSelectedRow(color.product)
            setSelectedColumn(color)
        }
    }, [rootItem, selectedAsset, selectedSurface]);

    const handleEvent = useCallback((event:CBARMouseEvent) => {
        if (!currentScene) return

        if (event.type === CBAREventType.Click && contextMenu.current) {

            const assetIntersection = event.intersections.find(x => x.object instanceof CBARTangibleAsset)
            const surfaceIntersection = event.intersections.find(x => x.object instanceof CBARSurface)

            let surface = surfaceIntersection ? surfaceIntersection.object as CBARSurface : undefined
            let asset = assetIntersection ? assetIntersection.object as CBARTangibleAsset : undefined

            if (surface || asset) {

                if (surface) {
                    setSelectedSurface(surface)
                    if (surface.length()) {
                        asset = Object.values(surface.objects)[0]
                    }
                }

                setSelectedAsset(asset)

                const items = [
                    new ContextMenuItem({key:ContextMenuAction.setMaterial, title:"Set Material"}),
                    new ContextMenuItem({key:ContextMenuAction.editArea, title:"Edit Area"}),
                ]

                if (surface) {
                    contextMenu.current.title = "Modify Surface"
                }

                if (asset) {
                    items.push(new ContextMenuItem({key:ContextMenuAction.remove, title:"Remove Material"}))
                    if (asset.canMove) {
                        items.push(new ContextMenuItem({key:ContextMenuAction.rotateAsset, title:"Rotate Material"}))
                        items.push(new ContextMenuItem({key:ContextMenuAction.moveAsset, title:"Move / Translate Material"}))
                    }
                }

                contextMenu.current.items = items
                contextMenu.current.showMenu(asset ? asset : surface, event)
            }
        }
    }, [contextMenu, currentScene])

    const panelMouseTimeout = useRef(0)
    const panelMouseOver = useCallback(() => {
        if (panelMouseTimeout.current) {
            clearTimeout(panelMouseTimeout.current)
            panelMouseTimeout.current = 0
        }
    }, []);

    const panelMouseOut = useCallback(() => {
        if (panelMouseTimeout.current) return

        panelMouseTimeout.current = setTimeout(()=>{
            setPanelOpenClose(false)
        }, 1000)
    }, [setPanelOpenClose]);

    useEffect(() => {
        if (cbar && contextMenu) {
            cbar.setHandler(handleEvent)
        }
    }, [cbar, contextMenu, handleEvent]);

    const allFilters = useMemo<DataFilter[]>(()=>{
        const allFilters:DataFilter[] = filters ? filters:[]
        if (selectedSurface) {
            if (selectedSurface.type !== CBARSurfaceType.Unknown) {
                allFilters.push(new SurfaceTypeFilter(selectedSurface.type, DataFilterOperator.AND))
            }
        }
        return allFilters
    }, [filters, selectedSurface])

    const isUploadedImage = useCallback(() => {
        if (siteContext.state.sceneData) {
            return siteContext.state.sceneData.backgroundUrl.indexOf("amazon.com") < 0
        }
        return false
    }, [siteContext.state.sceneData]);

    return useMemo(() => (
        <div className={"visualizer"}>

            <CBVisualizer
                toolMode={toolMode}
                canLoad={true}
                material={materialProperties}
                defaultMaterial = {new CBMaterialProperties(20,"assets/scenes/blue-tile.jpeg")}
                scene={siteContext.state.sceneData}
                fov={fov}
                cameraPosition={position}
                cameraRotation={[rotation[0], 0, rotation[2]]}
                floorRotation={rotation[1] + (rotationControlActive ? rotationControlValue : (siteContext.state.floorRotationOffset || 0))}
                showControls={siteContext.state.showControls}
                blendEdges={isUploadedImage()}
            />

            <div ref={productSelectorPanel} className={"product-selector"} onMouseOver={panelMouseOver} onMouseOut={panelMouseOut}>
                <div className={"panel"}>
                    <div className={"title"}>Choose a Product</div>
                    <ProductBreadcrumb currentItem={navigationItem} onClick={navClicked} firstElement={<button onClick={rootNavClicked}>Home</button>}  />
                    <VerticalListing onClick={swatchSelected}
                                     swatches={listingItems}
                                     filters={allFilters}
                                     selectedSwatch={selectedRow}
                                     selectedSubSwatch={selectedColumn}
                                     resolveThumbnailPath={resolveThumbnailPath}/>
                </div>
                <div className={"close-button-container"}>
                    <Fab className={"close-button"} onClick={()=>setPanelOpenClose(!panelOpen)} icon={<MaterialIcon icon={panelOpen ? "keyboard_arrow_left" :  "keyboard_arrow_right"} />} />
                </div>
            </div>

            <Fab style={{visibility:"hidden"}} className="capture-button" onClick={captureClicked} icon={<MaterialIcon icon='camera' />} />

            <ImageUpload onImageChosen={onImageChosen} onProgress={onProgress}/>

            <Progress visible={progressVisible} percentage={progressPercentage} statusText={statusText} />
        </div>
    ), [allFilters, captureClicked, fov, isUploadedImage, listingItems, materialProperties, navClicked, navigationItem, onImageChosen, onProgress, panelMouseOut, panelMouseOver, panelOpen, position, productSelectorPanel, progressPercentage, progressVisible, resolveThumbnailPath, rootNavClicked, rotation, rotationControlActive, rotationControlValue, selectedColumn, selectedRow, setPanelOpenClose, siteContext.state.floorRotationOffset, siteContext.state.sceneData, siteContext.state.showControls, statusText, swatchSelected, toolMode])
}
