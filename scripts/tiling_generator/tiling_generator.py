from os.path import join
import os
import json
import cv2
import numpy as np
import sys
from pathlib import Path
from PIL import Image

import click
import random

def get_image_paths(input_dir, pattern):
    files = []
    if pattern:
        files.extend(Path(input_dir).glob('**/' + pattern))
    else: 
        extensions = ('.png', '.jpg', '.jpeg')
        for ext in extensions:
            files.extend(Path(input_dir).glob('**/*' + ext))
    return files

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

def resize(image, window_height):
    aspect_ratio = float(image.shape[1])/float(image.shape[0])
    window_width = window_height/aspect_ratio
    image = cv2.resize(image, (int(window_height),int(window_width)), cv2.INTER_AREA)
    return image

def crop_center(img,cropx,cropy):
    y,x,c = img.shape
    startx = x//2 - cropx//2
    starty = y//2 - cropy//2    
    return img[starty:starty+cropy, startx:startx+cropx, :]

def crop_tiles(data, input_dir, output_dir, img_is_metric, crop_is_metric, maxsize=2048, num_rows=2, num_columns=6, seam_size=2, jpeg_quality=90):
    
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
        if img is None:
            print("%s not found, skipping" % filename)
            continue
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

        tiled = tile_seamless(np.array(segments), num_rows, num_columns, seam_size)
        tiled = resize(tiled, maxsize) 
        cv2.imwrite(os.path.join(path, "tiled.jpg"), tiled, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])

        thumbnail = resize(crop_center(tiled, maxsize, maxsize), 512)
        cv2.imwrite(os.path.join(path, "thumbnail.jpg"), thumbnail, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])

            # crop = img[y0:y0+height , x0:x0+width, :]

def assemble_tiles(input_dir, output_dir, pattern=None, maxsize=2048, num_rows=2, num_columns=6, seam_size=2, jpeg_quality=90):

    files = get_image_paths(input_dir, pattern)

    for file in files:
        print(file)
    print("Assemble!")

@click.command()
@click.option('--mode', '-m', required=True, type=click.Choice(['assemble', 'cut'], case_sensitive=False))
@click.argument("input_dir", default='input', type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.argument("output_dir", default='output', type=click.Path(exists=False, file_okay=False, dir_okay=True))
@click.argument("data_file", default='data.json', type=click.Path(exists=False, file_okay=True, dir_okay=False))
@click.option('--pattern', '-p', type=click.STRING, default=None)
@click.option("--size", default=1536, type=int)
@click.option("--rows", default=2, type=int)
@click.option("--columns", default=6, type=int)
@click.option("--seam_size", default=2, type=int)
@click.option("--img_is_metric", default=True, type=bool)
@click.option("--crop_is_metric", default=False, type=bool)
@click.option("--quality", default=70, type=int)
def main(mode, input_dir, output_dir, data_file, pattern, size, rows, columns, seam_size, img_is_metric, crop_is_metric, quality):        

    if not os.path.exists(input_dir):
        raise Exception('The directory {} does not exist '.format(input_dir)) 

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)


    if mode == 'cut':
        with open(data_file) as f:
            data = json.load(f)
        crop_tiles(data, input_dir, output_dir, img_is_metric, crop_is_metric, size, rows, columns, seam_size, quality)
    elif mode == 'assemble':
        assemble_tiles(input_dir, output_dir, pattern, size, rows, columns, seam_size, quality)
    
    print("Done")

if __name__ == "__main__":
    main()
