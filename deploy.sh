set -e
rm -rf build
npm run build

S3_BUCKET_NAME=chessgpt

# Sync all files except for  index
echo "Uploading files to $S3_BUCKET_NAME..."
aws s3 sync ./build s3://$S3_BUCKET_NAME/ \
  --acl public-read \
  --cache-control max-age=31536000 \
  --exclude index.html \
  --profile blog-deployer

# Upload index.html
echo "Uploading index.html"
aws s3 cp ./build/index.html s3://$S3_BUCKET_NAME/index.html \
  --metadata-directive REPLACE \
  --cache-control max-age=0,no-cache,no-store,must-revalidate \
  --content-type text/html \
  --acl public-read \
  --profile blog-deployer
