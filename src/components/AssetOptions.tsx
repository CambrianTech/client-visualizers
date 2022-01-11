import React, {useCallback, useEffect, useMemo} from 'react'
import 'react-circular-progressbar/dist/styles.css'

import './AssetOptions.css'
import {SpeedDial, SpeedDialAction, SpeedDialIcon} from "@material-ui/lab";
import {Icon, makeStyles} from "@material-ui/core";
import {DefaultAssetMenuActions, ToolOperation, ToolsMenuAction} from "react-cambrian-ui";
import {CBARAsset, CBARAssetType, CBARPaintAsset, CBARSurfaceAsset, CBARToolMode} from "react-home-ar";

type AssetAction = ToolsMenuAction & {
    asset:CBARAsset
}

type AssetOptionMenuProps = {
    hidden:boolean
    asset:CBARAsset
    actions:(asset:CBARAsset)=>ToolsMenuAction[]
    handleAction:(event:AssetAction)=>void
    menuOpen:boolean
    setMenuOpen:(open:boolean)=>void
}

export const AssetOptionMenu = React.memo<AssetOptionMenuProps>(
    (props) => {
        const getColor = ()=>{
            if (props.asset instanceof CBARPaintAsset && props.asset.product?.color) {
                return `${props.asset.product?.color} !important`
            }
            return undefined
        }

        const surfaceAsset = props.asset instanceof CBARSurfaceAsset ? props.asset as CBARSurfaceAsset : undefined;

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
            let actions = props.actions(props.asset)
            if (!actions) return actions

            if (surfaceAsset && surfaceAsset.type === CBARAssetType.PaintSurface) {
                actions = actions.filter(item=>item.operation !== CBARToolMode.Rotate && item.operation !== CBARToolMode.Translate && item.operation !== ToolOperation.ChoosePattern);
            }
            return actions
        }, [props, surfaceAsset])

        const onMenuClick = useCallback((action:ToolsMenuAction)=>{
            props.handleAction({asset: props.asset, ...action})
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
    assets?:CBARAsset[],
    actions?:(asset:CBARAsset)=>ToolsMenuAction[]
    handleAction:(event:AssetAction)=>void
    selectedAsset:CBARAsset|undefined
}

export function AssetOptions(props: AssetOptionsProperties) {

    const actions = useMemo(()=>{
        return props.actions ? props.actions : ()=>{return [...DefaultAssetMenuActions]}
    }, [props.actions])

    const [menuOpen, setMenuOpen] = React.useState(false);

    useEffect(()=>{
        window.setTimeout(()=>{
            setMenuOpen(true)
        }, 500);
    }, [props.selectedAsset])

    return (
        <div className="asset-options">
            {props.assets && props.assets.map((asset) => (
                <AssetOptionMenu key={asset.id}
                                 {...props}
                                 menuOpen={menuOpen}
                                 setMenuOpen={setMenuOpen}
                                 actions={actions}
                                 asset={asset}
                                 hidden={props.selectedAsset !== asset} />
            ))}
        </div>
    )
}