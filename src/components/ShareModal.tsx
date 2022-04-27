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
  logoSrc: string;
  context?: CBARContext;
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


export function ShareModal({
  onClose,
  isOpen,
  products,
  logoSrc,
  context,
  shareImageUrl,
  
}: Props) {
  const mobileMediaQuery = window.matchMedia(`(max-width: ${MOBILE_CUTOFF}px)`);
  const isMobile = mobileMediaQuery.matches;
  const socialIconSize = isMobile
    ? SMALL_SOCIAL_ICON_SIZE
    : BIG_SOCIAL_ICON_SIZE;
  const [canvasDownloadLink, setCanvasDownloadLink] = useState(shareImageUrl);
  console.log("canvas downlod link", canvasDownloadLink);
  console.log("window", window.location.href);

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
        <ShareCanvas  logoSrc={logoSrc} downloadUrl={canvasDownloadLink} onChange={(val: string) => {setCanvasDownloadLink(val)}} url={shareImageUrl} products={products}/>
      </StyledDialogContent>
 
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
