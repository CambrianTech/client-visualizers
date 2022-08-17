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

def resize(image, window_height, interpolation=cv2.INTER_AREA):
    aspect_ratio = float(image.shape[1])/float(image.shape[0])
    window_width = window_height/aspect_ratio
    image = cv2.resize(image, (int(window_height),int(window_width)), interpolation)
    return image

@click.command()
@click.argument("input_file", type=click.Path(exists=True, file_okay=True, dir_okay=False))
@click.argument("output_file", type=click.Path(exists=False, file_okay=True, dir_okay=False))
@click.option('--quality', type=int, default=50)
@click.option('--max_image_size', type=int, default=1280)
@click.option('--max_mask_size', type=int, default=1280)

def main(input_file, output_file, quality, max_image_size, max_mask_size):

    if not os.path.exists(input_file):
        raise Exception('The json file does not exist at path {}'.format(json_path))

    data = json.load(open(input_file, 'r'))

    images = data["images"]

    src_dir = os.path.dirname(input_file)
    dest_dir = os.path.dirname(output_file)

    print("Processing", input_file)

    if "main" in images:
        input_path = os.path.join(src_dir, images["main"])
        output_path = os.path.join(dest_dir, images["main"])

        background = imread(input_path)
        background = resize(background, max_image_size)

        imsave(output_path, background)

if __name__ == "__main__":
    main()
