from os.path import join
import os
import json
import cv2
import numpy as np
import sys
import click

def resize(image, window_height):
    aspect_ratio = float(image.shape[1])/float(image.shape[0])
    window_width = window_height/aspect_ratio
    image = cv2.resize(image, (int(window_height),int(window_width)))
    return image

@click.command()
@click.argument("config_file", type=click.Path(exists=True, file_okay=True, dir_okay=False))
@click.argument("input_dir", type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.argument("output_dir", type=click.Path(exists=False, file_okay=False, dir_okay=True))
@click.option('--max_image_width', type=int, default=2048)
@click.option('--thumbnail_size', type=int, default=640)
@click.option('--thumbnail_quality', type=int, default=50)

def main(config_file, input_dir, output_dir, max_image_width, thumbnail_size, thumbnail_quality):

    print("Processing from %s into %s" % (input_dir, output_dir))

    thumbnail_src_path = os.path.join(input_dir, "thumbnails")
    texture_src_path = os.path.join(input_dir, "textures")

    thumbnail_dest_path = os.path.join(output_dir, "thumbnails")
    texture_dest_path = os.path.join(output_dir, "textures")

    if not os.path.exists(thumbnail_dest_path):
        os.makedirs(thumbnail_dest_path)

    if not os.path.exists(texture_dest_path):
        os.makedirs(texture_dest_path)

    config = json.load(open(config_file, 'r'))

    def restrict_image(item, key):
        if key not in item:
            return None

        input_path = os.path.join(input_dir, item[key])
        output_path = os.path.join(output_dir, item[key])
        output_path = os.path.splitext(output_path)[0] + ".jpeg"

        image = cv2.imread(input_path)

        if image.shape[0] > thumbnail_size or image.shape[1] > thumbnail_size:
            image = resize(image, thumbnail_size)

        item[key] = os.path.splitext(item[key])[0] + ".jpeg"

        cv2.imwrite(output_path, image)
            
        return image.shape[:2]


    for brand in config["brands"]:
        for collection in brand["collections"]:
            for product in collection["products"]:
                restrict_image(product, "thumbnail")
                for color in product["colors"]:
                    restrict_image(color, "thumbnail")

    

if __name__ == "__main__":
    main()
