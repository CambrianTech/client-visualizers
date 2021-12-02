from os.path import join
import os
import json
import cv2
import numpy as np
import sys
from pathlib import Path
from PIL import Image, ImageEnhance
from termcolor import colored

import click
import random
import math

def convert_color(color, conversion):
    #return tuple(int(i) for i in cv2.cvtColor(img, conversion).flatten())
    
    #bug in opencv 4.5.4 incorrectly asserting on width or height parameter instead of channels
    #return tuple(int(i) for i in cv2.cvtColor(img, conversion).flatten())
    img = np.zeros([3,3,3],dtype=np.uint8)
    img[0,0] = color
    converted = cv2.cvtColor(img, conversion)[0,0]
    return (int(converted[0]), int(converted[1]), int(converted[2]))

def get_image_paths(input_dir, pattern):
    files = []
    if pattern:
        files.extend(Path(input_dir).glob('**/' + pattern))
    else: 
        extensions = ('.png', '.jpg', '.jpeg', '.tif')
        for ext in extensions:
            files.extend(Path(input_dir).glob('**/*' + ext))
    return files

def tile_seamless(boards, num_rows, num_cols, seam_size=None, seam_color_bgr=None):

    (h, w) = boards.shape[1:3]
    if seam_size is None:
        seam_size = max(w // 100, 1)

    print("Tiling %d boards. Seam size is %d" % (len(boards), seam_size))

    half_seam_size = seam_size // 2
    total_seam_width = num_cols * seam_size
    total_seam_height = num_rows * seam_size

    if seam_color_bgr is None:
        average_color = boards[0].mean(axis=0).mean(axis=0)
        average_color_hsv = convert_color(average_color, cv2.COLOR_BGR2HSV)
        
        seam_color_bgr = convert_color((average_color_hsv[0], average_color_hsv[1], average_color_hsv[2] * 2 // 3), cv2.COLOR_HSV2BGR)
    
    output = np.zeros((num_rows * h + total_seam_height, num_cols * w + total_seam_width, 3), dtype=np.uint8)
    output[:] = seam_color_bgr

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

def crop_center(img, cropx, cropy):
    y,x,c = img.shape
    startx = max(x//2 - cropx//2, 0)
    starty = max(y//2 - cropy//2, 0)

    return img[starty:starty+cropy, startx:startx+cropx, :]

def crop_tiles(data, input_dir, output_dir, img_is_metric, crop_is_metric, maxsize=2048, num_rows=2, num_columns=6, seam_size=None, jpeg_quality=90):
    
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

def assemble_tiles(input_dir, output_dir, pattern=None, maxsize=2048, num_rows=2, num_columns=6, seam_size=None, jpeg_quality=90, flatten_output=False):

    if flatten_output:
        textures_path = os.path.join(output_dir, "textures")
        if not os.path.exists(textures_path): os.makedirs(textures_path)

        thumbnails_path = os.path.join(output_dir, "thumbnails")
        if not os.path.exists(thumbnails_path): os.makedirs(thumbnails_path)

        planks_path = os.path.join(output_dir, "planks")
        if not os.path.exists(planks_path): os.makedirs(planks_path)
    else:
        tiled_path = thumbnail_path = plank_path = None

    def assemble_segments(path, segments):
        name = os.path.basename(path)

        print(colored("\nAssembling %s with %d images\n" % (name, len(segments)), attrs=["bold"]))

        # make all vertical
        min_h = 100000
        min_w = 100000

        for index in range(len(segments)):
            (h, w) = segments[index].shape[0:2]
            if w > h:
                segments[index] = np.rot90(segments[index])
                (w, h) = (h, w)

            min_h = min(min_h, h)
            min_w = min(min_w, w)

        #make consistent size:
        for index in range(len(segments)):
            (h, w) = segments[index].shape[0:2]

            if h != min_h or w != min_w:
                segments[index] = crop_center(segments[index], min_w, min_h)
                print("Resized to", segments[index].shape)
            
            tile_path = os.path.join(path, "tile_%d.jpg" % (index)) if planks_path is None else os.path.join(planks_path, "%s-%d.jpg" % (name, index))
            cv2.imwrite(tile_path, resize(segments[index], maxsize), [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])


        tiled = tile_seamless(np.array(segments), num_rows, num_columns, seam_size)
        tiled = resize(tiled, maxsize)
        
        tiled_path = os.path.join(path, "tiled.jpg") if textures_path is None else os.path.join(textures_path, "%s.jpg" % name)
        cv2.imwrite(tiled_path, tiled, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])

        thumbnail = resize(crop_center(tiled, maxsize, maxsize), 512)
        thumbnail_path = os.path.join(path, "thumbnail.jpg") if thumbnails_path is None else os.path.join(thumbnails_path, "%s.jpg" % name)
        cv2.imwrite(thumbnail_path, thumbnail, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality])

    files = get_image_paths(input_dir, pattern)

    if len(files) == 0:
        print("No images to process at %s" % input_dir)
        return

    print(colored("\nProcessing %d images from %s\n" % (len(files), input_dir), attrs=['bold']))

    last_out_dir = None
    images = []
    for path in files:
        
        image_path = str(path)
        name = os.path.splitext(os.path.basename(image_path))[0]

        if image_path.startswith(input_dir):
            dir_name = image_path[1+len(input_dir):]
            dir_name = os.path.dirname(dir_name)

        if dir_name:
            out_dir = os.path.join(output_dir, dir_name)
            if not os.path.exists(out_dir) and not flatten_output:
                os.makedirs(out_dir)
        else:
            out_dir = output_dir

        img = Image.open(path).convert('RGB')
        img = cv2.cvtColor(np.array(img), cv2.COLOR_BGR2RGB)

        #may need to rotate:
        if img.shape[0] < img.shape[1]:
            img = np.rot90(img, k=1, axes=(0, 1))

        print("Grabbing image %s" % path, img.shape)

        if last_out_dir is None:
            last_out_dir = out_dir
        elif out_dir != last_out_dir:
            assemble_segments(last_out_dir, images)

            images = []
            last_out_dir = out_dir

        images.append(img)
        
        output_path = os.path.join(out_dir, name)
        #print(image_path)
    if len(images):
        assemble_segments(last_out_dir,images)

def find_tile_lines(gray, apertureSize=5, use_hough=False):
    diagonal = math.hypot(gray.shape[0], gray.shape[1])

    minLineLength = int(diagonal / 30)
    maxLineGap = int(diagonal / 10)

    if use_hough:
        _, thresh1 = cv2.threshold(gray,127,255,cv2.THRESH_BINARY)
        edges = cv2.Canny(thresh1,50,200,apertureSize)
        lines = cv2.HoughLinesP(edges,1,np.pi/180,10,minLineLength,maxLineGap)
    else:
        fld = cv2.ximgproc.createFastLineDetector(minLineLength, maxLineGap, 80, 200, apertureSize)
        lines = fld.detect(gray)

    return lines

def find_tiles(img, max_size=1920):

    size = img.shape[:2]
    scale = min(max_size / min(size[0], size[1]), 1.0)
    if scale < 1.0:
        size = (int(scale * size[0]), int(scale * size[1]))
        img = cv2.resize(img, (size[1], size[0]))

    diagonal = math.hypot(img.shape[0], img.shape[1])
    image = Image.fromarray(img).convert('L')
    gray = np.array(image)

    image = ImageEnhance.Contrast(image).enhance(20.0)
    image = ImageEnhance.Sharpness(image).enhance(10.0)
    enhanced = np.array(image)

    # _, thresh1 = cv2.threshold(gray,127,255,cv2.THRESH_BINARY)
    # edges = cv2.Canny(thresh1,50,200, apertureSize = 5)
    # return edges
    all_lines = find_tile_lines(gray)
    all_lines = np.concatenate((all_lines,find_tile_lines(gray)))

    debug = img.copy()
    if debug is not None:
        for line in all_lines:
            cv2.line(debug,(int(line[0][0]),int(line[0][1])),(int(line[0][2]),int(line[0][3])),(0,255,0),6)

    return debug

def extract_tiles(input_dir, output_dir, pattern, max_size, thumbnail_size=220):
    files = get_image_paths(input_dir, pattern)

    textures_output_dir = os.path.join(output_dir, "textures")
    if not os.path.exists(textures_output_dir):
        os.makedirs(textures_output_dir)

    thumbnails_output_dir = os.path.join(output_dir, "thumbnails")
    if not os.path.exists(thumbnails_output_dir):
        os.makedirs(thumbnails_output_dir)

    debug_output_dir = os.path.join(output_dir, "debug")
    if not os.path.exists(debug_output_dir):
        os.makedirs(debug_output_dir)

    for path in files:
        filename = os.path.basename(path).split('.')[0].strip()
        img = np.array(Image.open(path).convert('RGB'))
        size = img.shape[:2]
        scale = min(max_size / min(size[0], size[1]), 1.0)
        if scale < 1.0:
            size = (int(scale * size[0]), int(scale * size[1]))
            img = cv2.resize(img, (size[1], size[0]))

        print(filename, scale)
        debug = find_tiles(img)
        if debug is not None:
            Image.fromarray(debug).save(os.path.join(debug_output_dir, filename + ".jpg"))

        #save image
        Image.fromarray(img).save(os.path.join(textures_output_dir, filename + ".jpg"))

        #save thumb
        t_scale = thumbnail_size / min(size[0], size[1])
        t_size = (int(t_scale * size[0]), int(t_scale * size[1]))
        t_img = cv2.resize(img, (t_size[1], t_size[0]))
        t_left = t_size[1]-thumbnail_size
        t_top = t_size[0]-thumbnail_size

        Image.fromarray(t_img).crop((t_left, t_top, t_left+thumbnail_size, t_top+thumbnail_size)).save(os.path.join(thumbnails_output_dir, filename + ".jpg"))


#for example, assemble planks, flattened into a single directory: python tiling_generator.py adore-floors -m assemble -f 1

@click.command()
@click.option('--mode', '-m', required=True, type=click.Choice(['assemble', 'cut', 'extract'], case_sensitive=False))
@click.argument("input_dir", default='input', type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.argument("output_dir", default='output', type=click.Path(exists=False, file_okay=False, dir_okay=True))
@click.argument("data_file", default='data.json', type=click.Path(exists=False, file_okay=True, dir_okay=False))
@click.option('--pattern', '-p', type=click.STRING, default=None)
@click.option("--size", '-s', default=2048, type=int)
@click.option("--rows", '-r', default=2, type=int)
@click.option("--columns", '-c', default=6, type=int)
@click.option("--seam_size", default=None, type=int)
@click.option("--img_is_metric", default=True, type=bool)
@click.option("--crop_is_metric", default=False, type=bool)
@click.option("--quality", '-q', default=70, type=int)
@click.option("--flat", '-f', default=False, type=bool)
def main(mode, input_dir, output_dir, data_file, pattern, size, rows, columns, seam_size, img_is_metric, crop_is_metric, quality, flat):        

    if not os.path.exists(input_dir):
        raise Exception('The directory {} does not exist '.format(input_dir)) 

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    if mode == 'extract':
        extract_tiles(input_dir, output_dir, pattern, max_size=size)
    elif mode == 'cut':
        with open(data_file) as f:
            data = json.load(f)
        crop_tiles(data, input_dir, output_dir, img_is_metric, crop_is_metric, size, rows, columns, seam_size, quality)
    elif mode == 'assemble':
        assemble_tiles(input_dir, output_dir, pattern, size, rows, columns, seam_size, quality, flatten_output=flat)
    
    print(colored("Done", attrs=['bold']))

if __name__ == "__main__":
    main()
