import React, { useEffect, useState } from "react";
import "./ColorLegend.css";
import { CSSTransition, TransitionGroup } from "react-transition-group";

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
  const [inProp, setInProp] = useState(true);

  useEffect(() => {
    setInProp(false);
    console.log("set inprop to true");
  }, [props.activeSwatch]);
  return (
    <>
    
      <div className={"floating-product-info"}>
      <div className="column-or-row">
        <>
          <div className={"product-name"}>
            {props.swatches[props.activeSwatch - 1].brand} -{" "}
            {props.swatches[props.activeSwatch - 1].displayName}
          </div>
          <CSSTransition
            unmountOnExit
            in={inProp}
            timeout={500}
            classNames="grow"
            onExited={() => {
              setInProp(true);
            }}
          >
            <div
              key={props.activeSwatch}
              className={`product-swatch-full`}
              style={
                ({ "--my-css-var": props.swatches[props.activeSwatch - 1].color } as React.CSSProperties)
            }
            />
          </CSSTransition>
        </>

          {props.swatches?.map((swatch, i) => {
            console.log("active swatch", props.activeSwatch - 1);
            console.log("index", i);
            if (i !== props.activeSwatch - 1) {
              var style = { "--my-css-var": swatch.color } as React.CSSProperties;
              return (
                
                <CSSTransition
                  unmountOnExit
                  in={inProp}
                  timeout={500}
                  classNames="squash"
                  onExited={() => {
                    setInProp(true);
                  }}
                >
                  <div
                    key={swatch.displayName}
                    className={"product-swatch"}
                    style={style}
                  />
                </CSSTransition>
              );
            }
          })}

      </div>
      <div className={"product-name-mobile"}>
            {props.swatches[props.activeSwatch - 1].brand} -{" "}
            {props.swatches[props.activeSwatch - 1].displayName}
          </div>
      </div>

    </>

  );
}
