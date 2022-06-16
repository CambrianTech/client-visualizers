import React from "react";
import {ToolsMenuAction} from "react-cambrian-ui";
import {SpeedDial, SpeedDialAction, SpeedDialIcon} from "@mui/material";
import {makeStyles} from "@mui/styles";

type VisualizerToolsProps = {
    hidden?: boolean
    actions:ToolsMenuAction[]
    handleAction:(action:ToolsMenuAction)=>void
}

const menuStyles = makeStyles((theme) => ({
    speedDial: {
        position: 'absolute',
        top: '20px',
        right: '20px',
    },
    staticTooltip: {
        whiteSpace:"nowrap"
    }
}));

const ToolsMenu = React.memo<VisualizerToolsProps>(
    (props) => {
        const menuClasses = menuStyles();
        const [menuOpen, setMenuOpen] = React.useState(false);
        const isMobile = window.outerWidth < 400;

        return (
            <SpeedDial
                direction={'down'}
                ariaLabel="Tools"
                className={menuClasses.speedDial}
                hidden={props.hidden}
                icon={<SpeedDialIcon />}
                open={menuOpen}
                onClick={()=>setMenuOpen(!menuOpen)}>
                {props.actions.map((action) => (
                    <SpeedDialAction
                        classes={{ staticTooltip: menuClasses.staticTooltip }}
                        key={action.name}
                        icon={action.icon}
                        tooltipTitle={!isMobile && action.longName ? action.longName : action.name}
                        tooltipOpen
                        onClick={()=>props.handleAction(action)}
                    />
                ))}
            </SpeedDial>
        );
    }
);

export function VisualizerTools(props: VisualizerToolsProps) {
    return (
        <ToolsMenu {...props} />
    )
}