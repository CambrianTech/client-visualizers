import React, { useEffect } from "react";
import "./ColorLegend.css";

type Swatches = {
  displayName: string;
  brand: string;
  color: string;
};
type ColorLegendProps = {
  swatches: Swatches[];
  activeSwatch: number;
};

export function ColorLegend(props: ColorLegendProps) {
  return (
    <>
      <div className={"floating-product-info"}>                
      <>
                  <div className={"product-name"}>
                    {props.swatches[props.activeSwatch-1].brand} - {props.swatches[props.activeSwatch-1].displayName}
                  </div>
                  <div
                    className={"product-swatch"}
                    style={{ background: props.swatches[props.activeSwatch-1].color }}
                  />
                </>

        {props.swatches?.map((swatch, i) => {
          if (i !== props.activeSwatch-1) {
            return (
              <>
                <div
                  className={"product-swatch squashed"}
                  style={{ background: swatch.color }}
                />
              </>
            );
          }
        })}
      </div>
    </>
  );
}
