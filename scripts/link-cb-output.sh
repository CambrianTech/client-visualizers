source .env.development

LINK_NAME="cb-projects"
LINK_PATH="public/${LINK_NAME}"
JSON_OUTPUT_PATH="${LINK_PATH}/scenes.json"

#https://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
Plain='\033[0m'            # Reset
Red='\033[0;31m'          # Red
Green='\033[0;32m'        # Green
Yellow='\033[0;33m'       # Yellow

if [ -z "${LOCAL_OUTPUT_PATH}" ]; then
    echo "LOCAL_OUTPUT_PATH is undefined, ignoring local project linking"
    rm -f "${LINK_PATH}"
    exit 0
elif [ ! -d "${LOCAL_OUTPUT_PATH}" ]; then
    echo -e "${Yellow}Warning: Path LOCAL_OUTPUT_PATH=${LOCAL_OUTPUT_PATH} does not exist, local project linking will be ignored"
    rm -f "${LINK_PATH}"
    exit 1
fi

ln -sf "${LOCAL_OUTPUT_PATH}" "${LINK_PATH}"

scenes_json=""
for dir in ${LINK_PATH}/*/; do
  name="$(basename $dir)"
  path="$LINK_NAME/$name"
  printf -v scene_json '{"code":"%s","displayName":"%s", "path":"%s"}' "$name" "$name" "$path"

  #echo "$dir named $name"
  if [ -z "${scenes_json}" ]; then
    scenes_json=${scene_json}
  else
    scenes_json="${scenes_json},\n${scene_json}"
  fi
done

printf -v json '{"code": "%s","displayName": "%s", "scenes": [%s]}' "$LINK_NAME" "$LINK_NAME" "$scenes_json"

echo $json > ${JSON_OUTPUT_PATH}

echo "Project json generated at ${JSON_OUTPUT_PATH}"