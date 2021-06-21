ROOT_BUCKET="cb-backend-data"

echo "ENTER project name or press ENTER to download all projects:"

read BUCKET_NAME

LOCAL_PATH="${ROOT_BUCKET}/${BUCKET_NAME}"
REMOTE_PATH="s3://${ROOT_BUCKET}/${BUCKET_NAME}"

mkdir -p ${LOCAL_PATH}
aws s3 cp ${REMOTE_PATH} ${LOCAL_PATH} --recursive

echo
echo Copied files to $LOCAL_PATH
echo 