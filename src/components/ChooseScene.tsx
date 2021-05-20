import React from "react";
import {Button, Icon} from "@material-ui/core";
import {ApiCapabilityName, FeatureAppearanceConfig, SiteConfig} from "cambrian-base";
import {getFeatureAppearance, isFeatureEnabled, SITE_PATH} from "../index";

type ChooseSceneProps = {
    hidden?: boolean
    siteData:SiteConfig|undefined
    onSourceClicked:(name:ApiCapabilityName)=>void
}

//"assets/img/brands/shawfloors/landing-bg-img-1440.jpg, assets/img/brands/shawfloors/landing-bg-img-1440@2x.jpg 2x, assets/img/brands/shawfloors/landing-bg-img-1440@3x.jpg 3x"
const resolveSrc = (src:string|undefined) => {
    if (src) {
        if (src.indexOf(",") > 0) {
            const rewritten:string[] = [];
            src.split(",").forEach(src=>{
                const part = resolveSrc(src);
                if (part) rewritten.push(part);
            });
            return rewritten.join(", ");
        }
        return src.startsWith("http") ? src : `${SITE_PATH}/${src}`
    }
};

const UploadStyle:FeatureAppearanceConfig = {
    name:'upload',
    materialIcon:'add_a_photo',
    text:'Upload Photo'
}

const SceneStyle:FeatureAppearanceConfig = {
    name:'scenes',
    materialIcon:'insert_photo',
    text:'Choose Scene'
}

type SourceButtonProps = {
    siteData:SiteConfig
    appearance:FeatureAppearanceConfig
    onSourceClicked:(name:ApiCapabilityName)=>void
    color:'primary' | 'secondary'
}

export const SourceButton = React.memo<SourceButtonProps>(
    (props) => {
        if (!isFeatureEnabled(props.siteData, props.appearance.name)) {
            return null
        }
        return (
            <Button className={"button"} variant="contained" color={props.color} onClick={()=>props.onSourceClicked(props.appearance.name)}>
                <div className={"button-content"}>
                    {props.appearance.materialIcon && <Icon className={"button-icon"}>{props.appearance.materialIcon}</Icon>}
                    {props.appearance.text && <div className={"button-text"}>{props.appearance.text}</div>}
                    {props.appearance.image && <img className={"button-image"} style={props.appearance.image.style}
                                                    width={props.appearance.image.width} height={props.appearance.image.height}
                                                    src={resolveSrc(props.appearance.image.src)}
                                                    srcSet={resolveSrc(props.appearance.image.srcSet)}
                                                    alt={props.appearance.image.alt} /> }
                </div>
            </Button>
        )
    }
);

const ChooseSceneCached = React.memo<ChooseSceneProps>(
    (props) => {
        if (props.siteData) {

            return (
                <div className={"choose-scene"} style={{visibility:props.hidden ? "hidden":"visible"}}>
                    <div className="content">
                        <SourceButton color={'primary'}
                                      appearance={getFeatureAppearance(props.siteData, UploadStyle.name, UploadStyle)}
                                      siteData={props.siteData} onSourceClicked={props.onSourceClicked} />

                        <SourceButton color={'secondary'} appearance={getFeatureAppearance(props.siteData, SceneStyle.name, SceneStyle)}
                                      siteData={props.siteData} onSourceClicked={props.onSourceClicked} />

                    </div>
                </div>
            );
        }
        return null;
    }
);

export function ChooseScene(props: ChooseSceneProps) {

    return (
        <ChooseSceneCached {...props} />
    )
}