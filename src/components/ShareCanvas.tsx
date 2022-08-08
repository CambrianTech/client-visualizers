import React, {useEffect, useState} from 'react';
import { ProductItem } from "react-home-ar";
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

function drawImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, height: number){
  ctx!.drawImage(img, 0, 0, ctx!.canvas.width, height);
  // ctx!.drawImage(brandImg, 40, 40,100, 100);
  let gradient = ctx!.createLinearGradient(0, 0, 0, height );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(.7, "rgba(0, 0, 0, 0.3)");
  gradient.addColorStop(1, "rgba(0, 0, 0, .4)");
  ctx!.fillStyle = gradient;
  ctx!.fillRect(0, 0, ctx!.canvas.width, height);
}

function resizeCanvas(ctx: CanvasRenderingContext2D, img: HTMLImageElement){
  ctx!.canvas.style.width = "100%";
  ctx!.canvas.style.height = "100%";
  ctx!.canvas.style.overflow = "none";
  ctx!.canvas.width = ctx!.canvas.offsetWidth;
  let ratio = ctx!.canvas.width / img.width;
  const newHeight = img.height * ratio;
  ctx!.canvas.height = newHeight;
  drawImage(ctx, img, newHeight);
}

function resizeCanvasLandscape(ctx: CanvasRenderingContext2D, img: HTMLImageElement, screenHeight: number) {
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


const ShareCanvas: React.FC<{logoSrc: string, onChange: (arg: string) => void, url: string, products?: ProductItem[] }> = (props) => {
  const [canvasRef, setCanvasRef] = useState<any>(null);
  const [screenWidth, screenHeight] = useWindowSize();

  const isMobile = screenWidth <= MOBILE_CUT_OFF_SCREEN_SIZE || screenHeight <= MOBILE_CUT_OFF_SCREEN_SIZE;
  const isLandscape = isMobile && screenWidth > screenHeight;


  useEffect(() => {
    // Initialize
    const img = new Image();
    img.crossOrigin = "";
    img.src = props.url;

    img.onload = () => {
    if (canvasRef) {
      const ctx = canvasRef.getContext('2d');

      if(isLandscape) {
        resizeCanvasLandscape(ctx, img, screenHeight);
      } else {
        resizeCanvas(ctx, img);
      }

      const verticalOffset = linearlyInterpolate({canvasWidth: ctx!.canvas.width, minValue: 50, maxValue: 60});
      const horizontalSwatchOffset = linearlyInterpolate({canvasWidth: ctx!.canvas.width, minValue: 45, maxValue: 55});
      const horizontalTextOffset = horizontalSwatchOffset + 20;
      const swatchSize = linearlyInterpolate({canvasWidth: ctx!.canvas.width, minValue: 30, maxValue: 40});
      const fontSize = linearlyInterpolate({canvasWidth: ctx!.canvas.width, minValue: 11, maxValue: 14});

      const textBlockVerticalOffset = fontSize - 1;

      props.products?.forEach((product, i) => {
        //Draw Colored Rectangle Swatch
        ctx!.beginPath();
        ctx!.fillStyle = product.color ? product.color : "white";
        ctx!.fillRect(ctx!.canvas.width - horizontalSwatchOffset, ctx!.canvas.height - (i + 1) * verticalOffset, swatchSize, swatchSize);
        ctx!.stroke();

        //Draw Swatch Outline
        ctx!.beginPath();
        ctx!.lineWidth = 2;
        ctx!.strokeStyle = "white";
        ctx!.rect(ctx!.canvas.width - horizontalSwatchOffset, ctx!.canvas.height - (i + 1) * verticalOffset, swatchSize, swatchSize);
        ctx!.stroke();

        //Add Text

        const fontFamily = "Lato,Avenir Next,Roboto,Verdana,serif";
        ctx!.font = `200 ${fontSize}px ${fontFamily}`;
        ctx!.canvas.style.letterSpacing = ".5px";
        ctx!.shadowColor = "black";
        ctx!.shadowBlur = 2;
        ctx!.lineWidth = 1;
        const textWidth = ctx!.measureText(product.displayName ? product.displayName.toUpperCase() : "").width;
        const codeWidth = ctx!.measureText(product.code ? product.code.toUpperCase() : "").width;
        ctx!.strokeText(product.displayName ? product.displayName.toUpperCase() : "", ctx!.canvas.width - horizontalTextOffset - textWidth, (ctx!.canvas.height - (i + 1) * verticalOffset) + textBlockVerticalOffset);
        ctx!.strokeText(product.code ? product.code.toUpperCase() : "", ctx!.canvas.width - horizontalTextOffset - codeWidth, (ctx!.canvas.height - (i + 1) * verticalOffset) + textBlockVerticalOffset + 20);
        ctx!.fillStyle = "white";
        ctx!.shadowBlur = 0;
        ctx!.fillText(product.displayName ? product.displayName.toUpperCase() : "", ctx!.canvas.width - horizontalTextOffset - textWidth, (ctx!.canvas.height - (i + 1) * verticalOffset) + textBlockVerticalOffset);
        ctx!.strokeText(product.code ? product.code.toUpperCase() : "", ctx!.canvas.width - horizontalTextOffset - codeWidth, (ctx!.canvas.height - (i + 1) * verticalOffset) + textBlockVerticalOffset + 20);

      });
      const brandImg = new Image();
      brandImg.crossOrigin = "";
      brandImg.src = 'assets/img/DE_Logo.svg';

      brandImg.onload = function () {
        const brandWidth = linearlyInterpolate({
          canvasWidth: ctx!.canvas.width,
          minValue: brandImg.width / 3,
          maxValue: brandImg.width / 2
        });
        const brandHeight = linearlyInterpolate({
          canvasWidth: ctx!.canvas.width,
          minValue: brandImg.height / 3,
          maxValue: brandImg.height / 2
        });
        ctx!.drawImage(brandImg, 20, 20, brandWidth, brandHeight);
      };

      props.onChange(canvasRef.toDataURL('image/jpeg', 1.0));

      setCanvasRef(canvasRef)

    }
  }
  });

  return <canvas  ref={(newRef) => setCanvasRef(newRef)} />;
};

export default ShareCanvas;
