import React, {
  useState,
  useEffect,
  useRef,
  createRef,
  ReactNode,
} from "react";
import { PropsWithChildren } from "react";
import styled from "styled-components";
import {
  Dialog,
  IconButton,
  Icon,
  DialogContent,
  Backdrop,
} from "@material-ui/core";
import { ProductItem, CBARContext } from "react-home-ar";
import {
  EmailIcon,
  EmailShareButton,
  FacebookIcon,
  FacebookShareButton,
  LinkedinIcon,
  LinkedinShareButton,
  TumblrIcon,
  TumblrShareButton,
  TwitterIcon,
  TwitterShareButton,
} from "react-share";
import { copyTextToClipboard, download } from "../utilities/Methods";
import "./ShareModal.css";
import { ContactsOutlined } from "@material-ui/icons";
import ShareCanvas from "./ShareCanvas";

const MOBILE_CUTOFF = 480;
const MED_SCREEN_CUTOFF = 720;
const SMALL_SOCIAL_ICON_SIZE = 32;
const BIG_SOCIAL_ICON_SIZE = 46;

type Props = PropsWithChildren<{
  onClose(): void;
  isOpen: boolean;
  products?: ProductItem[];
  context?: CBARContext;
  shareImageUrl: string;
}>;

const ColorWrapper = styled.div`
  display: flex;
  align-items: center;
  padding-left: 20px;
  padding-right: 20px;
  @media (max-device-width: ${MOBILE_CUTOFF}px) {
    padding-bottom: 0;
    padding-right: 0;
  }
`;

const ColorBox = styled.div`
  width: 40px;
  height: 40px;
  background-color: ${(props) => props.color};
  margin-left: 10px;
  border: 2px solid white;
  @media (max-device-width: ${MED_SCREEN_CUTOFF}px) {
    width: 20px;
    min-width: 20px;
    height: 20px;
  }
`;

const ColorItem = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  color: white;
  text-align: right;
  margin-top: 8px;
`;

const ColorsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: end;
  justify-content: end;
  padding-bottom: 8px;
`;

const TopRightCloseButton = styled(IconButton)`
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 1;
  padding-top: 20px;
  @media (max-device-width: ${MOBILE_CUTOFF}px) {
    padding-top: 10px;
  }
`;

const FullWidthImage = styled.img`
  max-width: 100%;
  display: block;
  object-fit: cover;
`;

const CopyShareButton = styled(IconButton)`
  background-color: transparent;
  color: white;
  height: ${BIG_SOCIAL_ICON_SIZE}px;
  width: ${BIG_SOCIAL_ICON_SIZE}px;
  position: relative;
  &:hover: {
    background-color: transparent;
  }
  @media (max-device-width: ${MOBILE_CUTOFF}px) {
    height: ${SMALL_SOCIAL_ICON_SIZE}px;
    width: ${SMALL_SOCIAL_ICON_SIZE}px;
  }
`;

const DownloadShareButton = styled(IconButton)`
  background-color: transparent;
  color: white;
  height: ${BIG_SOCIAL_ICON_SIZE}px;
  width: ${BIG_SOCIAL_ICON_SIZE}px;
  position: relative;
  &:hover: {
    background-color: transparent;
  }
  @media (max-device-width: ${MOBILE_CUTOFF}px) {
    height: ${SMALL_SOCIAL_ICON_SIZE}px;
    width: ${SMALL_SOCIAL_ICON_SIZE}px;
  }
`;

const ShareIcon = styled(Icon)`
  font-size: 24px;
  position: absolute;
  @media (max-device-width: ${MOBILE_CUTOFF}px) {
    font-size: 18px;
  }
`;

const StyledDialogContent = styled(DialogContent)`
  padding: 0;
  background-color: black;
  display: flex;
  justify-content: center;
`;

const ShareWrapper = styled.div`
  display: flex;
  width: 100%;
  justify-content: center;
  bottom: 0;
  max-width: 100%;
  overflow-y: auto;
  padding-top: 12px;
`;

const ShareItem = styled.div`
  margin-right: 8px;
  margin-left: 8px;
  pointer-events: auto;
  @media (max-device-width: ${MOBILE_CUTOFF}px) {
    margin-right: 4px;
    margin-left: 4px;
  }
  position: relative;
`;

const DisplayName = styled.div`
  @media (max-device-width: ${MOBILE_CUTOFF}px) {
    font-size: 12px;
  }
`;
const ProductCode = styled.div`
  @media (max-device-width: ${MOBILE_CUTOFF}px) {
    font-size: 12px;
  }
`;

const BottomScrim = styled.div`
  position: absolute;
  width: 100%;
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.4),
    rgba(0, 0, 0, 0.3) 70%,
    rgba(0, 0, 0, 0)
  );
  height: 160px;
  padding-right: 12px;
  bottom: 62px;
  pointer-events: none;
  display: flex;
  flex-direction: row-reverse;
  @media (max-device-width: ${MOBILE_CUTOFF}px) {
    height: 140px;
    bottom: 48px;
  }
`;

const CloseIcon = styled(Icon)`
  color: white;
  opacity: 1;
`;

const StyledBackdrop = styled(Backdrop)`
  z-index: -1;
  background-color: rgba(0, 0, 0, 0.7);
`;

function BlackCircle({ size }: { size: number }) {
  const StyledSvg = styled.svg`
    position: absolute;
    min-width: ${size}px;
  `;
  return (
    <StyledSvg viewBox="0 0 64 64" width={size} height={size}>
      <circle
        cx="32"
        cy="32"
        r="31"
        fill="#000"
        stroke="#fff"
        strokeWidth={2}
      />
    </StyledSvg>
  );
}

function drawCanvas(ref: React.MutableRefObject<HTMLCanvasElement | null>, imgUrl: string ) {
  console.log("ref", ref)
  const ctx = ref?.current?.getContext("2d");

  const img = new Image();
  img.crossOrigin = "";
  img.src = imgUrl;

  img.onload = () => {
    console.log("HI 2");

    if(ctx) {
    //set height / width of canvas
    ctx.canvas.style.width = "100%";
    ctx.canvas.style.height = "100%";
    ctx.canvas.style.overflow = "none";

    //set hegiht / width of canvas
    ctx.canvas.width = Math.min(img.width, img.height);
    ctx.canvas.height = Math.min(img.width, img.height);

    //Draw Image
    const size = Math.min(ctx.canvas.width, ctx.canvas.height);
    const xPos = (ctx.canvas.width - size) * 0.5;
    ctx.drawImage(img, xPos, 0, size, size);
  }
  }

        // //Draw rectangle
      // const bottom = size;
      // const farRight = ctx.canvas.width - (ctx.canvas.width - size) * 0.5;

      // ctx.beginPath();
      // ctx.lineWidth = 5;
      // ctx.fillStyle = "blue";

      // ctx.strokeStyle = "white";
      // ctx.fillRect(farRight -  100, bottom - 100, 80, 80);
      // ctx.stroke();

    //   products?.map((product, i) => {
    //     console.log("i", i);
    //   ctx.beginPath();
    //   ctx.lineWidth = 5;
    //   ctx.fillStyle = "blue";

    //   ctx.strokeStyle = "white";
    //   ctx.fillRect(farRight - (i + 1) * 100, bottom - (i + 1) * 100, 80, 80);
    //   ctx.stroke();
    // });
      // Start a new path


}


export function ShareModal({
  onClose,
  isOpen,
  products,
  context,
  shareImageUrl,
  
}: Props) {
  const mobileMediaQuery = window.matchMedia(`(max-width: ${MOBILE_CUTOFF}px)`);
  const isMobile = mobileMediaQuery.matches;
  const socialIconSize = isMobile
    ? SMALL_SOCIAL_ICON_SIZE
    : BIG_SOCIAL_ICON_SIZE;
    let newCanvas: HTMLCanvasElement | OffscreenCanvas;
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [canvasCtxRef, setCanvasCtxRef] = React.useState<CanvasRenderingContext2D | null>(null);

  
    
  // useEffect(() => {
  //   // Initialize
  //   if(context ) {
  //     newCanvas = context?.gl.renderer.getContext().canvas;
  //   }
  //   // console.log("canvas ref", canvasRef)
  //   // if (canvasRef.current) {
  //   //   canvasCtxRef!.current = canvasRef.current.getContext('2d');
  //   //   let ctx = context?.gl.renderer.getContext().canvas;

  //   //   console.log("canvas ctx ref", canvasCtxRef)
  //   //   const img = new Image();
  //   //   img.crossOrigin = "";
  //   //   img.src = shareImageUrl;
  //   //   ctx!.canvas.style.width = "100%";
  //   //   ctx!.canvas.style.height = "100%";
  //   //   ctx!.canvas.style.overflow = "none";

  //   //   ctx!.canvas.width = Math.min(img.width, img.height);
  //   //   ctx!.canvas.height = Math.min(img.width, img.height);
  //   //   // ctx!.canvas.width = 500;
  //   //   // ctx!.canvas.height = 500;
  
  //   //   //Draw Image
  //   //   const size = Math.min(ctx!.canvas.width, ctx!.canvas.height);
  //   //   const xPos = (ctx!.canvas.width - size) * 0.5;
  //   //   ctx!.drawImage(img, xPos, 0, size, size);


  //   //}
  // }, [context]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      aria-labelledby="share-modal"
      fullWidth
      maxWidth={isMobile ? "xl" : "md"}
      BackdropComponent={StyledBackdrop}
      className="share-dialog"
    >
      <TopRightCloseButton aria-label="close" onClick={onClose}>
        <CloseIcon>close</CloseIcon>
      </TopRightCloseButton>

      <StyledDialogContent >
        <ShareCanvas url={shareImageUrl} />
        {/* <FullWidthImage src={shareImageUrl} style={{ pointerEvents: 'none' }} />  */}
      </StyledDialogContent>
      <BottomScrim>
        {products && (
          <ColorsWrapper>
            {products.map((product) => (
              <ColorWrapper key={product.key}>
                <ColorItem>
                  <div>
                    <DisplayName>{product.displayName}</DisplayName>
                    <ProductCode>{product.code}</ProductCode>
                  </div>
                  <ColorBox color={product.color} />
                </ColorItem>
              </ColorWrapper>
            ))}
          </ColorsWrapper>
        )}
      </BottomScrim>
      <ShareWrapper>
        <ShareItem>
          {/** Doesn't work for localhost, but works for proper websites **/}
          <FacebookShareButton url={window.location.href}>
            <FacebookIcon
              bgStyle={{ fill: "black", stroke: "white", strokeWidth: 2 }}
              size={socialIconSize}
              round
            />
          </FacebookShareButton>
        </ShareItem>
        {/*<ShareItem>*/}
        {/*    /!** Doesn't work for localhost, but works for proper websites **!/*/}
        {/*    <LinkedinShareButton url={window.location.href}>*/}
        {/*        <LinkedinIcon bgStyle={{ fill: 'black', stroke: 'white', strokeWidth: 2 }} size={socialIconSize} round />*/}
        {/*    </LinkedinShareButton>*/}
        {/*</ShareItem>*/}

        {/*<ShareItem>*/}
        {/*    /!** Doesn't work for localhost, but works for proper websites and images **!/*/}
        {/*    <TumblrShareButton url={window.location.href}>*/}
        {/*        <TumblrIcon bgStyle={{ fill: 'black', stroke: 'white', strokeWidth: 2 }} size={socialIconSize} round />*/}
        {/*    </TumblrShareButton>*/}
        {/*</ShareItem>*/}

        {/* Doesn't work without a public URL */}
        {/*<ShareItem>*/}
        {/*    /!** Doesn't work for localhost, but works for proper websites and images **!/*/}
        {/*    <PinterestShareButton url={window.location.href} media={shareImageUrl}>*/}
        {/*        <PinterestIcon size={socialIconSize} round />*/}
        {/*    </PinterestShareButton>*/}
        {/*</ShareItem>*/}

        <ShareItem>
          <TwitterShareButton url={window.location.href}>
            <TwitterIcon
              bgStyle={{ fill: "black", stroke: "white", strokeWidth: 2 }}
              size={socialIconSize}
              round
            />
          </TwitterShareButton>
        </ShareItem>

        <ShareItem>
          <EmailShareButton url={window.location.href}>
            <EmailIcon
              bgStyle={{ fill: "black", stroke: "white", strokeWidth: 2 }}
              size={socialIconSize}
              round
            />
          </EmailShareButton>
        </ShareItem>

        <ShareItem>
          <DownloadShareButton
            disableRipple
            onClick={() => download(shareImageUrl, "my-visualization.jpg")}
          >
            <BlackCircle size={socialIconSize} />
            <ShareIcon>download</ShareIcon>
          </DownloadShareButton>
        </ShareItem>

        <ShareItem>
          <CopyShareButton
            disableRipple
            onClick={() => copyTextToClipboard(window.location.href)}
          >
            <BlackCircle size={socialIconSize} />
            <ShareIcon>link</ShareIcon>
          </CopyShareButton>
        </ShareItem>
      </ShareWrapper>
    </Dialog>
  );
}
