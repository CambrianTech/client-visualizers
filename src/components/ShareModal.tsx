import React from 'react';
import { PropsWithChildren } from 'react';
import styled from 'styled-components';
import {Dialog, IconButton, Icon, DialogContent} from "@material-ui/core";
import {CBARImageCollection, ProductItem} from "react-home-ar";
import {
    EmailIcon,
    EmailShareButton, FacebookIcon,
    FacebookShareButton, LinkedinIcon,
    LinkedinShareButton, PinterestIcon,
    PinterestShareButton, TumblrIcon,
    TumblrShareButton, TwitterIcon,
    TwitterShareButton,
} from "react-share";
import {copyTextToClipboard, download} from "../utilities/Methods";

type Props = PropsWithChildren<{
    onClose(): void;
    isOpen: boolean;
    products?: ProductItem[]
    imageCollection?: CBARImageCollection
    shareImageUrl:string
}>;

const ColorWrapper = styled.div`
    display: flex;
    align-items: center;
    padding-left: 20px;
    padding-right: 20px;
    padding-top: 20px;
`;

const ColorBox = styled.div`
    width: 40px;
    height: 40px; 
    background-color: ${props => props.color};
    margin-right: 10px;
`;

const TopRightCloseButton = styled(IconButton)`
    position: absolute;
    right: 8px;
    top: 8px;
`;

const FullWidthImage = styled.img`
    max-width: 100%;
`;

const CopyShareButton = styled(IconButton)({
    backgroundColor: '#000',
    color: 'white',
    height: 62,
    width: 62,
    fontSize: 24,
    '&:hover': {
        backgroundColor: 'rgba(0,0,0,1)'
    }
});

const DownloadShareButton = styled(IconButton)({
    backgroundColor: 'rgba(67,67,67,1)',
    color: 'white',
    height: 62,
    width: 62,
    fontSize: 24,
    '&:hover': {
        backgroundColor: 'rgba(67,67,67,1)'
    }
});

const CopyShareIcon = styled(Icon)`
    font-size: 32px;
`;

const StyledDialogContent = styled(DialogContent)`
    padding-left: 0;
    padding-right: 0;
    padding-top: 0;
    padding-bottom: 20px;
`;

const ShareWrapper = styled.div`
    display: flex;
    justify-content: center;
`;

const ShareItem = styled.div`
    margin-right: 8px;
    margin-left: 8px;
`;

export function ShareModal({ onClose, isOpen, children, products, shareImageUrl}: Props) {
    // fake image until we can figure out how to import image dynamically.

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            aria-labelledby="share-modal"
            fullWidth
            maxWidth="md"
        >
            <TopRightCloseButton
                aria-label="close"
                onClick={onClose}
            >
                <Icon>close</Icon>
            </TopRightCloseButton>
            <StyledDialogContent>
                <div>
                    <FullWidthImage src={shareImageUrl} />
                </div>
                {
                    products
                    && (
                        <ColorWrapper>
                            {products.map((product) => (
                                <div key={product.key}>
                                    <ColorBox color={product.color} />
                                    {`${product.displayName} ${product.code}`}
                                </div>
                            ))}
                        </ColorWrapper>
                    )
                }

                <ShareWrapper>
                    <input readOnly id="hidden-copy-input" style={{ height: 0, width: 0, opacity: 0 }} type="text" value={shareImageUrl} />
                    <ShareItem>
                        {/** Doesn't work for localhost, but works for proper websites **/}
                        <FacebookShareButton url={window.location.href}>
                            <FacebookIcon round />
                        </FacebookShareButton>
                    </ShareItem>
                    <ShareItem>
                        {/** Doesn't work for localhost, but works for proper websites **/}
                        <LinkedinShareButton url={window.location.href}>
                            <LinkedinIcon round />
                        </LinkedinShareButton>
                    </ShareItem>

                    <ShareItem>
                        {/** Doesn't work for localhost, but works for proper websites and images **/}
                        <PinterestShareButton url={window.location.href} media={shareImageUrl}>
                            <PinterestIcon round />
                        </PinterestShareButton>
                    </ShareItem>

                    <ShareItem>
                        {/** Doesn't work for localhost, but works for proper websites and images **/}
                        <TumblrShareButton url={window.location.href}>
                            <TumblrIcon round />
                        </TumblrShareButton>
                    </ShareItem>

                    <ShareItem>
                        <TwitterShareButton url={window.location.href}>
                            <TwitterIcon round />
                        </TwitterShareButton>
                    </ShareItem>

                    <ShareItem>
                        <EmailShareButton url={window.location.href}>
                            <EmailIcon round />
                        </EmailShareButton>
                    </ShareItem>

                    <ShareItem>
                        <DownloadShareButton disableRipple onClick={() => download(shareImageUrl, 'my-visualization.jpg')}>
                            <CopyShareIcon>download</CopyShareIcon>
                        </DownloadShareButton>
                    </ShareItem>

                    <ShareItem>
                        <CopyShareButton disableRipple onClick={() => copyTextToClipboard(window.location.href)}>
                            <CopyShareIcon>link</CopyShareIcon>
                        </CopyShareButton>
                    </ShareItem>
                </ShareWrapper>

            </StyledDialogContent>
            {children}
        </Dialog>
    );
}
