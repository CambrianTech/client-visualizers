import React from "react"
import './DrawingTools.css'
import {CBARToolMode} from "react-home-ar";
import {MediaPaths} from "../utilities/Constants";
import {Fab, Icon} from "@material-ui/core";

type DrawingToolsProps = {
    visible: boolean
    toolMode:CBARToolMode
    historySize:number
    onToolModeChanged: (mode:CBARToolMode) => void
    onUndoClicked: () => void
    onToolFinished: (commit:boolean) => void
}

export const DrawingToolsCached = React.memo<DrawingToolsProps>(
    (cProps) => {
        if (cProps.visible) {
            return (
                <div className="visualizer-drawing-tools">
                    <div className="visualizer-drawing-tools-content">
                        <div>
                            <div className="visualizer-drawing-tools-mode">
                                <Fab className="tool-button" disabled={!cProps.historySize} style={{opacity: cProps.historySize ? 1.0 : 0.5}} onClick={() => cProps.onUndoClicked()}>
                                    <Icon>undo</Icon>
                                </Fab>
                                <Fab className="tool-button" onClick={() => cProps.onToolModeChanged(CBARToolMode.DrawSurface)}>
                                    <Icon>format_paint</Icon>
                                </Fab>
                                <Fab className="tool-button" onClick={() => cProps.onToolModeChanged(CBARToolMode.EraseSurface)}>
                                    <img src={`${MediaPaths.Images}/eraser.svg`} alt={'eraser'} />
                                </Fab>
                            </div>
                            <div className="visualizer-drawing-tools-actions">
                                <Fab className="tool-button" style={{backgroundColor:"#555"}} onClick={() => cProps.onToolFinished(false)}>
                                    <Icon>close</Icon>
                                </Fab>
                                <Fab className="tool-button" onClick={() => cProps.onToolFinished(true)}>
                                    <Icon>check</Icon>
                                </Fab>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return (<aside />);
    },
    (prevProps, nextProps) => {
        return prevProps.visible === nextProps.visible
            && prevProps.toolMode === nextProps.toolMode
            && prevProps.historySize === nextProps.historySize
    }
);

export function DrawingTools(props: DrawingToolsProps) {

    return (
        <DrawingToolsCached visible={props.visible}
                            toolMode={props.toolMode}
                            historySize={props.historySize}
                            onToolModeChanged={props.onToolModeChanged}
                            onUndoClicked={props.onUndoClicked}
                            onToolFinished={props.onToolFinished} />
    )
}