
#get project settings
get_site_info() {
  ROOT=$(dirname $0)/..
  source "${ROOT}/.env.development"

  if [ -f "${ROOT}/.env.development.local" ]; then
      source "${ROOT}/.env.development.local"
  fi
}

#check for python import issues by running python script without other inputs and checking exit code
#check_python_dependencies SCRIPT_PATH REQ_PATH "yes|no"
check_python_dependencies () {
  script_path=$1
  requirements_path=$2
  default_answer=$3

  python ${SCRIPT_PATH} &>/dev/null
  status=$?

  if [ $status -eq 1 ]; then
    read -e -p "Missing some python dependencies, is it ok to generate? [${default_answer}]: " value
    ANSWER=${value:-"${default_answer}"}

    if [[ $ANSWER =~ [yY](es)* ]] ;then
      pip install -r "${requirements_path}"
    else
      echo "Please install the following dependencies yourself as specified in ${requirements_path}:\n"
      cat ${requirements_path}
      echo "\n\n"
      exit 0
    fi
  fi
}