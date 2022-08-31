ROOT=$(dirname $0)/..
source "${ROOT}/scripts/utils.sh"
get_site_info

SCRIPT_PATH="${ROOT}/scripts/project-importer.py"
REQ_PATH="${ROOT}/scripts/project-importer-req.txt"

DEFAULT_INPUT="cambrianar-sites/${REACT_APP_SITE_NAME}/scenes"
DEFAULT_OUTPUT="exported-scenes"
DEFAULT_DEPENDENCIES="yes"
DEFAULT_LIGHTING="yes"

python_options=()

#check for python import issues
check_python_dependencies ${SCRIPT_PATH} ${REQ_PATH} ${DEFAULT_DEPENDENCIES}

if [ $# -eq 2 ] ;then
  INPUT=$1
  OUTPUT=$2
else
  read -e -p "Enter input directory [${DEFAULT_INPUT}]: " value
  INPUT=${value:-"${DEFAULT_INPUT}"}

  read -e -p "Enter output directory [${DEFAULT_OUTPUT}]: " value
  OUTPUT=${value:-"${DEFAULT_OUTPUT}"}
fi

read -e -p "Generate lighting? [${DEFAULT_LIGHTING}]: " value
GEN_LIGHTING=${value:-"${DEFAULT_LIGHTING}"}

if [[ $GEN_LIGHTING =~ [yY](es)* ]] ;then
  python_options+=("-l")
fi

read -p "Generate single mask for all surfaces (experimental)? yes/no [no]: " answer

if [ "$answer" != "${answer#[Yy]}" ] ;then
  python_options+=(-s)
fi

if [[ ! $INPUT -ef $OUTPUT ]]; then
  if [ -d ${OUTPUT} ]; then
    rm -rf ${OUTPUT}
  else
    mkdir -p ${OUTPUT}
  fi
fi

for file in $(find ${INPUT} -name "data.json" -type f -print ); do
  src_dir=$(dirname $file)
  data_path="${src_dir}/data.json"

  if [ ! -f $data_path ]; then
    continue
  fi

  rel_path=$(dirname ${file/#$INPUT\/})
  dest_dir=${OUTPUT}/${rel_path}

  mkdir -p ${dest_dir}

  python ${SCRIPT_PATH} $data_path "${dest_dir}/data.json" "${python_options[@]}"

done