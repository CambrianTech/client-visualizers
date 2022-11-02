import React, {useContext, useCallback, useState, Suspense, lazy} from "react"
import './ChooseSource.css'

import {ImageProperties, ImageUpload, ServerProgress} from "react-cambrian-ui";
import {Progress} from "../components/Progress";
import {SiteContext} from "../data/SiteContext";
import {Icon} from "@mui/material";

export default function ChooseSource(props: any) {
    const siteContext = useContext(SiteContext)!;
    const dispatch = siteContext.dispatch;
    const [progressText, setProgressText] = useState("");
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [progressVisible, setProgressVisible] = useState(false);

    function proceedToSamples(e: React.MouseEvent<HTMLInputElement>) {

    }

    function onImageChosen(imageProperties: ImageProperties) {

    }

    const onProgress = useCallback((uploadProgress: ServerProgress) => {
        if (uploadProgress.message) {
            setProgressText(uploadProgress.message)
        }
        if (uploadProgress.progress !== undefined) {
            setProgressPercentage(uploadProgress.progress)
        }
        setProgressVisible(uploadProgress.visible);

        if (uploadProgress.error) {
            switch (uploadProgress.error.constructor) {
                case Promise: {
                    const promise = uploadProgress.error as Promise<any>;
                    promise.catch((error: any) => {
                        siteContext.dispatch({ type: "setError", error: error })
                    });
                    break;
                }
                default: {
                    siteContext.dispatch({ type: "setError", error: uploadProgress.error })
                }
            }
        }

    }, [siteContext]);

    return (
        <div className="choose-source">
            <Progress visible={progressVisible} percentage={progressPercentage} statusText={progressText} buttonText={"Share"} />
            <div className="fullscreen-grid">
                <ImageUpload className="fullscreen-column upload" onImageChosen={onImageChosen} onProgress={onProgress}>
                    <Icon>add_a_photo</Icon>
                </ImageUpload>
                <div className="fullscreen-column samples" onClick={proceedToSamples}>
                    Samples here for {siteContext.state.brandRoot?.displayName}
                </div>
            </div>
        </div>
    )
}