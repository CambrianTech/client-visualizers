ROOT=$(dirname $0)/..
source "${ROOT}/.env.development"

if [ -f "${ROOT}/.env.development.local" ]; then
    source "${ROOT}/.env.development.local"
fi

cd ${ROOT}/server;
npm install;
npm run build;

cd ..
sh scripts/link-cb-output.sh