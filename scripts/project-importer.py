from os.path import join
import os
import json
import cv2
import numpy as np
import sys
import click

IMAGE_WHITELIST = {
    "main": "background.jpg",
    "lighting": "lighting.jpg",
    "index_mask": "index_mask.png",
    "preview": "preview.jpg",
    "thumbnail": "thumbnail.jpg",
}

#lower case only
SCENE_WHITELIST = ["version", "name", "id", "floorRotation", "images", "camera", "geometry"]

SURFACE_WHITELIST = ["id", "type", "name", "maskIndex", "normal", "offset", "axisRotation", "backgroundMean", "backgroundStdDev", "lightingMean", "lightingStdDev"]
SURFACE_TYPE_WHITELIST = ["floor", "ceiling", "wall"]

def resize(image, window_height):
    aspect_ratio = float(image.shape[1])/float(image.shape[0])
    window_width = window_height/aspect_ratio
    image = cv2.resize(image, (int(window_height),int(window_width)))
    return image

@click.command()
@click.argument("input_file", type=click.Path(exists=True, file_okay=True, dir_okay=False))
@click.argument("output_file", type=click.Path(exists=False, file_okay=True, dir_okay=False))
@click.option('--single_mask_output', '-s', is_flag=True, help="Specify to generate individual masks (useful for editing masks individually and re-importing without flag)")
@click.option('--max_image_size', type=int, default=1536)
@click.option('--max_mask_size', type=int, default=1280)
@click.option('--preview_size', type=int, default=1024)
@click.option('--thumbnail_size', type=int, default=640)
@click.option('--version', type=str, default="4.0.2.1000")

def main(input_file, output_file, single_mask_output, max_image_size, max_mask_size, preview_size, thumbnail_size, version):

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

        image = cv2.imread(input_path)

        if name == "lighting" and len(image.shape) == 3:
            image = image[:,:,0] #monochrome
        elif len(image.shape) == 3 and image.shape[2] == 4:
            image = image[:,:,:3]

        image = resize(image, max_image_size)

        images[name] = image

        cv2.imwrite(output_path, image, [int(cv2.IMWRITE_JPEG_QUALITY), 90])

    vertical_axis = "z"
    if "verticalAxis" in data["geometry"]:
        vertical_axis = data["geometry"]["verticalAxis"]

    surfaces = data["geometry"]["surfaces"]

    background = images["main"]

    index_mask = images["index_mask"] if "index_mask" in images else None
    is_multimask_source = index_mask is None
    alpha_mask = None

    if index_mask is not None and len(index_mask.shape) == 3:
        if index_mask.shape[2] == 4:
            alpha_mask = index_mask[:,:,3]
        index_mask = index_mask[:,:,0]

    max_width = 0

    filtered_surfaces = []
    masks = []

    for index, surface in enumerate(surfaces):
        if surface["type"].lower() not in SURFACE_TYPE_WHITELIST:
            print("Skipping surface %s of type %s" % (surface["name"], surface["type"]))
            continue

        if index_mask is not None:
            maskIndex = surface["maskIndex"]
            mask = np.zeros(index_mask.shape[:2], dtype=np.uint8)
            mask[index_mask == maskIndex] = 1
        elif "images" in surface:
            input_name = surface["images"]["mask"]
            input_path = os.path.join(src_dir, input_name)
            mask = cv2.imread(input_path)
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

    print("image shape", background.shape, "mask output shape", mask_shape)

    if not single_mask_output:
        index_mask = None
        output_path = os.path.join(dest_dir, "plane_masks")
        if not os.path.exists(output_path):
            os.mkdir(output_path)
    else:
        index_mask = np.zeros(mask_shape, dtype=np.uint8)
        alpha_mask = np.ones(mask_shape, dtype=np.uint8) * 255

    num_surfaces = len(masks)
    for index, surface in enumerate(filtered_surfaces):
        maskIndex = int((1 + index) * 255 / (1 + num_surfaces)) #evenly spaced

        surface["maskIndex"] = maskIndex
        mask = masks[index]

        if mask.shape != mask_shape:
            mask = cv2.resize(mask, (mask_shape[1], mask_shape[0]))

        # mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_RECT,(2,2)))
        # mask = cv2.GaussianBlur(mask,(3, 3), cv2.BORDER_DEFAULT)

        if single_mask_output:
            where = np.where(np.logical_and(mask > 0, mask < 255))
            alpha_mask[where] = mask[where]
            surface.pop('images', None)
            index_mask[mask > 0] = maskIndex
        else:
            mask_path = surface["images"]["mask"] if "images" in surface else "plane_masks/%s-%d.png" % (surface["type"], index)
            surface["images"] = {"mask": mask_path}
            print("Saving mask", mask_path)
            cv2.imwrite(os.path.join(dest_dir, mask_path), mask)
            

    data["geometry"]["surfaces"] = filtered_surfaces
    data["geometry"]["verticalAxis"] = "y"
    data["version"] = version

    cv2.imwrite(os.path.join(dest_dir, IMAGE_WHITELIST["preview"]), resize(background, preview_size), [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    data["images"].pop('preview', None)

    cv2.imwrite(os.path.join(dest_dir, IMAGE_WHITELIST["thumbnail"]), resize(background, thumbnail_size), [int(cv2.IMWRITE_JPEG_QUALITY), 50])
    data["images"].pop('thumbnail', None)

    if not single_mask_output:
        data["images"].pop('index_mask', None)
    else:
        index_mask = cv2.cvtColor(index_mask, cv2.COLOR_GRAY2RGBA)
        index_mask[:,:,3] = alpha_mask

        output_path = os.path.join(dest_dir, IMAGE_WHITELIST["index_mask"])
        print("Saving regenerated index mask", output_path)
        data["images"]["index_mask"] = IMAGE_WHITELIST["index_mask"]
        cv2.imwrite(output_path, index_mask)

    with open(output_file, "w") as outfile:
        json.dump(data, outfile, indent=5)

if __name__ == "__main__":
    main()
