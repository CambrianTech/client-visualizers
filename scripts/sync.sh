
ROOT=$(dirname $0)/..
source "${ROOT}/.env.development"

if [ -f "${ROOT}/.env.development.local" ]; then
    source "${ROOT}/.env.development.local"
fi

SITE_NAME="${REACT_APP_SITE_NAME}"
LOCAL_PATH="cambrianar-sites/${SITE_NAME}"
REMOTE_PATH="s3://cambrianar-sites/${SITE_NAME}"

echo "Perform sync on \"${SITE_NAME}\" (specified by .env.development/REACT_APP_SITE_NAME)? Yes/No"

read answer

if [ "$answer" != "${answer#[Yy]}" ] ;then
  echo "\nSyncing items from ${REMOTE_PATH} into ${LOCAL_PATH}\n\n"
else
  echo "\nOperation canceled.\n"
  exit 0
fi

rm -rf ${LOCAL_PATH}
rm -f public/cambrianar-sites
mkdir -p cambrianar-sites
cd public 
ln -sfn ../cambrianar-sites cambrianar-sites
aws s3 cp ${REMOTE_PATH} ${LOCAL_PATH} --recursive