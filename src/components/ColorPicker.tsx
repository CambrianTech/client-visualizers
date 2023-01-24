import React, {useMemo} from "react";
import "./ColorPicker.css";
import {PaintColor} from "react-home-ar";

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

    return (
        <div className={"color-picker"} style={{visibility: props.hidden ? "hidden" : "visible"}}>
            <div className={"scroller"}>
                {colors.map((c, index)=>{
                    return <div onClick={()=>props.colorClicked(c)} key={`color-${index}`} className={"swatch"} style={{backgroundColor:c.cssColor}}></div>
                })}
            </div>
        </div>
    );
}
