import React, {useEffect, useState} from 'react';
import { ProductItem, SwatchItem} from "react-home-ar";
import { useWindowSize } from '@react-hook/window-size';

const MOBILE_CUT_OFF_SCREEN_SIZE = 768;
const MIN_SCREEN_SIZE = 320;

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

  useEffect(() => {
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
            minValue: Math.min(ctx.canvas.width / 5, brandImage.width),
            maxValue: Math.min(ctx.canvas.width / 5, brandImage.width)
          });
          const brandHeight = brandWidth * brandImage.height / brandImage.width;
          ctx.drawImage(brandImage, ctx.canvas.width / 50, ctx.canvas.width / 50, brandWidth, brandHeight);
        }

        //Draw swatches
        const swatchSize = Math.floor(screenshot.width / 20);
        const horizontalPadding = Math.floor(swatchSize / 2);
        const verticalPadding = Math.floor(swatchSize / 2);
        const swatchBorderWidth = Math.floor(Math.max(swatchSize * 0.04, 2.0));

        productData?.forEach((data, i) => {
          //Draw Colored Rectangle Swatch
          const x = screenshot.width - swatchSize - horizontalPadding;
          const y = screenshot.height - (i + 1) * swatchSize - verticalPadding;

          ctx.beginPath();
          ctx.shadowColor = "rgba(0, 0, 0, .5)";
          ctx.shadowBlur = Math.floor(swatchSize / 10);
          ctx.shadowOffsetX = Math.floor(swatchSize / 20);
          ctx.shadowOffsetY = Math.floor(swatchSize / 20);

          ctx.beginPath();
          ctx.fillStyle = "black";
          ctx.fillRect(x, y, swatchSize, swatchSize);
          ctx.stroke();

          if (data.swatch) {
            ctx.drawImage(data.swatch, 0, 0, data.swatch.width, data.swatch.height, x, y, swatchSize, swatchSize);
          } else if (data.product.color) {
            ctx.beginPath();
            ctx.fillStyle = data.product.color;
            ctx.fillRect(x, y, swatchSize, swatchSize);
            ctx.stroke();
          }

          //draw text
          ctx.beginPath();

          const fontSize = Math.floor(0.333 * swatchSize);
          const fontFamily = "Lato,Avenir Next,Roboto,Verdana,serif";
          ctx.font = `200 ${fontSize}px ${fontFamily}`;
          ctx.canvas.style.letterSpacing = `${Math.ceil(fontSize / 15)}px`;
          ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
          ctx.shadowBlur = Math.floor(fontSize / 5);
          ctx.shadowOffsetX = Math.floor(fontSize / 10);
          ctx.shadowOffsetY = Math.floor(fontSize / 10);

          ctx.lineWidth = Math.floor(Math.max(swatchSize * 0.04, 2.0));;
          ctx.strokeStyle = "white";
          const textSize = ctx.measureText(data.product.displayName ? data.product.displayName.toUpperCase() : "");
          const textWidth = textSize.width;
          const textHeight = textSize.actualBoundingBoxAscent;
          const codeWidth = ctx.measureText(data.product.code ? data.product.code.toUpperCase() : "").width;

          let yPos = y + 1.5 * textHeight;

          const productName = data.product.displayName?.toUpperCase();
          if (productName) {
            const xPos = x - textWidth - swatchSize / 3;
            ctx.strokeText(productName, xPos, yPos);
            yPos += 2 * textHeight
          }

          const productCode = data.product.code?.toUpperCase();
          if (productCode) {
            const xPos = x - codeWidth - swatchSize / 3;
            ctx.strokeText(productCode, xPos, yPos);
          }

          //Draw Swatch Outline
          ctx.beginPath();
          ctx.shadowColor = "rgba(0, 0, 0, 0)";
          ctx.lineWidth = swatchBorderWidth;
          ctx.strokeStyle = "white";
          ctx.rect(x, y, swatchSize, swatchSize);
          ctx.stroke();

        });

        onChange(canvasRef.toDataURL('image/jpeg', 0.9))
      },
      [brandImage, canvasRef, isLandscape, onChange, productData, screenHeight, screenshot])

  return <canvas ref={(newRef) => setCanvasRef(newRef)} />;
};

export default ShareCanvas;
