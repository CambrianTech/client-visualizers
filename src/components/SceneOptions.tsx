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
    CBARToolMode
} from "react-home-ar";

type ObjectTypes = CBARAsset|CBARSurface
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
    menuClicked:()=>void
}

const OptionMenu = React.memo<OptionMenuProps>(
    (props) => {
        const getColor = ()=>{
            if (props.object instanceof CBARPaintAsset && props.object.product?.color) {
                return `${props.object.product?.color} !important`
            }
            return "#fff"
        }

        const menuPoint = useMemo(()=>{
            if (props.object instanceof CBARSurface || props.object instanceof CBARSurfaceAsset) {
                return props.object.menuPoint
            }
        }, [props.object]);

        const surfaceAsset = props.object instanceof CBARSurfaceAsset ? props.object as CBARSurfaceAsset : undefined;
        //const surface = props.object instanceof CBARSurface ? props.object as CBARSurface : surfaceAsset ? surfaceAsset.surface : undefined;

        const position = useMemo(()=>{
            if (menuPoint) {
                return {
                    top:`${100 * Math.max(menuPoint.y, 0.1)}%`,
                    left:`${100 * Math.min(menuPoint.x, 0.9)}%`
                }
            } else {
                console.log("skip");
            }
            return {
                top: 'unset',
                left:'unset'
            }
        }, [menuPoint])

        const menuStyles = makeStyles((theme) => ({
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

export type AssetOptionsProperties = {
    scene?:CBARScene,
    actions?:OptionMenuHandler

    onClick:(action:CBARMouseEvent)=>void
    handleOption:(action:OptionMenuAction)=>void
}

export function SceneOptions(props: AssetOptionsProperties) {

    const {scene, onClick} = {...props};

    const actions = useMemo(()=>{
        return props.actions ? props.actions : ()=>{return [...DefaultAssetMenuActions]}
    }, [props.actions])

    const [openMenuObject, setOpenMenuObject] = React.useState<ObjectTypes>();
    const [selectedObject, setSelectedObject] = useState<ObjectTypes>();
    const [overObject, setOverObject] = useState<ObjectTypes>();

    const onVisTouchDown = useCallback((event:CBARMouseEvent)=>{

        if (event.asset) {
            setSelectedObject(event.asset === selectedObject ? undefined : event.asset);
            setOpenMenuObject(event.asset);
        }
        else if (event.surface) {
            setSelectedObject(event.surface === selectedObject ? undefined : event.surface);
            setOpenMenuObject(event.surface);
        } else {
            setOpenMenuObject(undefined)
            setSelectedObject(undefined)
        }

        onClick(event);

    }, [onClick, selectedObject])

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

    const menuClicked = useCallback((object:ObjectTypes)=>{
        const openObject = object === openMenuObject ? undefined : object
        setOpenMenuObject(openObject)
        if (openObject) {
            setSelectedObject(object)
        }
    }, [openMenuObject])

    return (
        <div className="scene-options">
            {objects?.map((object) => (
                <OptionMenu key={object.id}
                            {...props}
                            object={object}
                            hidden = {!isVisible(object)}
                            menuOpen={openMenuObject === object}
                            actions={actions}
                            menuClicked={()=>menuClicked(object)}/>
            ))}
        </div>
    )
}