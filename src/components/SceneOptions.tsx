import React, {createRef, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import 'react-circular-progressbar/dist/styles.css'

import './SceneOptions.css'
import {SpeedDial, SpeedDialAction, SpeedDialIcon} from "@material-ui/lab";
import {makeStyles} from "@material-ui/core";
import {DefaultAssetMenuActions, ToolOperation, ToolsMenuAction} from "react-cambrian-ui";
import {
    CBARAsset, CBAREvent,
    CBAREventHandler,
    CBAREventType,
    CBARMouseEvent,
    CBARPaintAsset,
    CBARScene,
    CBARSurface,
    CBARSurfaceAsset,
    CBARToolMode, Point2D, Rectangle
} from "react-home-ar";

export type ObjectTypes = CBARAsset|CBARSurface
type OptionMenuHandler = (object:ObjectTypes)=>ToolsMenuAction[]

export type OptionMenuAction = ToolsMenuAction & {
    object:ObjectTypes
}

type OptionMenuProps = {
    hidden?:boolean
    object:ObjectTypes
    scene?:CBARScene,
    actions:OptionMenuHandler
    handleOption:(event:OptionMenuAction)=>void
    menuOpen:boolean
    menuPoint:Point2D|undefined
    color?:string
    invalidRegions:Rectangle[]
    menuClicked:()=>void
}

const rectangleIntersection = (point:Point2D, rectangles:Rectangle[]) => {
    for (let i = 0; i < rectangles.length; i++) {
        let xStart = rectangles[i].x,
            yStart = rectangles[i].y,
            xEnd = xStart + rectangles[i].width,
            yEnd = yStart + rectangles[i].height;

        if ((point.x >= xStart && point.x <= xEnd) &&
            (point.y >= yStart && point.y <= yEnd)) {
            return rectangles[i];
        }
    }
    return null;
};

const REGION_SIZE:Point2D = {x:0.2, y:0.15}

const TOP_RIGHT = {x:1 - REGION_SIZE.x, y:0, width:REGION_SIZE.x, height:REGION_SIZE.y}
const BOTTOM_RIGHT = {x:1 - REGION_SIZE.x, y:1 - REGION_SIZE.y, width:REGION_SIZE.x, height:REGION_SIZE.y}
const BOTTOM_LEFT = {x:0.0, y:1-REGION_SIZE.y, width:REGION_SIZE.x, height:REGION_SIZE.y}
const TOP_LEFT = {x:0.0, y:0.0, width:REGION_SIZE.x, height:REGION_SIZE.y}

const CORNERS = [TOP_RIGHT, BOTTOM_RIGHT, BOTTOM_LEFT, TOP_LEFT]

const OptionMenu = React.memo<OptionMenuProps>(
    (props) => {

        const surfaceAsset = props.object instanceof CBARSurfaceAsset ? props.object as CBARSurfaceAsset : undefined;

        const menuStyles = useMemo(()=>{
            return makeStyles(() => ({
                speedDial: {
                    position: 'absolute',
                    left: `${props.menuPoint ? (props.menuPoint.x).toFixed(1) : 0}px`,
                    top: `${props.menuPoint ? (props.menuPoint.y).toFixed(1) : 0}px`,
                },
                staticTooltip: {
                    whiteSpace:"nowrap"
                },
                fab: {
                    backgroundColor: props.color ? `${props.color} !important` : undefined
                }
            }))
        }, [props.color, props.menuPoint])

        const menuClasses = menuStyles();

        const isMobile = window.outerWidth < 400;
        const actions = useMemo(()=>{
            if (props.hidden) {
                return []
            }
            let actions = props.actions(props.object)
            if (!actions) return actions

            if (!surfaceAsset || !surfaceAsset.canMove) {
                actions = actions.filter(item=>item.operation !== CBARToolMode.Rotate && item.operation !== CBARToolMode.Translate && item.operation !== ToolOperation.ChoosePattern);
            }

            return actions
        }, [props, surfaceAsset])

        const onMenuClick = useCallback((action:ToolsMenuAction)=>{
            props.handleOption({object: props.object, ...action})
        }, [props])

        return (
            <SpeedDial
                direction={'down'}
                ariaLabel="Tools"
                className={menuClasses.speedDial}
                hidden={props.hidden}
                icon={<SpeedDialIcon />}
                open={props.menuOpen}
                FabProps={{ className:menuClasses.fab, size: "small"}}
                onClick={props.menuClicked}>
                {actions.map((action, index) => (
                    <SpeedDialAction
                        classes={{ staticTooltip: menuClasses.staticTooltip }}
                        key={action.name}
                        icon={action.icon}
                        tooltipTitle={!isMobile && action.longName ? action.longName : action.name}
                        tooltipOpen
                        onClick={()=>onMenuClick(action)}
                    />
                ))}
            </SpeedDial>
        );
    }
);

export type ObjectSelection = {
    surface?:CBARSurface | undefined
    asset?:CBARSurfaceAsset | undefined
}

export type AssetOptionsProperties = {
    scene?:CBARScene,
    actions?:OptionMenuHandler

    selectionChanged:(object:ObjectSelection)=>void
    handleOption:(action:OptionMenuAction)=>void
}

export function SceneOptions(props: AssetOptionsProperties) {

    const {scene, selectionChanged} = {...props};

    const actions = useMemo(()=>{
        return props.actions ? props.actions : ()=>{return [...DefaultAssetMenuActions]}
    }, [props.actions])

    const [openMenuObject, setOpenMenuObject] = React.useState<ObjectTypes>();
    const [selectedObject, setSelectedObject] = useState<ObjectTypes>();
    const [overObject, setOverObject] = useState<ObjectTypes>();

    const [clickOrigins, setClickOrigins] = useState<{[key: string]: Point2D}>({})

    useEffect(()=>{
        let selection:ObjectSelection = {}
        if (selectedObject instanceof CBARSurfaceAsset) {
            selection.asset = selectedObject
            selection.surface = selectedObject.surface
        } else if (selectedObject instanceof CBARSurface) {
            selection.surface = selectedObject
            selection.asset = undefined
        }
        selectionChanged(selection)
    }, [selectedObject, selectionChanged])

    const [clickEvent, setClickEvent] = useState<CBARMouseEvent>()

    const onClick = useCallback((event:CBAREvent)=>{
        setClickEvent(event as CBARMouseEvent);
    }, [])

    useEffect(()=>{
        if (!clickEvent) return

        setClickEvent(undefined);

        let obj:ObjectTypes|undefined = undefined;

        if (clickEvent.asset) {
            obj = clickEvent.asset
        }
        else if (clickEvent.surface) {
            obj = clickEvent.surface
        }

        if (!obj) return

        if (!openMenuObject) {
            clickOrigins[obj.id] = clickEvent.screenPoint
            setClickOrigins(clickOrigins);
        }

        setSelectedObject(obj);
        setOpenMenuObject(obj);

    }, [clickEvent, clickOrigins, openMenuObject])

    const onVisMouseOver = useCallback((event:CBARMouseEvent)=>{
        const object = event.asset ? event.asset : event.surface
        if (object) {
            setOverObject(object)
        }
    }, [])

    const onVisMouseOut = useCallback(()=>{
        //setOverObject(undefined)
    }, [])

    const [addedHandlers, setAddedHandlers] = useState(false)

    useEffect(()=>{
        if (scene && !addedHandlers) {
            setAddedHandlers(true);
            scene.context.addHandler(CBAREventType.TouchDown, onClick);
            scene.context.addHandler(CBAREventType.MouseOver, onVisMouseOver as CBAREventHandler);
            scene.context.addHandler(CBAREventType.MouseOut, onVisMouseOut as CBAREventHandler);
        }
    }, [addedHandlers, onClick, onVisMouseOut, onVisMouseOver, scene])

    const getObjects = useCallback(()=>{
        if (!scene) return
        let objects:ObjectTypes[] = []
        scene.geometry.surfaces.forEach(surface=>{
            if (surface.length()) {
                objects = objects.concat(surface.all())
            } else {
                objects.push(surface)
            }
        })
        return objects
    },[scene])

    const [objKey, setObjKey] = useState<string>()

    const objects = useMemo(()=>{
        if (objKey) {
            return getObjects()
        }
    }, [getObjects, objKey])

    const objectCallback = useCallback(()=>{
        const objects = getObjects();
        if (objects) {
            let key = "";
            objects.forEach(obj=>{
                key += obj.id;
                if (obj instanceof CBARSurfaceAsset && obj.product) {
                    key += obj.product.color
                }
            })
            setObjKey(key)
        }
    }, [getObjects])

    const objectMonitor = useRef(0)

    useEffect(()=>{
        objectMonitor.current = window.setInterval(objectCallback, 200)

        return () => {
            if (objectMonitor.current) {
                window.clearInterval(objectMonitor.current)
            }
        }
    }, [objectMonitor, objectCallback])

    const isVisible = useCallback((object:ObjectTypes)=>{
        return overObject === object || openMenuObject === object
    }, [overObject, openMenuObject])

    const getOrigin = useCallback((object:ObjectTypes)=>{
        if (clickOrigins[object.id]) {
            return clickOrigins[object.id]
        }
        else if ((object instanceof CBARSurface || object instanceof CBARSurfaceAsset) && object.menuPoint) {
            return {...object.menuPoint};
        }
        return undefined
    }, [clickOrigins])

    const getMenuPosition = useCallback((object:ObjectTypes)=>{
        const origin = getOrigin(object)
        if (origin) {
            return {x:origin.x - 30, y:origin.y - 20}
        }
        return undefined
    }, [getOrigin])

    const menuClicked = useCallback((object:ObjectTypes)=>{
        const openObject = object === openMenuObject ? undefined : object
        if (openObject) {
            setOpenMenuObject(openObject)
            setSelectedObject(openObject)
        } else {
            setOpenMenuObject(undefined)
        }
    }, [openMenuObject])

    const getMenuColor = useCallback((object:ObjectTypes)=>{
        return object instanceof CBARPaintAsset ? object.product?.color : undefined
    }, [])

    return (
        <div className={"scene-options"}>
            {objects?.map((object) => (
                <OptionMenu key={object.id}
                            {...props}
                            object={object}
                            hidden = {!isVisible(object)}
                            menuOpen={openMenuObject === object}
                            menuPoint={getMenuPosition(object)}
                            color={getMenuColor(object)}
                            actions={actions}
                            invalidRegions={CORNERS}
                            menuClicked={()=>menuClicked(object)}/>
            ))}
        </div>
    )
}