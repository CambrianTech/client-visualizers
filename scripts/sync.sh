
source .env.development

SITE_NAME="${REACT_APP_SITE_NAME}"
LOCAL_PATH="cambrianar-sites/${SITE_NAME}"
REMOTE_PATH="s3://cambrianar-sites/${SITE_NAME}"

echo "Perform sync on ${SITE_NAME} specified in ./.env.development ? [YES]"

read answer

if [ "$answer" != "${answer#[Yy]}" ] ;then
  echo "Syncing items from ${REMOTE_PATH} into ${LOCAL_PATH}"
else
  exit 0
fi

rm -rf ${LOCAL_PATH}
rm -f public/cambrianar-sites
mkdir -p cambrianar-sites
cd public 
ln -sfn ../cambrianar-sites cambrianar-sites
aws s3 cp ${REMOTE_PATH} ${LOCAL_PATH} --recursive