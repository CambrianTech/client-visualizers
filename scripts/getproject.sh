
ROOT=$(dirname $0)/..
source "${ROOT}/.env.development"

if [ -f "${ROOT}/.env.development.local" ]; then
    source "${ROOT}/.env.development.local"
fi

BUCKET="cb-backend-data"

if [ $# -eq 1 ] ;then
  PROJECT_ID=$1
else
  echo "Specify project ID to download from \"${BUCKET}\" (ENTER to cancel)"
  read PROJECT_ID
fi

n=${#PROJECT_ID}

if [ $n -eq 0 ]; then
  echo "\nNo project ID specified, operation canceled.\n"
  exit 0
fi

LOCAL_PATH="projects/${PROJECT_ID}"
REMOTE_PATH="s3://${BUCKET}/${PROJECT_ID}"

echo "\nDownloading from ${REMOTE_PATH} into ${LOCAL_PATH}\n\n"

exists=$(aws s3 ls $REMOTE_PATH)
if [ -z "$exists" ]; then
  echo "Project does not exist"
else
  echo "Project exists, downloading recursively"
fi

mkdir -p projects
cd projects
aws s3 cp ${REMOTE_PATH} ${LOCAL_PATH} --recursive
