
BASEDIR=$(dirname $0)
source .env.development

DEFAULT_INPUT="cambrianar-sites/${REACT_APP_SITE_NAME}/scenes"

python_options=()

if [ $# -eq 2 ] ;then
  INPUT=$1
  OUTPUT=$2
else
  read -e -p "Enter input directory [${DEFAULT_INPUT}]: " value
  INPUT=${value:-"${DEFAULT_INPUT}"}

  read -e -p "Enter output directory [${INPUT}]: " value
  OUTPUT=${value:-"${INPUT}"}
fi

read -p "Generate single mask for all surfaces (experimental)? yes/no [no]: " answer

if [ "$answer" != "${answer#[Yy]}" ] ;then
  python_options=(-s)
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

  python "${BASEDIR}/project-importer.py" $data_path "${dest_dir}/data.json" "${python_options[@]}"

done