import React from 'react'
import { CircularProgressbar } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'

import './Progress.css'

type ProgressProperties = {
    percentage: number
    statusText: string
    visible: boolean
    buttonText?:string
    onButtonClick?:()=>void
}

export function Progress(props: ProgressProperties) {
    return (
        <div className="progress" style={{display:props.visible ? "block" : "none"}}>
            <div className="content">
                <div className={"progress-circle"}>
                    <CircularProgressbar value={10 + props.percentage * 100} />
                </div>
                <div className={"progress-text"}>{props.statusText}</div>
                {props.onButtonClick && props.percentage === 1.0 &&
                <div>
                    <button className={"progress-button"} onClick={props.onButtonClick}>{props.buttonText}</button>
                </div>}
            </div>
        </div>
    )
}