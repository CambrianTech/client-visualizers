from os.path import join
import os
import json
import cv2
import numpy as np
import sys
from psd_tools import PSDImage
from pathlib import Path
from PIL import Image

import click

def constrain_image(img, basewidth):
    wpercent = (basewidth/float(img.size[0]))
    hsize = int((float(img.size[1])*float(wpercent)))
    if wpercent > 1:
        return img
    return img.resize((int(basewidth), int(hsize)), Image.ANTIALIAS)

def extract_masks(psd, psd_size, mask_layer_names, images):
    for layer in psd:
        name = ''.join(c.lower() for c in layer.name if not c.isspace())
        if layer.is_group():
            extract_masks(layer, psd_size, mask_layer_names, images)
        elif layer.mask and name in mask_layer_names and not name in images and layer.mask.width > 0:
            mask = layer.mask.topil()
            if not mask: continue

            #do work in opencv
            # mask = np.array(mask)

            # kernel_size = int(min(max(psd_size[0], psd_size[1]) / 1000, 5))
            # kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(kernel_size,kernel_size))

            # mask = cv2.dilate(mask,kernel,iterations = max(int(3 * kernel_size / 4), 1))
            # mask = cv2.blur(mask,(kernel_size * 5, kernel_size * 5))
            # mask = Image.fromarray(mask)

            print("Got mask from %s layer" % name)
            images[name] = Image.new('L', psd_size)
            images[name].paste(mask, layer.mask.bbox)

    return images

def extract_shadows(image):
    original_size = image.size
    shadows = constrain_image(image, 512)
    shadows = np.array(shadows)
    shadows = cv2.pyrMeanShiftFiltering(shadows, 30, 30)
    shadows = shadows[:,:,0]
    shadows = cv2.GaussianBlur(shadows, (5, 5), 0)
    shadows = Image.fromarray(shadows)
    shadows = shadows.resize(original_size, Image.ANTIALIAS)
    return shadows

def import_directory(input_dir, output_dir, mask_layer_names, constrain_size):
    pathlist = Path(input_dir).glob('**/*.psd')
    for path in pathlist:

        output_subdir = os.path.dirname(path).replace(input_dir,'').strip(os.sep)
        output_path = os.path.join(output_dir, output_subdir)

        if not os.path.exists(output_path):
            os.makedirs(output_path)

        psd_path = str(path)

        name = os.path.splitext(os.path.basename(psd_path))[0]

        output_path = os.path.join(output_path, name)
        masks_path = os.path.join(output_path, "masks")

        #if os.path.exists(masks_path): continue

        print("\nAnalyzing %s: " % name)

        psd = PSDImage.open(psd_path)

        #compose high quality render
        pilImage = psd.compose().convert('RGB')
        original_size = pilImage.size
        pilImage = constrain_image(pilImage, constrain_size)

        print("Image dimensions %dx%d" % (original_size[0], original_size[1]))
        if pilImage.size != original_size:
            print("Resizing all layers and masks to %dx%d" % (pilImage.size[0], pilImage.size[1]))

        images = extract_masks(psd, original_size, mask_layer_names, {})

        if len(images)==0:
            print("No mask data found, ignoring. Please rename masks appropriately.")
            continue

        
        if not os.path.exists(output_path):
            os.makedirs(output_path)

        image_names = {
            "main":"image.jpg",   
            "preview":"preview.jpg",
            "thumbnail":"thumbnail.jpg",
            "lighting":"lighting.jpg"
        }

        #quality render
        compose_path = os.path.join(output_path, image_names["main"])
        pilImage.save(compose_path, quality=90)

        shadows_path = os.path.join(output_path, image_names["lighting"])
        shadows = extract_shadows(pilImage)
        shadows.save(shadows_path, quality=60)

        #save preview
        preview_path = os.path.join(output_path, image_names["preview"])
        preview = constrain_image(pilImage, min(512, constrain_size))
        preview.save(preview_path, "JPEG", quality=60)

        #save thumbnail
        thumbnail_path = os.path.join(output_path, image_names["thumbnail"])
        thumbnail = constrain_image(pilImage, min(512, constrain_size) / 2)
        thumbnail.save(thumbnail_path, "JPEG", quality=60)

        #save masks
        if not os.path.exists(masks_path):
            os.makedirs(masks_path)

        mask_names = {}
        for mask_name in images:
            #save mask
            mask_names[mask_name] = os.path.join("masks", mask_name + ".png")
            mask_image_path = os.path.join(masks_path, mask_name + ".png")
            images[mask_name] = constrain_image(images[mask_name], constrain_size)
            images[mask_name].save(mask_image_path)

        image_names["masks"] = mask_names

        data = {
            "cameraPosition": [0,1.0,0.0],
            "cameraRotation": [0.0,0.0, 0.00],
            "floorRotation": 0.0,
            "fov": 50.0,
            "images": image_names
        }

        data_path = os.path.join(output_path, 'data.json')
        with open(data_path, 'w') as outfile:
            json.dump(data, outfile, indent=4)

        #if relative, within this directory structure, delete
        # if not psd_path.startswith('/') and not psd_path.startswith('../'):
        #     os.remove(psd_path)



@click.command()
@click.argument("data", default='data.json', type=click.Path(exists=False, file_okay=True, dir_okay=False))
@click.argument("input_dir", default='input', type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.argument("output_dir", default='output', type=click.Path(exists=False, file_okay=False, dir_okay=True))
def main(input_dir, output_dir):

    if not os.path.exists(input_dir):
        raise Exception('The json file does not exist at path {}'.format(json_path)) 

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # import_directory(input_dir, output_dir, mask, constrain)
    
    print("Done")

if __name__ == "__main__":
    main()
