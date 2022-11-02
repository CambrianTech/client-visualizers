import React, {useContext, useCallback, useState, useMemo} from "react"
import './ChooseSource.css'

import {ImageProperties, ImageUpload, ServerProgress} from "react-cambrian-ui";
import {Progress} from "../components/Progress";
import {SiteContext} from "../data/SiteContext";
import {Icon} from "@mui/material";
import {ProductBrand, SceneCollection} from "react-home-ar";
import {resolveSceneThumbnailPath} from "../index";

type SceneListingProps = {
    sceneCollection:SceneCollection
}

const SceneListing = React.memo<SceneListingProps>(
    (props) => {

        return (
            <div className={"scene-picker"}>
                <div>
                    {props.sceneCollection.displayName}
                </div>
                <div className={"scene-listing"}>
                    <div className={"scene-listing-content"}>
                        {props.sceneCollection.scenes.map((scene) => {
                            return (
                                <div key={scene.code}>
                                    <img src={resolveSceneThumbnailPath(scene)} alt={scene.displayName}/>
                                    {scene.displayName}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        );
    }
);

export default function ChooseSource(props: any) {
    const siteContext = useContext(SiteContext)!;
    const dispatch = siteContext.dispatch;
    const [progressText, setProgressText] = useState("");
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [progressVisible, setProgressVisible] = useState(false);

    const rootItem = useMemo<ProductBrand|undefined>(()=>{
        return siteContext.state.brandRoot;
    }, [siteContext.state.brandRoot]);

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
                    <div>
                        Choose from one of the pre-set scenes
                    </div>
                    <div className={"scenes"}>
                        {rootItem?.sceneCollections.map((sceneCollection) => {
                            return (
                                <div key={sceneCollection.code}>
                                    <SceneListing sceneCollection={sceneCollection}/>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}