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
import random

def crop_image(img):
    print(img)

def tile_seamless(boards, num_rows, num_cols, seam_size=2, seam_color=(55,55,55)):
    half_seam_size = seam_size // 2
    total_seam_width = num_cols * seam_size
    total_seam_height = num_rows * seam_size

    (h, w) = boards.shape[1:3]
    output = np.zeros((num_rows * h + total_seam_height, num_cols * w + total_seam_width, 3), dtype=np.uint8)
    output[:] = seam_color

    for row in range(num_rows):
        for col in range(num_cols):
            board = random.choice(boards)
            # Randomly flip board
            if np.random.rand() > 0.5:
                board = np.flip(board, axis=0)
            if np.random.rand() > 0.5:
                board = np.flip(board, axis=1)

            x = col * w + (col + 1) * seam_size - half_seam_size
            x_max = (col+1) * w + (col + 1) * seam_size - half_seam_size

            y = row * h + (row + 1) * seam_size - half_seam_size
            y_max = (row + 1) * h + (row + 1) * seam_size - half_seam_size

            output[y:y_max, x:x_max] = board

    for col in range(num_cols):
        if col % 2 == 0:
            x = col * w + (col + 1) * seam_size - half_seam_size
            x_max = (col+1) * w + (col + 1) * seam_size - half_seam_size

            output[:, x:x_max] = np.roll(output[:, x:x_max], h // 2, axis=0)

    return output

def resize(image, window_height=2048):
    aspect_ratio = float(image.shape[1])/float(image.shape[0])
    window_width = window_height/aspect_ratio
    image = cv2.resize(image, (int(window_height),int(window_width)))
    return image

def crop_center(img,cropx,cropy):
    y,x,c = img.shape
    startx = x//2 - cropx//2
    starty = y//2 - cropy//2    
    return img[starty:starty+cropy, startx:startx+cropx, :]

def crop_tiles(data, input_dir, output_dir, img_is_metric, crop_is_metric, maxsize=2048, seam_size=1, jpeg_quality=80):
    
    for row in data:
        image_width = row['width']

        if not img_is_metric:
            image_width = image_width * 2.54

        crop_width = row['crop-width']
        crop_height = row['crop-height']
        aspect_ratio = crop_width / crop_height

        if not crop_is_metric:
            crop_width *= 2.54
            crop_height *= 2.54

        filename = row['image']

        name = os.path.splitext(filename)[0]
        
        #remove junk (specific flooring one case)
        index = name.find('FF')
        if index > 0:
            name = name[0:index]

        name = name.strip().title()

        print("Image: %s width: %f cm crop: %f x %f cm" % (name, image_width, crop_width, crop_height))

        path = os.path.join(input_dir, filename)
        img = cv2.imread(path)
        height, width, channels = img.shape

        segments = image_width / crop_width
        # print(segments, width, height)

        num_segments = int(segments)
        segment_width = int(width / num_segments)
        segment_height = int(segment_width / aspect_ratio)

        segments = []

        path = os.path.join(output_dir, name)

        if not os.path.exists(path):
            os.makedirs(path)

        for i in range(num_segments):
            crop_x_cm = i * crop_width
            crop_x = int(width * crop_x_cm / image_width)
            crop_y = 0

            crop = img[crop_y:crop_y+segment_height, crop_x:crop_x+segment_width:channels]
            segments.append(crop)

            cv2.imwrite(os.path.join(path, "tile_%d.jpg" % (i)), resize(crop, maxsize), [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])

        tiled = tile_seamless(np.array(segments), 2, 7, seam_size)
        tiled = resize(tiled, maxsize) 
        cv2.imwrite(os.path.join(path, "tiled.jpg"), tiled, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])

        thumbnail = resize(crop_center(tiled, maxsize, maxsize), 512)
        cv2.imwrite(os.path.join(path, "thumbnail.jpg"), thumbnail, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])

            # crop = img[y0:y0+height , x0:x0+width, :]


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

    crop_tiles(data, input_dir, output_dir, True, False)
    
    print("Done")

if __name__ == "__main__":
    main()
