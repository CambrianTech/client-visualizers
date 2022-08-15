
source .env.development

BUCKET="cb-backend-data"
LOCAL_PATH="projects"
TEMP_PATH="/tmp/projects"

echo "Download all projects from \"${BUCKET}\"? Yes/No"

read answer

if [ "$answer" != "${answer#[Yy]}" ] ;then
  echo "\nDownloading items from ${BUCKET} into ${LOCAL_PATH}\n\n"
else
  echo "\nOperation canceled.\n"
  exit 0
fi

mkdir -p ${LOCAL_PATH}

rm -rf ${TEMP_PATH}
mkdir -p ${TEMP_PATH}

#launch a script that while loops on the previous command
#echo "Fake download and wait"
#TEMP_PATH=${LOCAL_PATH}
#LOCAL_PATH="projects-2"
#mkdir -p ${LOCAL_PATH}
#sleep 10 &

aws s3 cp s3://${BUCKET} ${TEMP_PATH} --recursive &

while [[ -n $(jobs -r) ]]; do
  echo "Process some data";

  processed=()

  for file in $(find ${TEMP_PATH}/*/data.pickle -type f -print); do
    src_dir=$(dirname $file)
    project_id=$(basename ${src_dir})
    dest_dir=${LOCAL_PATH}/${project_id}

    echo "Project ${project_id}, src_dir=${src_dir} dest_dir=${dest_dir}"

    mkdir -p ${dest_dir}
    cp -f ${src_dir}/data.pickle ${dest_dir}/data.pickle
    cp -f ${src_dir}/background ${dest_dir}/background.jpg

    processed+=($src_dir)
  done

#  for file in $(find */*/background -type f -print); do
#      echo "Image ${file}"
#  done

  for item in "${processed[@]}"; do
      rm -rf $item
  done

  sleep 1;
done
