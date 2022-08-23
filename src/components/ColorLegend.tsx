import React, {useEffect, useMemo, useState} from "react";
import "./ColorLegend.css";
import { CSSTransition} from "react-transition-group";
import {DataItem, ProductItem, SwatchItem} from "react-home-ar";

type ColorLegendProps = {
  swatches?: ProductItem[];
  activeSwatch?: ProductItem;
  tempActive?: ProductItem;
  resolveThumbnailPath(swatchItem:SwatchItem) : string|undefined;
  swatchClicked:(swatch:ProductItem)=>void
};

export function ColorLegend(props: ColorLegendProps) {
  const [inProp, setInProp] = useState(true);

  const category = useMemo<DataItem|undefined>(()=>{
    return props.tempActive
        ? props.tempActive.parent
        : props.activeSwatch?.parent
  }, [props.activeSwatch?.parent, props.tempActive])

  const currentProduct = useMemo(()=>{
    return props.tempActive
        ? props.tempActive
        : props.activeSwatch

  }, [props.activeSwatch, props.tempActive])

  const productName = useMemo(()=>{
    if (!category || !currentProduct) return null
    return `${category.displayName} - ${currentProduct.displayName}`
  }, [category, currentProduct])

  useEffect(() => {
    setInProp(false);
  }, [currentProduct]);

  return (
    <>
      <div className={"floating-product-info"}>
        <div className="column-or-row">
          <>
            <div className={"product-name"}>
              {productName}
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
                key={currentProduct?.code}
                className={`product-swatch-full ${!props.swatches?.length && 'empty'}`}
                style={
                  {
                    backgroundColor: currentProduct?.color,
                    backgroundImage: currentProduct ? `url("${props.resolveThumbnailPath(currentProduct)}")` : ""
                  } as React.CSSProperties
                }
                onClick={()=>props.swatchClicked(currentProduct!)}
              />
            </CSSTransition>
          </>

          {props.swatches?.filter(s=>props.activeSwatch?.code !== s.code).map((swatch) => {
              const style = {
                backgroundColor: swatch.color,
                backgroundImage: `url("${props.resolveThumbnailPath(swatch)}")`,
                cursor:"pointer"
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
                    onClick={()=>props.swatchClicked(swatch)}
                  />
                </CSSTransition>
              )
          })}
        </div>
        <div className={"product-name-mobile"}>
          {productName}
        </div>
      </div>
    </>
  );
}
