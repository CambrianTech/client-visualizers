
ROOT=$(dirname $0)/..
source "${ROOT}/.env.development"

if [ -f "${ROOT}/.env.development.local" ]; then
    source "${ROOT}/.env.development.local"
fi

BUCKET="cb-backend-data"
TEMP_PATH="/tmp/projects"
LOCAL_PATH="projects"

echo "Download all 'projects' or 'images' from \"${BUCKET}\"? [projects]"

read answer

#OPTIONS=()
#todo: fix using options array https://unix.stackexchange.com/questions/459367/using-shell-variables-for-command-options
if [ "$answer" == "images" ] ; then
  echo "\nDownloading images from ${BUCKET} into ${LOCAL_PATH}...\n"
  MATCH=${TEMP_PATH}/*/background
  #OPTIONS=( --exclude \"*\" --include \"*/background\")
else
  answer="projects"
  echo "\nDownloading projects from ${BUCKET} into ${LOCAL_PATH}...\n"
  MATCH=${TEMP_PATH}/*/data.pickle
  #OPTIONS=( --exclude \"*\" --include \"*/data.pickle\")
fi

mkdir -p ${LOCAL_PATH}

rm -rf ${TEMP_PATH}
mkdir -p ${TEMP_PATH}

#launch a script that while loops on the previous command
if [ "$answer" == "projects" ] ; then
  aws s3 cp s3://${BUCKET} ${TEMP_PATH} --recursive --exclude "*" --include "*/data.pickle" &
else
  aws s3 cp s3://${BUCKET} ${TEMP_PATH} --recursive --exclude "*" --include "*/background" &
fi

while [[ -n $(jobs -r) ]]; do

  for file in $(find ${MATCH} -type f -print 2>/dev/null); do
    src_dir=$(dirname $file)
    project_id=$(basename ${src_dir})
    processed=()

    if [ "$answer" == "projects" ] ; then
      dest_dir=${LOCAL_PATH}/${project_id}
      echo "Copying project ${project_id} from ${src_dir} to ${dest_dir}"

      #re-download whole project for match (except for large pickle)
      aws s3 cp s3://${BUCKET}/${project_id} ${TEMP_PATH}/${project_id} --recursive --exclude "*.pickle"

      rm -rf ${dest_dir}
      mv ${src_dir} ${dest_dir}

      echo "Done."
    else
      dest_path=${LOCAL_PATH}/${project_id}.jpg
      echo "Copying image from ${$file} to ${dest_path}"
      cp -f ${file} ${dest_path}
      processed+=($src_dir)
    fi
  done

  #remove all files older than 5 minutes
  for item in "${processed[@]}"; do
      rm -rf $item
  done

  sleep 1;
done
