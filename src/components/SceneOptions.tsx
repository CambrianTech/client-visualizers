import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import 'react-circular-progressbar/dist/styles.css'

import './SceneOptions.css'
import {SpeedDial, SpeedDialAction, SpeedDialIcon} from "@material-ui/lab";
import {makeStyles} from "@material-ui/core";
import {DefaultAssetMenuActions, ToolOperation, ToolsMenuAction} from "react-cambrian-ui";
import {
    CBARAsset,
    CBAREventHandler,
    CBAREventType,
    CBARMouseEvent,
    CBARPaintAsset,
    CBARScene,
    CBARSurface,
    CBARSurfaceAsset,
    CBARToolMode, usleep
} from "react-home-ar";

export type ObjectTypes = CBARAsset|CBARSurface
type OptionMenuHandler = (object:ObjectTypes)=>ToolsMenuAction[]

export type OptionMenuAction = ToolsMenuAction & {
    object:ObjectTypes
}

type Point = {x:number, y:number}
type Rectangle = {x:number, y:number, width:number, height:number}

type OptionMenuProps = {
    hidden?:boolean
    object:ObjectTypes
    scene?:CBARScene,
    actions:OptionMenuHandler
    handleOption:(event:OptionMenuAction)=>void
    menuOpen:boolean
    origin:Point|undefined
    invalidRegions:Rectangle[]
    menuClicked:()=>void
}

const rectangleIntersection = (point:Point, rectangles:Rectangle[]) => {
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

const REGION_SIZE:Point = {x:0.15, y:0.15}

const TOP_RIGHT = {x:1 - REGION_SIZE.x, y:0, width:REGION_SIZE.x, height:REGION_SIZE.y}
const BOTTOM_RIGHT = {x:1 - REGION_SIZE.x, y:1 - REGION_SIZE.y, width:REGION_SIZE.x, height:REGION_SIZE.y}
const BOTTOM_LEFT = {x:0.0, y:1-REGION_SIZE.y, width:REGION_SIZE.x, height:REGION_SIZE.y}
const TOP_LEFT = {x:0.0, y:0.0, width:REGION_SIZE.x, height:REGION_SIZE.y}

const CORNERS = [TOP_RIGHT, BOTTOM_RIGHT, BOTTOM_LEFT, TOP_LEFT]

const OptionMenu = React.memo<OptionMenuProps>(
    (props) => {
        const getColor = ()=>{
            if (props.object instanceof CBARPaintAsset && props.object.product?.color) {
                return `${props.object.product?.color} !important`
            }
            return "#fff"
        }

        const surfaceAsset = props.object instanceof CBARSurfaceAsset ? props.object as CBARSurfaceAsset : undefined;
        //const surface = props.object instanceof CBARSurface ? props.object as CBARSurface : surfaceAsset ? surfaceAsset.surface : undefined;

        const position = useMemo(()=>{
            if (props.origin) {
                let point = props.origin
                if (props.invalidRegions) {
                    const intersection = rectangleIntersection(point, props.invalidRegions);
                    if (intersection) {
                        point.x = intersection.x > 0.5 ? Math.min(intersection.x, point.x) : Math.max(intersection.x + intersection.width, point.x)
                        point.y = intersection.y > 0.5 ? Math.min(intersection.y, point.y) : Math.max(intersection.y + intersection.height, point.y)
                    }
                }
                return {
                    top:`${100 * point.y}%`,
                    left:`${100 * point.x}%`
                }
            } else {
                console.log("skip");
            }
            return {
                top: 'unset',
                left:'unset'
            }
        }, [props.invalidRegions, props.origin])

        const menuStyles = makeStyles(() => ({
            speedDial: {
                position: 'absolute',
                top: position.top,
                left: position.left
            },
            staticTooltip: {
                whiteSpace:"nowrap"
            },
            fab: {
                backgroundColor: getColor()
            }
        }));

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
                {actions.map((action) => (
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

    const clickOrigins = useRef<{[key: string]: Point}>({})

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

    const onVisTouchDown = useCallback((event:CBARMouseEvent)=>{

        let obj:ObjectTypes|undefined = undefined;

        if (event.asset) {
            obj = event.asset === selectedObject ? undefined : event.asset
        }
        else if (event.surface) {
            obj = event.surface === selectedObject ? undefined : event.surface
        } else {
            setOpenMenuObject(undefined)
        }

        if (obj) {
            clickOrigins.current[obj.id] = event.point
        }

        setOpenMenuObject(obj)
        setSelectedObject(obj);
    }, [selectedObject, clickOrigins])

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
            scene.context.addHandler(CBAREventType.TouchDown, onVisTouchDown as CBAREventHandler);
            scene.context.addHandler(CBAREventType.MouseOver, onVisMouseOver as CBAREventHandler);
            scene.context.addHandler(CBAREventType.MouseOut, onVisMouseOut as CBAREventHandler);
        }
    }, [addedHandlers, onVisMouseOut, onVisMouseOver, onVisTouchDown, scene])

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
            objects.forEach(obj=> key += obj.id)
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
        if (clickOrigins.current[object.id]) {
            return clickOrigins.current[object.id]
        }
        else if ((object instanceof CBARSurface || object instanceof CBARSurfaceAsset) && object.menuPoint) {
            return {...object.menuPoint};
        }
        return undefined
    }, [clickOrigins])

    const menuClicked = useCallback((object:ObjectTypes)=>{
        const openObject = object === openMenuObject ? undefined : object
        if (openObject) {
            setSelectedObject(object)
            if (openObject !== selectedObject) {
                setOpenMenuObject(undefined)//close existing immediately
                usleep(300).then(()=>{
                    setOpenMenuObject(openObject)
                })
            } else {
                setOpenMenuObject(openObject)
            }
        } else {
            setOpenMenuObject(undefined)
        }
    }, [openMenuObject, selectedObject])

    return (
        <div className="scene-options">
            {objects?.map((object) => (
                <OptionMenu key={object.id}
                            {...props}
                            object={object}
                            hidden = {!isVisible(object)}
                            menuOpen={openMenuObject === object}
                            origin={getOrigin(object)}
                            actions={actions}
                            invalidRegions={CORNERS}
                            menuClicked={()=>menuClicked(object)}/>
            ))}
        </div>
    )
}