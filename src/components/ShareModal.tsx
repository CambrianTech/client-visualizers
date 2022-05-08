import React, { useState
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
import {ProductItem, CBARContext, CBContentManager} from "react-home-ar";
import {
  EmailIcon,
  EmailShareButton,
  FacebookIcon,
  FacebookShareButton,
  PinterestIcon,
  PinterestShareButton,
  TwitterIcon,
  TwitterShareButton,
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

}: Props) {
  const mobileMediaQuery = window.matchMedia(`(max-width: ${MOBILE_CUTOFF}px)`);
  const isMobile = mobileMediaQuery.matches;
  const socialIconSize = isMobile
    ? SMALL_SOCIAL_ICON_SIZE
    : BIG_SOCIAL_ICON_SIZE;
  const [canvasDownloadLink, setCanvasDownloadLink] = useState(shareImageUrl);

  const pinterestBeforeOnClick = async () => {
    if(canvasDownloadLink) {
      const img = await CBContentManager.dataUrlToImage(canvasDownloadLink);
      CBContentManager.default!.registerImage('my-visualization.jpg');
      const url = await CBContentManager.default!.uploadFile(img, 'my-visualization.jpg');
    }
  };

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
            <PinterestShareButton beforeOnClick={pinterestBeforeOnClick} url={getShareUrl()} media={shareImageUrl}>
              <PinterestIcon
                bgStyle={{ fill: "black", stroke: "white", strokeWidth: 2 }}
                size={socialIconSize}
                round
              />
            </PinterestShareButton>
        </ShareItem>

        <ShareItem>
          <TwitterShareButton url={getShareUrl()}>
            <TwitterIcon
              bgStyle={{ fill: "black", stroke: "white", strokeWidth: 2 }}
              size={socialIconSize}
              round
            />
          </TwitterShareButton>
        </ShareItem>

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
            onClick={() => download(canvasDownloadLink, "my-visualization.jpg")}
          >
            <BlackCircle size={socialIconSize} />
            <ShareIcon>download</ShareIcon>
          </DownloadShareButton>
        </ShareItem>

        <ShareItem>
          <CopyShareButton
            disableRipple
            onClick={() => copyTextToClipboard(canvasDownloadLink)}
          >
            <BlackCircle size={socialIconSize} />
            <ShareIcon>link</ShareIcon>
          </CopyShareButton>
        </ShareItem>
      </ShareWrapper>
    </Dialog>
  );
}
