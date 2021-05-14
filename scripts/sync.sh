rm -rf cambrianar-sites
rm -f public/cambrianar-sites
mkdir -p cambrianar-sites
cd public 
ln -sfn ../cambrianar-sites cambrianar-sites
aws s3 cp s3://cambrianar-sites cambrianar-sites --recursive