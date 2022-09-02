import React, {useEffect, useMemo, useState} from 'react';
import {CBContentManager, ImageSource, ProductItem, SwatchItem} from "react-home-ar";
import { useWindowSize } from '@react-hook/window-size';


const MOBILE_CUT_OFF_SCREEN_SIZE = 768;
const MIN_SCREEN_SIZE = 320;
const ICONS_ROW_HEIGHT = 62;

type InterpolateValues = {
  canvasWidth: number,
  minValue: number,
  maxValue: number
}

function linearlyInterpolate({canvasWidth, minValue, maxValue} : InterpolateValues){
  const rangeDelta = maxValue - minValue;
  const screenRangeDelta = MOBILE_CUT_OFF_SCREEN_SIZE - MIN_SCREEN_SIZE;

  const pixelsAboveMinimumScreen = canvasWidth - MIN_SCREEN_SIZE;

  const roughInterpolatedValue = (rangeDelta / screenRangeDelta) * pixelsAboveMinimumScreen + minValue;
  return Math.round(Math.min(Math.max(roughInterpolatedValue, minValue), maxValue));
}

function drawImage(ctx: CanvasRenderingContext2D, img: ImageSource, height: number){
  ctx!.drawImage(img, 0, 0, ctx!.canvas.width, height);
  // ctx!.drawImage(brandImg, 40, 40,100, 100);
  let gradient = ctx!.createLinearGradient(0, 0, 0, height );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(.7, "rgba(0, 0, 0, 0.3)");
  gradient.addColorStop(1, "rgba(0, 0, 0, .4)");
  ctx!.fillStyle = gradient;
  ctx!.fillRect(0, 0, ctx!.canvas.width, height);
}

function resizeCanvas(ctx: CanvasRenderingContext2D, img: ImageSource){
  ctx!.canvas.style.width = "100%";
  ctx!.canvas.style.height = "100%";
  ctx!.canvas.style.overflow = "none";
  ctx!.canvas.width = ctx!.canvas.offsetWidth;
  let ratio = ctx!.canvas.width / img.width;
  const newHeight = img.height * ratio;
  ctx!.canvas.height = newHeight;
  drawImage(ctx, img, newHeight);
}

function resizeCanvasLandscape(ctx: CanvasRenderingContext2D, img: ImageSource, screenHeight: number) {
  //if in landscape mode, resize the height to maximum
  const newHeight = screenHeight - ICONS_ROW_HEIGHT;
  ctx!.canvas.height = newHeight;

  // and the width to the appropriate aspect ratio
  const newCanvasToImageRatio = newHeight / img.height;
  ctx!.canvas.width = newCanvasToImageRatio * img.width;
  ctx!.canvas.style.width = "auto";
  ctx!.canvas.style.height = "auto";

  drawImage(ctx, img, newHeight);
}

export type ProductData = {
  product:ProductItem
  swatch?:HTMLImageElement
}

const ShareCanvas: React.FC<{
  resolveThumbnailPath(swatchItem:SwatchItem) : string|undefined,
  onChange: (arg: string) => void,
  screenshot: HTMLImageElement|undefined,
  brandImage:HTMLImageElement|undefined,
  productData: ProductData[]|undefined
}> = (props) => {
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement|null>(null);
  const [screenWidth, screenHeight] = useWindowSize();

  const isMobile = screenWidth <= MOBILE_CUT_OFF_SCREEN_SIZE || screenHeight <= MOBILE_CUT_OFF_SCREEN_SIZE;
  const isLandscape = isMobile && screenWidth > screenHeight;
  const {screenshot, brandImage, productData, onChange} = props

  useEffect(()=>{
    if (!screenshot || !brandImage || !canvasRef) return

    const ctx = canvasRef.getContext('2d');

    if (!ctx) return;

    canvasRef.width = screenshot.width;
    canvasRef.height = screenshot.height;

    ctx.drawImage(screenshot, 0, 0, canvasRef.width, canvasRef.height);

    //draw brand image
    if (brandImage.width > 0) {
      const brandWidth = linearlyInterpolate({
        canvasWidth: ctx!.canvas.width,
        minValue: Math.min(ctx!.canvas.width / 5, brandImage.width / 3),
        maxValue: Math.min(ctx!.canvas.width / 5, brandImage.width / 2.0)
      });
      const brandHeight = brandWidth * brandImage.height / brandImage.width;
      ctx.drawImage(brandImage, 20, 20, brandWidth, brandHeight);
    }

    //Draw swatches
    const swatchSize = screenshot.width / 20;
    const horizontalPadding = swatchSize / 3;
    const verticalPadding = swatchSize / 3;
    const swatchBorderWidth = Math.floor(Math.max(swatchSize * 0.05, 2.0));

    productData?.forEach((data, i) => {
      //Draw Colored Rectangle Swatch
      const x = screenshot.width - swatchSize - horizontalPadding;
      const y = screenshot.height - (i + 1) * swatchSize - verticalPadding;

      if (data.swatch) {
        ctx.drawImage(data.swatch, 0, 0, data.swatch.width, data.swatch.height, x, y, swatchSize, swatchSize);
      }
      else if (data.product.color) {
        ctx.beginPath();
        ctx.fillStyle = data.product.color;
        ctx.fillRect(x, y, swatchSize, swatchSize);
        ctx.stroke();
      }

      //Draw Swatch Outline
      ctx.beginPath();
      ctx.lineWidth = swatchBorderWidth;
      ctx.strokeStyle = "white";
      ctx.rect(x, y, swatchSize, swatchSize);
      ctx.stroke();
    });

    onChange(canvasRef.toDataURL('image/jpeg', 0.9))

    //
    // const ctx = canvasRef.getContext('2d');
    //
    // if (isLandscape) {
    //   resizeCanvasLandscape(ctx, screenshot, screenHeight);
    // } else {
    //   resizeCanvas(ctx, screenshot);
    // }
    //

    //
    // const textBlockVerticalOffset = fontSize - 1;
    //
    // productData?.forEach((data, i) => {
    //   //Draw Colored Rectangle Swatch
    //   const x = ctx!.canvas.width - horizontalSwatchOffset;
    //   const y = ctx!.canvas.height - (i + 1) * verticalOffset;
    //   const product = data.product
    //
    //   if (data.swatch) {
    //     ctx!.drawImage(data.swatch, x, y, swatchSize, swatchSize);
    //   }
    //   else {
    //     ctx!.beginPath();
    //     ctx!.fillStyle = product.color;
    //     ctx!.fillRect(x, y, swatchSize, swatchSize);
    //     ctx!.stroke();
    //   }
    //
    //   //Draw Swatch Outline
    //   ctx!.beginPath();
    //   ctx!.lineWidth = 2;
    //   ctx!.strokeStyle = "white";
    //   ctx!.rect(ctx!.canvas.width - horizontalSwatchOffset, ctx!.canvas.height - (i + 1) * verticalOffset, swatchSize, swatchSize);
    //   ctx!.stroke();
    //
    //   //Add Text
    //
    //   const fontFamily = "Lato,Avenir Next,Roboto,Verdana,serif";
    //   ctx!.font = `200 ${fontSize}px ${fontFamily}`;
    //   ctx!.canvas.style.letterSpacing = ".5px";
    //   ctx!.shadowColor = "black";
    //   ctx!.shadowBlur = 2;
    //   ctx!.lineWidth = 1;
    //   const textWidth = ctx!.measureText(product.displayName ? product.displayName.toUpperCase() : "").width;
    //   const codeWidth = ctx!.measureText(product.code ? product.code.toUpperCase() : "").width;
    //   ctx!.strokeText(product.displayName ? product.displayName.toUpperCase() : "", ctx!.canvas.width - horizontalTextOffset - textWidth, (ctx!.canvas.height - (i + 1) * verticalOffset) + textBlockVerticalOffset);
    //   ctx!.strokeText(product.code ? product.code.toUpperCase() : "", ctx!.canvas.width - horizontalTextOffset - codeWidth, (ctx!.canvas.height - (i + 1) * verticalOffset) + textBlockVerticalOffset + 20);
    //   ctx!.fillStyle = "white";
    //   ctx!.shadowBlur = 0;
    //   ctx!.fillText(product.displayName ? product.displayName.toUpperCase() : "", ctx!.canvas.width - horizontalTextOffset - textWidth, (ctx!.canvas.height - (i + 1) * verticalOffset) + textBlockVerticalOffset);
    //   ctx!.strokeText(product.code ? product.code.toUpperCase() : "", ctx!.canvas.width - horizontalTextOffset - codeWidth, (ctx!.canvas.height - (i + 1) * verticalOffset) + textBlockVerticalOffset + 20);
    //
    // });
    //

    //
    // setCanvasRef(canvasRef)

    //const result = canvasRef.toDataURL('image/jpeg', 0.9) as string

    //onChange(result)

  }, [brandImage, canvasRef, isLandscape, onChange, productData, screenHeight, screenshot])

  return <canvas ref={(newRef) => setCanvasRef(newRef)} />;
};

export default ShareCanvas;
