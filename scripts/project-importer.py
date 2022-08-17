from os.path import join
import os
import json
import cv2
import numpy as np
import sys

try:
    # Try using the v2 API directly to avoid a warning from imageio >= 2.16.2
    from imageio.v2 import imread, imsave
except ImportError:
    from imageio import imread, imsave

import click

IMAGE_WHITELIST = {
        "main": "background.jpg",
        "lighting": "lighting.jpg",
        "index_mask": "index_mask.png"
}

#lower case only
SCENE_WHITELIST = ["version", "name", "id", "floorRotation", "images", "camera", "geometry"]

SURFACE_WHITELIST = ["id", "type", "name", "maskIndex", "normal", "offset", "axisRotation", "backgroundMean", "backgroundStdDev", "lightingMean", "lightingStdDev"]
SURFACE_TYPE_WHITELIST = ["floor", "ceiling", "wall"]

def resize(image, window_height, interpolation=cv2.INTER_AREA):
    aspect_ratio = float(image.shape[1])/float(image.shape[0])
    window_width = window_height/aspect_ratio
    image = cv2.resize(image, (int(window_height),int(window_width)), interpolation)
    return image

@click.command()
@click.argument("input_file", type=click.Path(exists=True, file_okay=True, dir_okay=False))
@click.argument("output_file", type=click.Path(exists=False, file_okay=True, dir_okay=False))
@click.option('--reverse', '-r', is_flag=True, help="Specify to generate individual masks (useful for editing masks individually and re-importing without flag)")
@click.option('--max_image_size', type=int, default=1280)
@click.option('--max_mask_size', type=int, default=1280)
@click.option('--version', type=str, default="4.0.2.1000")

def main(input_file, output_file, reverse, max_image_size, max_mask_size, version):

    if not os.path.exists(input_file):
        raise Exception('The json file does not exist at path {}'.format(json_path))

    data = json.load(open(input_file, 'r'))

    src_dir = os.path.dirname(input_file)
    dest_dir = os.path.dirname(output_file)

    print("Processing", input_file)    

    data["images"] = {k: v for k, v in data["images"].items() if k in IMAGE_WHITELIST.keys()}

    data = {k: v for k, v in data.items() if k in SCENE_WHITELIST}

    images = {}

    for name in data["images"]:
        input_name = data["images"][name]
        input_path = os.path.join(src_dir, input_name)

        output_name = IMAGE_WHITELIST[name]
        output_path = os.path.join(dest_dir, output_name)

        data["images"][name] = output_name

        image = imread(input_path)

        if name == "lighting" and len(image.shape) == 3:
            image = image[:,:,0] #monochrome
        elif len(image.shape) == 3 and image.shape[2] == 4:
            image = image[:,:,:3]

        image = resize(image, max_image_size)

        images[name] = image

        imsave(output_path, image)

    vertical_axis = "z"
    if "verticalAxis" in data["geometry"]:
        vertical_axis = data["geometry"]["verticalAxis"]

    surfaces = data["geometry"]["surfaces"]

    index_mask = images["index_mask"] if "index_mask" in images else None
    background = images["main"]

    max_width = 0

    filtered_surfaces = []
    masks = []

    for index, surface in enumerate(surfaces):
        if surface["type"] not in SURFACE_TYPE_WHITELIST:
            print("Skipping surface %s of type %s" % (surface["name"], surface["type"]))
            continue

        if index_mask is not None:
            maskIndex = surface["maskIndex"]
            mask = np.zeros(index_mask.shape[:2], dtype=np.uint8)
            mask[index_mask == maskIndex] = 1
        elif "images" in surface:
            input_name = surface["images"]["mask"]
            input_path = os.path.join(src_dir, input_name)
            mask = imread(input_path)
            if len(mask.shape) != 2:
                mask = mask[:,:,0]
        else:
            continue

        if vertical_axis == "z":
            #convert to y up
            surface["normal"] = [-surface["normal"][0], -surface["normal"][2], surface["normal"][1]]

        max_width = max(mask.shape[1], max_width)
        masks.append(mask)

        surface = {k: v for k, v in surface.items() if k in SURFACE_WHITELIST}

        filtered_surfaces.append(surface)

    mask_width = min(max_width, max_mask_size)

    mask_height = int(mask_width * background.shape[0] / background.shape[1])
    mask_shape = (mask_height, mask_width)

    print("bg size", background.shape, "mask size", mask_shape)

    if reverse:
        index_mask = None
        output_path = os.path.join(dest_dir, "plane_masks")
        if not os.path.exists(output_path):
            os.mkdir(output_path)
    else:
        index_mask = np.zeros(mask_shape, dtype=np.uint8)

    num_surfaces = len(masks)
    for index, surface in enumerate(filtered_surfaces):
        maskIndex = int((1 + index) * 255 / (1 + num_surfaces)) #evenly spaced

        surface["maskIndex"] = maskIndex
        mask = masks[index]
        if mask.shape[0] != mask_shape[0]:
            mask = cv2.resize(mask, (mask_shape[1], mask_shape[0]), interpolation=cv2.INTER_NEAREST)

        if reverse:
            mask_path = surface["images"]["mask"] if "images" in surface else "plane_masks/%s-%d.png" % (surface["type"], index)
            surface["images"] = {"mask": mask_path}
            print("Saving mask", mask_path)
            mask[mask > 0] = 255
            imsave(os.path.join(dest_dir, mask_path), mask)
        else:
            surface.pop('images', None)
            index_mask[mask > 0] = maskIndex

    data["geometry"]["surfaces"] = filtered_surfaces
    data["geometry"]["verticalAxis"] = "y"
    data["version"] = version

    if reverse:
        data["images"].pop('index_mask', None)
    else:
        output_path = os.path.join(dest_dir, IMAGE_WHITELIST["index_mask"])
        print("Saving regenerated index mask", output_path)
        data["images"]["index_mask"] = IMAGE_WHITELIST["index_mask"]
        imsave(output_path, index_mask)

    with open(output_file, "w") as outfile:
        json.dump(data, outfile, indent=5)

if __name__ == "__main__":
    main()
