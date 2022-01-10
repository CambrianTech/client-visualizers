import React, {useEffect, useMemo} from 'react'
import 'react-circular-progressbar/dist/styles.css'

import './AssetOptions.css'
import {SpeedDial, SpeedDialAction, SpeedDialIcon} from "@material-ui/lab";
import {makeStyles} from "@material-ui/core";
import {DefaultAssetMenuActions, ToolsMenuAction} from "react-cambrian-ui";
import {CBARAsset, CBARPaintAsset, CBARSurfaceAsset} from "react-home-ar";

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

        const position = useMemo(()=>{
            if (props.asset instanceof CBARSurfaceAsset && props.asset.menuPoint) {
                const bounds = props.asset.menuPoint;
                return {
                    top:`${100 * bounds.y}%`,
                    left:`${100 * bounds.x}%`
                }
            }
            return {
                top: 'unset',
                left:'unset'
            }
        }, [props.asset])

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
            return props.actions(props.asset)
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
                        onClick={()=>props.handleAction({asset: props.asset, ...action})}
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
        setMenuOpen(true)
    }, [props.selectedAsset])

    return (
        <div className="asset-options">
            {props.assets && props.assets.map((asset) => (
                <AssetOptionMenu key={asset.id}
                                 {...props}
                                 menuOpen={menuOpen} setMenuOpen={setMenuOpen}
                                 actions={actions}
                                 asset={asset}
                                 hidden={props.selectedAsset !== asset} />
            ))}
        </div>
    )
}