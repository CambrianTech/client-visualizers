import React, {useCallback, useMemo} from "react";
import "./ColorPicker.css";
import {ProductItem, SwatchItem} from "react-home-ar";

type ColorPickerProps = {
    swatches?: ProductItem[];
    activeSwatch?: ProductItem;
    resolveThumbnailPath(swatchItem:SwatchItem) : string|undefined;
    swatchClicked:(swatch:ProductItem)=>void
};

export function ColorPicker(props: ColorPickerProps) {

    const colors = useMemo(()=>{
        const colors = [];
        for (let i=0; i<1000; i++) {
            colors.push("rgb(" + Math.floor(Math.random() * 255)
                + "," + Math.floor(Math.random() * 255) + ","
                + Math.floor(Math.random() * 255) + ")")
        }
        return colors;
    }, [])

    const colorClicked = useCallback(()=>{

    }, [])

    return (
        <div className={"color-picker"}>
            <div className={"scroller"}>
                {colors.map((c, index)=>{
                    return <div onClick={()=>colorClicked()} key={`color-${index}`} className={"swatch"} style={{backgroundColor:c}}></div>
                })}
            </div>
        </div>
    );
}
