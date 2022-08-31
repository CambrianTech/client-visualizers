from os.path import join
import os
import json
import cv2
import numpy as np
import sys
import click
from termcolor import cprint
from tqdm import tqdm

@click.command()
@click.argument("config_file", type=click.Path(exists=True, file_okay=True, dir_okay=False))
@click.argument("input_dir", type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.argument("output_dir", type=click.Path(exists=False, file_okay=False, dir_okay=True))
@click.option('--quality', type=int, default=80)
@click.option('--max_size', type=int, default=3072)
@click.option('--thumbnail_size', type=int, default=640)
@click.option('--thumbnail_quality', type=int, default=50)

def main(config_file, input_dir, output_dir, max_size, quality, thumbnail_size, thumbnail_quality):

    cprint("Processing from %s into %s" % (input_dir, output_dir), attrs=['bold'])

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    config = json.load(open(config_file, 'r'))

    def restrict_image(item, key, max_size, quality=90):
        if key not in item:
            return None

        input_path = os.path.join(input_dir, item[key])
        output_path = os.path.join(output_dir, item[key])
        output_path = os.path.splitext(output_path)[0] + ".jpeg"

        if not os.path.exists(input_path):
            #print(colored("Warning image '%s' is missing" % input_path, 'yellow', attrs=['bold'], file=sys.stderr))
            cprint("Warning image '%s' is missing!" % input_path, 'yellow', attrs=['bold'], file=sys.stderr)
            return None

        image = cv2.imread(input_path)
        image_size = image.shape[:2]
        scale = 1.0

        directory = os.path.dirname(output_path)

        if not os.path.exists(directory):
            os.makedirs(directory)

        if image.shape[0] > max_size or image.shape[1] > max_size:
            scale = min(max_size/image.shape[0], max_size/image.shape[1])
            image = cv2.resize(image, (int(scale * image.shape[1]), int(scale * image.shape[0])), interpolation=cv2.INTER_AREA)

        item[key] = os.path.splitext(item[key])[0] + ".jpeg"

        cv2.imwrite(output_path, image, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
            
        return scale

    products = [product for brand in config["brands"] for collection in brand["collections"] for product in collection["products"]]
    colors = [color for product in products for color in product["colors"]]
    num_colors = len(colors)

    with tqdm(total=num_colors, file=sys.stdout) as pbar:

        for product in products:

            restrict_image(product, "thumbnail", max_size=thumbnail_size, quality=thumbnail_quality)
            scale = restrict_image(product, "albedo", max_size=max_size, quality=quality)

            if "ppi" in product and scale is not None and scale != 1.0:
                product["ppi"] = product["ppi"] * scale

            for color in product["colors"]:
                restrict_image(color, "thumbnail", max_size=thumbnail_size, quality=thumbnail_quality)

                if "metaData" in color and "albedo" in color["metaData"]:
                    scale = restrict_image(color["metaData"], "albedo", max_size=max_size, quality=quality)
                else:
                    scale = restrict_image(color, "albedo", max_size=max_size, quality=quality)

                if "ppi" in color and scale is not None and scale != 1.0:
                    color["ppi"] = round(color["ppi"] * scale, 2)

                pbar.update(1)
    
    output_file = os.path.join(output_dir, os.path.basename(config_file))
    with open(output_file, "w") as outfile:
        json.dump(config, outfile, indent=5)

if __name__ == "__main__":
    main()
