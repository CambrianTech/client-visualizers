import React, {useMemo, useState} from "react";
import "./ColorPicker.css";
import {PaintColor} from "react-home-ar";
import {Fab} from "@mui/material";

type ColorPickerProps = {
    hidden?:boolean
    colorClicked:(color:PaintColor)=>void
};

export function ColorPicker(props: ColorPickerProps) {

    const colors = useMemo(()=>{
        const colors:PaintColor[] = [];
        for (let i=0; i<1000; i++) {
            colors.push(new PaintColor());
        }
        return colors;
    }, [])

    const [isOpen, setIsOpen] = useState(true)

    return (
        <div className={`color-picker ${isOpen ? "open" : "closed"}`} style={{visibility: props.hidden ? "hidden" : "visible"}}>
            <Fab className={"toggle"} variant={"extended"} onClick={()=>setIsOpen(!isOpen)}>Colors</Fab>
            <div className={"wrapper"}>
                <div className={"scroller"}>
                    {colors.map((c, index)=>{
                        return <div onClick={()=>props.colorClicked(c)} key={`color-${index}`} className={"swatch"} style={{backgroundColor:c.cssColor}}></div>
                    })}
                </div>
            </div>
        </div>
    );
}
