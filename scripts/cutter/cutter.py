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

def crop_image(img):
    print(img)

def run(data, input_dir, output_dir, img_is_metric, crop_is_metric):
    
    for row in data:
        image_width = row['width']

        if not img_is_metric:
            image_width = image_width * 2.54

        crop_width = row['crop-width']
        crop_height = row['crop-height']

        if not crop_is_metric:
            crop_width *= 2.54
            crop_height *= 2.54

        filename = row['image']
        print("Image: %s width: %f cm crop: %f x %f cm" % (filename, image_width, crop_width, crop_height))

        path = os.path.join(input_dir, filename)
        img = cv2.imread(path)
        img_shape = img.shape

        segments = image_width / crop_width
        print(segments, img_shape)

        num_segments = int(segments)
        for i in range(num_segments):
            crop_x_cm = i * crop_width
            crop_x = crop_x_cm * image_width
            print("crop_x_cm", crop_x_cm, crop_x_cm + crop_width)


@click.command()
@click.argument("data_file", default='data.json', type=click.Path(exists=False, file_okay=True, dir_okay=False))
@click.argument("input_dir", default='input', type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.argument("output_dir", default='output', type=click.Path(exists=False, file_okay=False, dir_okay=True))
def main(data_file, input_dir, output_dir):        

    if not os.path.exists(input_dir):
        raise Exception('The json file does not exist at path {}'.format(json_path)) 

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    with open(data_file) as f:
        data = json.load(f)


    run(data, input_dir, output_dir, True, False)
    
    print("Done")

if __name__ == "__main__":
    main()
