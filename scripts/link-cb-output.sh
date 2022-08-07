LINK_NAME="cb-projects"
JSON_NAME="scenes.json"
LINK_PATH="public/${LINK_NAME}"
JSON_URL="${LINK_NAME}/${JSON_NAME}"
JSON_PATH="${LINK_PATH}/${JSON_NAME}"
CONFIG_PATH=.env.development.local
CONFIG_VAR="REACT_APP_SCENES_JSON_URL"

touch ${CONFIG_PATH}

source ${CONFIG_PATH}

sed -i '' "/${CONFIG_VAR}/d" ${CONFIG_PATH}

#https://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
Plain='\033[0m'            # Reset
Red='\033[0;31m'          # Red
Green='\033[0;32m'        # Green
Yellow='\033[0;33m'       # Yellow

abort_changes () {
  rm -f "${LINK_PATH}"
  exit 0
}

if [ -z "${LOCAL_OUTPUT_PATH}" ]; then
  echo "LOCAL_OUTPUT_PATH is undefined, ignoring local project linking"
  abort_changes
elif [ ! -d "${LOCAL_OUTPUT_PATH}" ]; then
  echo -e "${Yellow}Warning: Path LOCAL_OUTPUT_PATH=${LOCAL_OUTPUT_PATH} does not exist, local project linking will be ignored"
  abort_changes
fi

ln -sfn "${LOCAL_OUTPUT_PATH}" "${LINK_PATH}"

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

echo $json > ${JSON_PATH}

echo "Project json generated at ${JSON_PATH}"

printf "\n${CONFIG_VAR}=\"${JSON_URL}\"" >> ${CONFIG_PATH}
sed -i '' '/^$/d' ${CONFIG_PATH}