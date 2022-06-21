import React, { useEffect, useState } from "react";
import "./ColorLegend.css";
import { CSSTransition} from "react-transition-group";
import { ProductItem } from "react-home-ar";

type ColorLegendProps = {
  swatches?: ProductItem[];
  activeSwatch?: ProductItem;
  tempActive?: ProductItem;
};

export function ColorLegend(props: ColorLegendProps) {
  const [inProp, setInProp] = useState(true);


  useEffect(() => {
    setInProp(false);
  }, [props.activeSwatch, props.tempActive]);

  return (
    <>
      <div className={"floating-product-info"}>
        <div className="column-or-row">
          
          <>
            <div className={"product-name"}>
              {props.tempActive
                ? props.tempActive.parent?.displayName + " - "
                : props.activeSwatch?.parent?.displayName + " - "}
              {props.tempActive
                ? props.tempActive.displayName
                : props.activeSwatch?.displayName}
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
                key={
                  props.tempActive
                    ? props.tempActive.code
                    : props.activeSwatch?.code
                }
                className={`product-swatch-full`}
                style={
                  {
                    "--my-css-var": props.tempActive
                      ? props.tempActive.color
                      : props.activeSwatch?.color,
                  } as React.CSSProperties
                }
              />
            </CSSTransition>
          
          </>

          {props.swatches?.forEach((swatch) => {
            if (
              (props.tempActive
                ? props.tempActive.code
                : props.activeSwatch?.code) !== swatch.code
            ) {
              const style = {
                "--my-css-var": swatch.color,
              } as React.CSSProperties;
              return (
                <CSSTransition
                    key={swatch.code}
                  unmountOnExit
                  in={inProp}
                  timeout={500}
                  classNames="squash"
                  onExited={() => {
                    setInProp(true);
                  }}
                >
                  <div
                    key={swatch.code}
                    className={"product-swatch"}
                    style={style}
                  />
                </CSSTransition>
              );
            }
          })}
        </div>
        <div className={"product-name-mobile"}>
          {props.tempActive ? props.tempActive.parent?.displayName + " - " : props.activeSwatch?.parent?.displayName + " - "}
          {props.tempActive
            ? props.tempActive.displayName
            : props.activeSwatch?.displayName}
        </div>
      </div>
    </>
  );
}
