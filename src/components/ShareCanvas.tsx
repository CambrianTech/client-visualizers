import React, { useRef, useEffect } from 'react';

const ShareCanvas: React.FC<{url: string}> = (props) => {
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
      const size = Math.min(ctx!.canvas.width, ctx!.canvas.height);
      const xPos = (ctx!.canvas.width) * 0.5;
      ctx!.drawImage(img, 0, 0, ctx!.canvas.width, newHeight);
    }
  }
  }, [props.url]);

  return <canvas  ref={canvasRef}></canvas>;
};

export default ShareCanvas;