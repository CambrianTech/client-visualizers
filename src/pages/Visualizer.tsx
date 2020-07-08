import React, {createRef, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import 'react-dat-gui/build/react-dat-gui.css'
import './Visualizer.css'

import {
    CBARAsset,
    CBARAssetType,
    CBARContext,
    CBAREventType,
    CBARMode,
    CBARMouseEvent,
    CBARObject3D,
    CBARPaintAsset,
    CBARRugAsset,
    CBARScene,
    CBARSurface,
    CBARSurfaceAsset,
    CBARSurfaceType,
    CBARTangibleAsset,
    CBARTiledAsset,
    CBARView,
    cbInitialize,
    DataFilter,
    DataFilterOperator,
    Product,
    ProductBase,
    ProductBrand,
    ProductCollection,
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

    const [toolMode, setToolMode] = useState(VisualizerToolMode.None);
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

    const [availableBrands, setAvailableBrands] = useState<ProductBrand[]>();

    const [navigationItem, setNavigationItem] = useState<SwatchItem>();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [filters, setFilters] = useState<DataFilter[]>();
    const [listingItems, setListingItems] = useState<SwatchItem[]>();
    const [selectedRow, setSelectedRow] = useState<SwatchItem>();
    const [selectedColumn, setSelectedColumn] = useState<SwatchItem>();

    useEffect(() => {
        _isMounted.current = true;

        fetch('assets/data/products.json').then(res => res.json())
            .then(json => {
                //console.log(json.brands)
                const brands:ProductBrand[] = []
                for (const brandJson of json.brands) {
                    const brand = new ProductBrand()
                    brand.load(brandJson)
                    brands.push(brand)
                }
                setAvailableBrands(brands)
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
        setToolMode(mode)

        if (toolMode === VisualizerToolMode.Rotate) {
            setInitialRotation(surfaceAsset.surfaceRotation)
        } else if (toolMode === VisualizerToolMode.Translate) {
            setInitialXPos(surfaceAsset.surfacePosition.x)
            setInitialYPos(surfaceAsset.surfacePosition.y)
        }

    }, [surfaceAsset, toolMode]);

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

    const onContextMenuClick = useCallback((row:ContextMenuItem, obj:CBARObject3D<any>|undefined) => {

        const surface = obj as CBARSurface
        const asset = obj as CBARAsset

        switch (row.props.key) {
            case ContextMenuAction.setMaterial:
                setPanelOpenClose(true)
                break
            case ContextMenuAction.editArea:
                console.log("EDIT AREA")
                break
            case ContextMenuAction.remove:
                if (obj instanceof CBARSurface) {
                    surface.clearAll()
                } else if (obj instanceof CBARAsset) {
                    asset.removeFromScene()
                }
                setSelectedAsset(undefined)
                break

            case ContextMenuAction.rotateAsset:
                setToolMode(VisualizerToolMode.Rotate)
                break

            case ContextMenuAction.moveAsset:
                setToolMode(VisualizerToolMode.Translate)
                break

            default:
                console.log(`onContextMenuClick"${row.props.title}" has no defined case statement`)
        }
    }, [setPanelOpenClose]);

    const onContextCreated = useCallback((context:CBARContext) => {
        setCBAR(context)

        if (SCENE_NAME) {
            context.loadSceneAtPath(SCENE_NAME).then((scene)=>{
                setCurrentScene(scene)
                console.log("Scene Loaded!")
            }).catch(error=>{
                console.log("Could not load scene!")
            })
        }

    }, []);

    const resolveShawThumbnailPath = useCallback((swatchItem:SwatchItem) => {

        if (swatchItem.thumbnail) {
            return swatchItem.thumbnail
        }
        else if (swatchItem instanceof ProductCollection) {
            const collection = swatchItem as ProductCollection
            if (collection.products.length) {
                const product = collection.products[0];
                return `${SCENE7_ROOT}/ShawIndustries/${product.code}_${product.metaData.UniqueId}_MAIN?fit=crop&wid=360&hei=210&fmt=png`
            }
        } else if (swatchItem instanceof Product) {
            const product = swatchItem as Product
            return `${SCENE7_ROOT}/ShawIndustries/${product.code}_${product.metaData.UniqueId}_MAIN?fit=crop&wid=360&hei=210&fmt=png`
        } else if (swatchItem instanceof ProductColor) {
            const color = swatchItem as ProductColor
            return `${SCENE7_ROOT}/ShawIndustries/${color.product!.code}_${color.code}_MAIN?fit=crop&wid=315&hei=315&fmt=png`
        }
    }, []);

    const resolveThumbnailPath = useCallback((swatchItem:SwatchItem) => {

        if (!(swatchItem instanceof ProductBase)) return

        if (swatchItem.brand.root.name === "shawfloors") {
            return resolveShawThumbnailPath(swatchItem)
        } else if (swatchItem.brand.name === "wallpaper") {
            if (swatchItem instanceof Product || swatchItem instanceof ProductColor) {
                return `assets/textures/wallpaper/${swatchItem.thumbnail}`
            }
        }
        return swatchItem.thumbnail

    }, [resolveShawThumbnailPath]);

    const resolveTileImagePath = useCallback((name:string) => {
        return `assets/img/installation-types/pattern-${name.toLowerCase()}.svg`
    }, []);

    const resolveShawAlbedoPath = useCallback((color:ProductColor) => {

        if (color.textures.length === 1 && color.textures[0].albedoPath) {
            return `${window.location.origin}/${color.textures[0].albedoPath}`
        }

        //return "https://d1ejxwivgbbibc.cloudfront.net/ShawIndustriesRender/SA593_09004_MAIN?res=20&resMode=sharp&scl=1&fmt=jpg"
        const ppi = color.ppi ? color.ppi : 20
        return `${SCENE7_ROOT}/ShawIndustriesRender/${color.product!.code}_${color.code}_MAIN?res=${ppi}&resMode=sharp&scl=1&fmt=jpg`
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
            } else if (color.brand.root.name === "shawfloors") {
                textures.push({albedo:resolveShawAlbedoPath(color)})
            } else if (color.brand.name === "wallpaper") {
                textures.push({albedo:`assets/textures/wallpaper/${color.metaData.image}`})
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

    }, [cbar, resolveShawAlbedoPath, selectedAsset, selectedSurface]);

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
        setListingItems(availableBrands)
        setNavigationItem(undefined)
    }, [availableBrands]);

    useEffect(() => {
        if (availableBrands && !listingItems) {
            setListingItems(availableBrands)
        }
    }, [availableBrands, listingItems]);

    useEffect(() => {
        if (selectedSurface && !selectedSurface.length()) {
            setListingItems(availableBrands)
            setNavigationItem(undefined)
        }
        else if (selectedAsset && selectedAsset.product && selectedAsset.product instanceof ProductColor) {
            const color = selectedAsset.product as ProductColor
            setListingItems(color.collection.products)
            setNavigationItem(color.collection)
            setSelectedRow(color.product)
            setSelectedColumn(color)
        }
    }, [availableBrands, selectedAsset, selectedSurface]);

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

    return useMemo(() => (
        <div className={"visualizer"}>
            <CBARView className={"cbarview"} onContextCreated={onContextCreated} />
            <VisualizerTools
                visible={!isToolOverlayOpen}
                context={cbar}
                selectedSurface={selectedSurface}
                selectedAsset={selectedAsset}
                mode={toolMode}
                changeMode={toolChanged}
                onChangeImage={onChangeImage}

                initialRotation={initialRotation}
                onRotationChanged={rotateChanged}
                onRotationFinished={rotateFinished}

                initialXPos={initialXPos}
                initialYPos={initialYPos}
                onTranslationChanged={translationChanged}
                onTranslationFinished={translationFinished}

                patternSelectorImagePath={resolveTileImagePath}
                patternSelectorRestrictToProducts={true}

                historySize={historySize}
                onShowHideButtons={toolsShowHideButtons}
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

            <ContextMenu ref={contextMenu} onClick={onContextMenuClick} />

            <Fab style={{visibility:"hidden"}} className="capture-button" onClick={captureClicked} icon={<MaterialIcon icon='camera' />} />

            <ImageUpload onImageChosen={onImageChosen} onProgress={onProgress}/>

            <Progress visible={progressVisible} percentage={progressPercentage} statusText={statusText} />
        </div>
    ), [allFilters, captureClicked, cbar, contextMenu, historySize, initialRotation, initialXPos, initialYPos, isToolOverlayOpen, listingItems, navClicked, navigationItem, onChangeImage, onContextCreated, onContextMenuClick, onImageChosen, onProgress, panelMouseOut, panelMouseOver, panelOpen, productSelectorPanel, progressPercentage, progressVisible, resolveThumbnailPath, resolveTileImagePath, rootNavClicked, rotateChanged, rotateFinished, selectedAsset, selectedColumn, selectedRow, selectedSurface, setPanelOpenClose, statusText, swatchSelected, toolChanged, toolMode, toolsShowHideButtons, translationChanged, translationFinished])
}
