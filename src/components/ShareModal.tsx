import React, {
  useEffect, useMemo, useState
} from "react";
import { PropsWithChildren } from "react";
import styled from "styled-components";
import {
  Dialog,
  IconButton,
  Icon,
  DialogContent,
  Backdrop,
} from "@mui/material";
import {
  ProductItem,
  CBContentManager,
  ImageSource,
  CBARScene,
  drawBeforeAfter,
  UrlDict
} from "react-home-ar";
import {
  EmailIcon,
  EmailShareButton,
  FacebookIcon,
  FacebookShareButton,
  PinterestIcon,
  PinterestShareButton,
} from "react-share";
import { copyTextToClipboard, download } from "../utilities/Methods";
import "./ShareModal.css";
import ShareCanvas from "./ShareCanvas";

const MOBILE_CUTOFF = 480;
const SMALL_SOCIAL_ICON_SIZE = 32;
const BIG_SOCIAL_ICON_SIZE = 46;

type Props = PropsWithChildren<{
  onClose(): void;
  isOpen: boolean;
  products?: ProductItem[];
  logoSrc: string;
  shareImageUrl: string;
  scene:CBARScene|undefined
}>;

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
  overflow: hidden;
`;

const ShareWrapper = styled.div`
  display: flex;
  width: 100%;
  justify-content: center;
  bottom: 0;
  max-width: 100%;
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

const CloseIcon = styled(Icon)`
  color: white;
  opacity: 1;
`;

const StyledBackdrop = styled(Backdrop)`
  z-index: -1;
  background-color: rgba(0, 0, 0, 0.7);
`;

const StyledSvg = styled.svg`
  position: absolute;
  min-width: ${props => props.width}px;
`;

const BlackCircle = ({ size }: { size: number }) => {

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

function getShareUrl() {
  const url = window.location.href;
  return url.replace('localhost:3000', 'dunn-edwards.cambrianar.com');
}

export function ShareModal({
  onClose,
  isOpen,
  products,
  logoSrc,
  shareImageUrl,
    scene,

}: Props) {
  const mobileMediaQuery = window.matchMedia(`(max-width: ${MOBILE_CUTOFF}px)`);
  const isMobile = mobileMediaQuery.matches;
  const socialIconSize = isMobile
    ? SMALL_SOCIAL_ICON_SIZE
    : BIG_SOCIAL_ICON_SIZE;
  const [canvasDownloadLink, setCanvasDownloadLink] = useState<string>();

  const uploadChanges = React.useCallback(async (scene:CBARScene, render:ImageSource, original:ImageSource) => {

    const before = CBContentManager.imageToCanvasContext(original)!.canvas
    const after = CBContentManager.imageToCanvasContext(render)!.canvas
    const beforeAfter = drawBeforeAfter(before, after)!.canvas

    const images: { [name: string]: ImageSource; } = {
      "share": render, "pinterest": beforeAfter
    };

    return CBContentManager.default!.uploadFiles(images)
  }, [])

  const [uploadNames, setUploadNames] = useState<UrlDict>()

  useEffect(()=>{
    const original = scene?.backgroundImage?.image;
    if (scene && canvasDownloadLink && original) {
      //console.log("Perform upload")
      CBContentManager.dataUrlToImage(canvasDownloadLink)
          .then(render=>uploadChanges(scene, render, original))
          .then((results)=>{
            //console.log("Changes Uploaded", results)
            setUploadNames(results);
          })
    }
  }, [canvasDownloadLink, scene, shareImageUrl, uploadChanges])

  const pinterestImage = useMemo(()=>{
    return uploadNames ? uploadNames["pinterest"] : shareImageUrl;
  }, [shareImageUrl, uploadNames])

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
        <ShareCanvas  logoSrc={logoSrc} onChange={(val: string) => {setCanvasDownloadLink(val)}} url={shareImageUrl} products={products}/>
      </StyledDialogContent>

      <ShareWrapper>
        <ShareItem>
          {/** Doesn't work for localhost, but works for proper websites **/}
          <FacebookShareButton url={getShareUrl()}>
            <FacebookIcon
              bgStyle={{ fill: "black", stroke: "white", strokeWidth: 2 }}
              size={socialIconSize}
              round
            />
          </FacebookShareButton>
        </ShareItem>

        <ShareItem>
            {/** Doesn't work for localhost, but works for proper websites and images **/}
            <PinterestShareButton url={getShareUrl()} media={pinterestImage}>
              <PinterestIcon
                bgStyle={{ fill: "black", stroke: "white", strokeWidth: 2 }}
                size={socialIconSize}
                round
              />
            </PinterestShareButton>
        </ShareItem>

        {/*<ShareItem>*/}
        {/*  <TwitterShareButton url={getShareUrl()}>*/}
        {/*    <TwitterIcon*/}
        {/*      bgStyle={{ fill: "black", stroke: "white", strokeWidth: 2 }}*/}
        {/*      size={socialIconSize}*/}
        {/*      round*/}
        {/*    />*/}
        {/*  </TwitterShareButton>*/}
        {/*</ShareItem>*/}

        <ShareItem>
          <EmailShareButton url={getShareUrl()}>
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
            onClick={() => canvasDownloadLink && download(canvasDownloadLink, "my-visualization.jpg")}
          >
            <BlackCircle size={socialIconSize} />
            <ShareIcon>download</ShareIcon>
          </DownloadShareButton>
        </ShareItem>

        <ShareItem>
          <CopyShareButton
            disableRipple
            onClick={() => canvasDownloadLink && copyTextToClipboard(canvasDownloadLink)}
          >
            <BlackCircle size={socialIconSize} />
            <ShareIcon>link</ShareIcon>
          </CopyShareButton>
        </ShareItem>
      </ShareWrapper>
    </Dialog>
  );
}
