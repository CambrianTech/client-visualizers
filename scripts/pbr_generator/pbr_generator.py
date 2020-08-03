from os.path import join
import os
import json
import cv2
import numpy as np
import sys
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops
from math import sqrt

import click

def resize(image, window_height):
    aspect_ratio = float(image.shape[1])/float(image.shape[0])
    window_width = window_height/aspect_ratio
    image = cv2.resize(image, (int(window_height),int(window_width)), cv2.INTER_AREA)
    return image

def get_image_paths(input_dir, pattern):
    files = []
    if pattern:
        files.extend(Path(input_dir).glob('**/' + pattern))
    else: 
        extensions = ('.png', '.jpg', '.jpeg')
        for ext in extensions:
            files.extend(Path(input_dir).glob('**/*' + ext))
    return files

def get_specular(img):
    hsv_image = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    h, s, v = cv2.split(hsv_image)

    clahe = cv2.createCLAHE(clipLimit=1.0, tileGridSize=(16,16))
    reduced = clahe.apply(v)

    return cv2.GaussianBlur(v - reduced,(5,5),0)

def get_normals(img, filter="Scharr" ): # normal[0..2] band-array

    #make border
    border_size = 10
    img_padded = cv2.copyMakeBorder(img, border_size, border_size, border_size, border_size, cv2.BORDER_REFLECT)

    #opencv/numpy -> PIL
    img_padded = Image.fromarray(img_padded)

    heightBand = img_padded.split()[0]

    if filter == "Sobel":
        a1=1; a2=2; a3=0
        b1=1; b2=4; b3=6
    elif filter == "Scharr":           # 5x5 opt Scharr Filter from
        a1=21.38; a2=85.24; a3=0       # http://nbn-resolving.de/urn/resolver.pl?urn=urn:nbn:de:bsz:16-opus-9622
        b1= 5.96; b2=61.81; b3=120.46
    else:
        raise ValueError( "Unknown 'filter' argument '" + filter + "'" )

    a4=-a2; a5=-a1
    b4=b2;  b5=b1
    kernel = []
    kernel.append((a1*b1, a2*b1, a3*b1, a4*b1, a5*b1,
                   a1*b2, a2*b2, a3*b2, a4*b2, a5*b2,
                   a1*b3, a2*b3, a3*b3, a4*b3, a5*b3,
                   a1*b4, a2*b4, a3*b4, a4*b4, a5*b4,
                   a1*b5, a2*b5, a3*b5, a4*b5, a5*b5)) # x
    kernel.append((b1*a1, b2*a1, b3*a1, b4*a1, b5*a1,
                   b1*a2, b2*a2, b3*a2, b4*a2, b5*a2,
                   b1*a3, b2*a3, b3*a3, b4*a3, b5*a3,
                   b1*a4, b2*a4, b3*a4, b4*a4, b5*a4,
                   b1*a5, b2*a5, b3*a5, b4*a5, b5*a5)) # y

    # to get the scale factor, we look at the extreme case: vertical fall from 255 to 0:
    scale = 0.0
    for i, val in enumerate( kernel[0] ):
        if i % 5 < 5//2:
            scale += 255.0 * val
    scale /= 128.0

    r = heightBand.filter(ImageFilter.Kernel((5,5), kernel[0], scale=scale, offset=128.0))
    g = heightBand.filter(ImageFilter.Kernel((5,5), kernel[1], scale=scale, offset=128.0))
    b = ImageChops.constant(g, 128)
    rr=r.load()
    gg=g.load()
    bb=b.load()
    for y in range( r.size[1] ):
        for x in range( r.size[0] ):
            op = 1.0 - (rr[x,y]*2.0/255.0 - 1.0)**2 - (gg[x,y]*2.0/255.0 - 1.0)**2
            if op > 0.0:
                bb[x,y] = int(128.0 + 128.0 * sqrt(op))
            else:
                bb[x,y] = int(128.0)

    normals = Image.merge( "RGB", ([r, g, b]))
    normals = np.array(normals)
    normals = normals[border_size:border_size + img.shape[0], border_size:border_size + img.shape[1]]
    return normals

def import_directory(input_dir, output_dir, filter='Scharr', file_pattern=None, quality=90, output_size=None):
    
    files = get_image_paths(input_dir,file_pattern)

    for path in files:
        image_path = str(path)
        name = os.path.splitext(os.path.basename(image_path))[0]

        if image_path.startswith(input_dir):
            dir_name = image_path[1+len(input_dir):]
            dir_name = os.path.dirname(dir_name)

        if dir_name:
            out_dir = os.path.join(output_dir, dir_name)
            if not os.path.exists(out_dir):
                os.makedirs(out_dir)
        else:
            out_dir = output_dir

        output_path = os.path.join(out_dir, name)

        print(output_path)

        img = Image.open(path)
        img.save(output_path + "_diffuse.jpg", "JPEG", quality=quality)

        #PIL -> opencv/numpy
        img = np.array(img)
        if output_size:
            img=resize(img, output_size)
        
        normals = get_normals(img, filter)
        Image.fromarray(normals).save(output_path + "_normals.jpg", "JPEG", quality=quality)

        specular = get_specular(img)

        Image.fromarray(specular).save(output_path + "_specular.jpg", "JPEG", quality=int(quality/2))


@click.command()
@click.argument("input_dir", default='input', type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.argument("output_dir", default='input', type=click.Path(exists=False, file_okay=False, dir_okay=True))
@click.option('--filter', '-f', type=click.STRING, default='Scharr')
@click.option('--pattern', '-p', type=click.STRING, default=None)
@click.option('--quality', type=int, default=50)
@click.option('--output_size', type=int, default=512)

def main(input_dir, output_dir, filter, pattern, quality, output_size):

    if not os.path.exists(input_dir):
        raise Exception('The json file does not exist at path {}'.format(json_path)) 

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    import_directory(input_dir, output_dir, filter, pattern, quality, output_size)
    
    print("Done")

if __name__ == "__main__":
    main()
