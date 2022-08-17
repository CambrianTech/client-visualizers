
source .env.development

DEFAULT_INPUT="cambrianar-sites/${REACT_APP_SITE_NAME}/scenes"
DEFAULT_OUTPUT="exported-scenes"

if [ $# -eq 2 ] ;then
  INPUT=$1
  OUTPUT=$2
else
  read -p "Enter input directory [${DEFAULT_INPUT}]: " value
  INPUT=${value:-"${DEFAULT_INPUT}"}

  read -p "Enter output directory [${DEFAULT_OUTPUT}]: " value
  OUTPUT=${value:-"${DEFAULT_OUTPUT}"}

fi

mkdir -p ${OUTPUT}

for file in $(find ${INPUT} -name "data.json" -type f -print ); do
  src_dir=$(dirname $file)
  data_path="${src_dir}/data.json"

  if [ ! -f $data_path ]; then
    continue
  fi

  project_id=$(basename ${src_dir})
  dest_dir=${OUTPUT}/${project_id}

  mkdir -p ${dest_dir}
  cp $data_path "${dest_dir}/data.json"

done