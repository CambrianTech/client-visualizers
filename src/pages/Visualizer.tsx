import React, {createRef, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import 'react-dat-gui/build/react-dat-gui.css'
import './Visualizer.css'

import {
    cbInitialize,
    DataFilter,
    Product,
    ProductBase,
    ProductBrand,
    ProductColor,
    SwatchItem,
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
} from "react-cambrian-ui";
import {Progress} from "../components/Progress";
import orientationImage from "../data/orientation6.jpg";

import {
    CBMaterialProperties,
    CBToolMode,
    CBVisualizer,
} from "react-home-harmony";

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

    const _isMounted = useRef(false);

    const [ , setIsUploadedImage] = useState<boolean>();

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
        console.log(data)
    }, [])

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

    const resolveThumbnailPath = useCallback((swatchItem:SwatchItem) => {

        if (!(swatchItem instanceof ProductBase)) return

        const path = `${basePath}/textures/${swatchItem.thumbnail}`

        return path

    }, [basePath]);

    const chooseColor = useCallback((color:ProductColor) => {

        const albedoPath = `${basePath}/textures/${color.metaData.albedo}`
        const ppi = color.ppi ? color.ppi : 20
        setMaterialProperies(new CBMaterialProperties(ppi, albedoPath))

    }, [basePath]);

    const swatchSelected = useCallback((swatchItem:SwatchItem) => {

        if (swatchItem instanceof ProductColor) {
            setSelectedColumn(swatchItem)
            chooseColor(swatchItem)
        } else if (swatchItem instanceof Product) {
            setSelectedRow(swatchItem)
        } else if (swatchItem instanceof ProductBase) {
            setListingItems(swatchItem.children)
            setNavigationItem(swatchItem)
        }

    }, [chooseColor]);

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


    const allFilters = useMemo<DataFilter[]>(()=>{
        const allFilters:DataFilter[] = filters ? filters:[]

        return allFilters
    }, [filters])

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

            <ImageUpload onImageChosen={onImageChosen} onProgress={onProgress}/>

            <Progress visible={progressVisible} percentage={progressPercentage} statusText={statusText} />
        </div>
    ), [allFilters, fov, isUploadedImage, listingItems, materialProperties, navClicked, navigationItem, onImageChosen, onProgress, panelMouseOut, panelMouseOver, panelOpen, position, productSelectorPanel, progressPercentage, progressVisible, resolveThumbnailPath, rootNavClicked, rotation, rotationControlActive, rotationControlValue, selectedColumn, selectedRow, setPanelOpenClose, siteContext.state.floorRotationOffset, siteContext.state.sceneData, siteContext.state.showControls, statusText, swatchSelected, toolMode])
}
