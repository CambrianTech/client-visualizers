import React, {useMemo} from 'react'
import 'react-circular-progressbar/dist/styles.css'

import './AssetOptions.css'
import {SpeedDial, SpeedDialAction, SpeedDialIcon} from "@material-ui/lab";
import {makeStyles} from "@material-ui/core";
import {DefaultAssetMenuActions, ToolsMenuAction} from "react-cambrian-ui";
import {CBARAsset} from "react-home-ar";

type AssetAction = ToolsMenuAction & {
    asset:CBARAsset
}

type AssetOptionMenuProps = {
    hidden:boolean
    asset:CBARAsset
    actions:(asset:CBARAsset)=>ToolsMenuAction[]
    handleAction:(event:AssetAction)=>void
}

export const AssetOptionMenu = React.memo<AssetOptionMenuProps>(
    (props) => {
        const menuStyles = makeStyles((theme) => ({
            speedDial: {
                position: 'absolute',
                top: '300px',
                left: '600px'
            },
            staticTooltip: {
                whiteSpace:"nowrap"
            },
            fab: {

            }
        }));

        const menuClasses = menuStyles();
        const [menuOpen, setMenuOpen] = React.useState(false);
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
                open={menuOpen}
                FabProps={{ size: "small", style: { backgroundColor: "rgba(255, 0, 0, 1) !important" } }}
                onClick={()=>setMenuOpen(!menuOpen)}>
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

    return (
        <div className="asset-options">
            {props.assets && props.assets.map((asset) => (
                <AssetOptionMenu {...props} actions={actions} asset={asset} hidden={props.selectedAsset !== asset} />
            ))}
        </div>
    )
}