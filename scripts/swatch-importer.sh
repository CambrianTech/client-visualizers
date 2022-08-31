ROOT=$(dirname $0)/..
source "${ROOT}/scripts/utils.sh"
get_site_info

SCRIPT_PATH="${ROOT}/scripts/swatch-importer.py"
REQ_PATH="${ROOT}/scripts/swatch-importer-req.txt"

CONFIG_FILE="public/config/${REACT_APP_SITE_NAME}.json"
DEFAULT_INPUT="cambrianar-sites/${REACT_APP_SITE_NAME}"
DEFAULT_OUTPUT="exported-${REACT_APP_SITE_NAME}"
DEFAULT_DEPENDENCIES="yes"

python_options=()

check_python_dependencies ${SCRIPT_PATH} ${REQ_PATH} ${DEFAULT_DEPENDENCIES}

read -e -p "Enter location of config [${CONFIG_FILE}]: " value
CONFIG_FILE=${value:-"${CONFIG_FILE}"}

read -e -p "Enter input directory (site path) [${DEFAULT_INPUT}]: " value
INPUT=${value:-"${DEFAULT_INPUT}"}

read -e -p "Enter output directory [${DEFAULT_OUTPUT}]: " value
OUTPUT=${value:-"${DEFAULT_OUTPUT}"}

if [[ ! $INPUT -ef $OUTPUT ]]; then
  if [ -d ${OUTPUT} ]; then
    rm -rf ${OUTPUT}
  else
    mkdir -p ${OUTPUT}
  fi
fi

python ${SCRIPT_PATH} "${CONFIG_FILE}" "${INPUT}" "${OUTPUT}" "${python_options[@]}"