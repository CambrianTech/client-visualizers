import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import 'react-circular-progressbar/dist/styles.css'

import './SceneOptions.css'
import {SpeedDial, SpeedDialAction, SpeedDialIcon} from "@material-ui/lab";
import {makeStyles} from "@material-ui/core";
import {DefaultAssetMenuActions, ToolOperation, ToolsMenuAction} from "react-cambrian-ui";
import {
    CBARAsset,
    CBARAssetType,
    CBARPaintAsset,
    CBARScene,
    CBARSurface,
    CBARSurfaceAsset,
    CBARToolMode
} from "react-home-ar";

type OptionTypes = CBARAsset|CBARSurface
type OptionMenuHandler = (object:OptionTypes)=>ToolsMenuAction[]

export type OptionMenuAction = ToolsMenuAction & {
    object:OptionTypes
}

type OptionMenuProps = {
    hidden:boolean
    object:OptionTypes
    actions:OptionMenuHandler
    handleOption:(event:OptionMenuAction)=>void
    menuOpen:boolean
    setMenuOpen:(open:boolean)=>void
}

const OptionMenu = React.memo<OptionMenuProps>(
    (props) => {
        const getColor = ()=>{
            if (props.object instanceof CBARPaintAsset && props.object.product?.color) {
                return `${props.object.product?.color} !important`
            }
            return undefined
        }

        const surfaceAsset = props.object instanceof CBARSurfaceAsset ? props.object as CBARSurfaceAsset : undefined;

        const position = useMemo(()=>{
            if (surfaceAsset && surfaceAsset.menuPoint) {
                const bounds = surfaceAsset.menuPoint;
                return {
                    top:`${100 * Math.max(bounds.y, 0.1)}%`,
                    left:`${100 * Math.min(bounds.x, 0.9)}%`
                }
            }
            return {
                top: 'unset',
                left:'unset'
            }
        }, [surfaceAsset])

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

            if (surfaceAsset && surfaceAsset.type === CBARAssetType.PaintSurface) {
                actions = actions.filter(item=>item.operation !== CBARToolMode.Rotate && item.operation !== CBARToolMode.Translate && item.operation !== ToolOperation.ChoosePattern);
            }
            return actions
        }, [props, surfaceAsset])

        const onMenuClick = useCallback((action:ToolsMenuAction)=>{
            props.handleOption({object: props.object, ...action})
            props.setMenuOpen(false);
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
                onClick={()=>props.setMenuOpen(!props.menuOpen)}>
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

type AssetOptionsProperties = {
    scene?:CBARScene,
    actions?:OptionMenuHandler
    handleOption:(event:OptionMenuAction)=>void
    selectedAsset:CBARAsset|undefined
}

export function SceneOptions(props: AssetOptionsProperties) {

    const {scene, selectedAsset} = {...props};

    const actions = useMemo(()=>{
        return props.actions ? props.actions : ()=>{return [...DefaultAssetMenuActions]}
    }, [props.actions])

    const [menuOpen, setMenuOpen] = React.useState(false);

    useEffect(()=>{
        if (selectedAsset) {
            window.setTimeout(()=>{
                setMenuOpen(true)
            }, 500);
        }

    }, [selectedAsset])

    const getObjects = useCallback(()=>{
        if (!scene) return
        let objects:OptionTypes[] = []
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

    return (
        <div className="asset-options">
            {objects?.map((object) => (
                <OptionMenu key={object.id}
                                 {...props}
                                 menuOpen={menuOpen}
                                 setMenuOpen={setMenuOpen}
                                 actions={actions}
                                 object={object}
                                 hidden={selectedAsset !== object} />
            ))}
        </div>
    )
}