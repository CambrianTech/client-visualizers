import React, { useRef, useEffect } from 'react';
import { ProductItem } from "react-home-ar";
// import  BrandWatermark  from "../../cambrianar-sites/dunn-edwards/branding/DE-logo.svg";

const ShareCanvas: React.FC<{logoSrc: string, downloadUrl: string, onChange: (arg: string) => void, url: string, products?: ProductItem[] }> = (props) => {
  let canvasRef = useRef<HTMLCanvasElement | null>(null);
  let canvasCtxRef = React.useRef<CanvasRenderingContext2D | null>(null);


  useEffect(() => {
    // Initialize
    const img = new Image();
    img.crossOrigin = "";
    img.src = props.url;
    
    
  
    img.onload = () => {
    if (canvasRef.current) {
      canvasCtxRef.current = canvasRef.current.getContext('2d');
      let ctx = canvasCtxRef.current;

      ctx!.canvas.style.width = "100%";
      ctx!.canvas.style.height = "100%";
      ctx!.canvas.style.overflow = "none";
      

      ctx!.canvas.width = ctx!.canvas.offsetWidth;
      let ratio = ctx!.canvas.width / img.width;
  
      let newHeight = img.height * ratio;
      ctx!.canvas.height = newHeight;

      //Draw Image
      ctx!.drawImage(img, 0, 0, ctx!.canvas.width, newHeight);
      // ctx!.drawImage(brandImg, 40, 40,100, 100);
      let gradient = ctx!.createLinearGradient(0, 0, 0, newHeight );
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(.7, "rgba(0, 0, 0, 0.3)");
      gradient.addColorStop(1, "rgba(0, 0, 0, .4)");
      ctx!.fillStyle = gradient;
      ctx!.fillRect(0, 0, ctx!.canvas.width, newHeight);


      props.products?.map((product, i) => {

        //Draw Colored Rectangle Swatch
        ctx!.beginPath();
        ctx!.fillStyle = product.color? product.color : "white";
        ctx!.fillRect(ctx!.canvas.width -  55, ctx!.canvas.height - (i + 1) * 60, 40, 40);
        ctx!.stroke();

        //Draw Swatch Outline
        ctx!.beginPath();
        ctx!.lineWidth = 2;
        ctx!.strokeStyle = "white";
        ctx!.rect(ctx!.canvas.width -  55, ctx!.canvas.height - (i + 1) * 60, 40, 40);
        ctx!.stroke();

        //Add Text

        const fontFamily = "Lato,Avenir Next,Roboto,Verdana,serif";
        ctx!.font = `200 14px ${fontFamily}`;
        ctx!.canvas.style.letterSpacing = ".5px";
        ctx!.shadowColor="black";
        ctx!.shadowBlur=2;
        ctx!.lineWidth=1;
        const textWidth = ctx!.measureText(product.displayName? product.displayName.toUpperCase(): "").width;
        const codeWidth = ctx!.measureText(product.code? product.code.toUpperCase(): "").width;
        ctx!.strokeText(product.displayName? product.displayName.toUpperCase() : "", ctx!.canvas.width - 75 - textWidth, (ctx!.canvas.height - (i + 1) * 60) + 15 );
        ctx!.strokeText(product.code? product.code.toUpperCase() : "", ctx!.canvas.width - 75 - codeWidth, (ctx!.canvas.height - (i + 1) * 60) + 35 );
        ctx!.fillStyle = "white";
        ctx!.shadowBlur=0;
        ctx!.fillText(product.displayName? product.displayName.toUpperCase() : "", ctx!.canvas.width  - 75- textWidth, (ctx!.canvas.height - (i + 1) * 60) + 15 );
        ctx!.strokeText(product.code? product.code.toUpperCase() : "", ctx!.canvas.width - 75 - codeWidth, (ctx!.canvas.height - (i + 1) * 60) + 35 );

    
      })
      const brandImg = new Image();
      brandImg.crossOrigin = "";
      brandImg.src = props.logoSrc;

      ctx!.drawImage(brandImg, 20, 20, brandImg.width /2, brandImg.height /2);

      props.onChange(canvasRef.current.toDataURL('image/jpeg', 1.0));
    }
  }
  });

  return <canvas  ref={canvasRef}></canvas>;
};

export default ShareCanvas;