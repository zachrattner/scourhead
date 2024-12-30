#!/bin/zsh

# ------------------------------------------------------------------------------
# DO RELEASE
# ------------------------------------------------------------------------------
# This script automates the release process:
# 1. Builds the application for macOS, Windows, and Linux
# 2. Uploads the build artifacts to AWS S3
# 3. Invalidates the CloudFront cache for the release files
# 4. Tags the latest commit on main with the version number
# 5. Creates a GitHub release for the version number
# 6. Updates the download links in the index.html file
# 7. Invalidates the CloudFront cache for the index.html file
# ------------------------------------------------------------------------------
# Prerequisites:
# 1. jq: Command-line JSON processor
# 2. AWS CLI: For interacting with AWS S3
# 3. GitHub CLI (gh): For tagging commits and creating releases on GitHub
#
# Install these tools on macOS using Homebrew:
#   - jq: brew install jq
#   - AWS CLI: brew install awscli
#   - GitHub CLI: brew install gh
#
# Additional Setup:
# - Configure AWS CLI with `aws configure` and set up a profile named 
#   'worthwhileadventures'.
# - Authenticate GitHub CLI with `gh auth login`.
# ------------------------------------------------------------------------------
 
# Enable strict mode
set -euo pipefail

# Extract version from package.json
APP_VERSION=$(jq -r '.version' package.json)
echo "Detected application version: ${APP_VERSION}"

# S3 bucket and profile
S3_BUCKET="s3://scourhead.com"
S3_RELEASE_FOLDER="$S3_BUCKET/releases"
AWS_PROFILE="worthwhileadventures"
BASE_URL="https://scourhead.com/releases"
CLOUDFRONT_DISTRIBUTION_ID="E146D77OPFI37E"

# Function to print errors and exit
error_exit() {
    echo "Error: $1" >&2
    exit 1
}

# Check if a Git tag exists
check_and_create_tag() {
    local tag="v${APP_VERSION}"
    if ! gh release view "$tag" > /dev/null 2>&1; then
        echo "Creating Git tag: $tag"
        git tag -a "$tag" -m "Release ${APP_VERSION}" || error_exit "Failed to create tag $tag"
        git push origin "$tag" || error_exit "Failed to push tag $tag"
    else
        echo "Git tag $tag already exists. Skipping."
    fi
}

# Create a GitHub release
create_github_release() {
    local tag="v${APP_VERSION}"
    local release_notes=$(cat <<EOF
# Scourhead v${APP_VERSION}

Download links for all architectures:

- [macOS arm64](https://scourhead.com/releases/${APP_VERSION}/Scourhead-${APP_VERSION}-arm64.dmg)
- [Windows x86](https://scourhead.com/releases/${APP_VERSION}/Scourhead-Setup-x86.exe)
- [Windows arm64](https://scourhead.com/releases/${APP_VERSION}/Scourhead-Setup-arm64.exe)
- [Linux x86](https://scourhead.com/releases/${APP_VERSION}/scourhead_${APP_VERSION}_amd64.deb)
- [Linux arm64](https://scourhead.com/releases/${APP_VERSION}/scourhead_${APP_VERSION}_arm64.deb)
EOF
)

    if ! gh release view "$tag" > /dev/null 2>&1; then
        echo "Creating GitHub release for $tag"
        gh release create "$tag" \
            --title "Scourhead v${APP_VERSION}" \
            --notes "$release_notes" || error_exit "Failed to create GitHub release"
    else
        echo "GitHub release $tag already exists. Skipping."
    fi
}

cleanup() {
    echo "Cleaning up release directory..."
    rm -rf release && npm run clean || error_exit "Failed to clean up release directory"
}

build_upload_check() {
    local build_command=$1
    local file_path=$2
    local s3_path=$3

    echo "Running build command: $build_command"
    eval "$build_command" || error_exit "Build command failed: $build_command"

    echo "Uploading $file_path to $s3_path"
    aws s3 cp "$file_path" "$s3_path" --profile "$AWS_PROFILE" || error_exit "Failed to upload $file_path to S3"

    echo "Verifying upload: $s3_path"
    aws s3 ls "$s3_path" --profile "$AWS_PROFILE" > /dev/null || error_exit "Uploaded file not found in S3: $s3_path"
}

invalidate_cloudfront_cache() {
    echo "Invalidating CloudFront cache for /releases/${APP_VERSION}/*"
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --paths "/releases/${APP_VERSION}/*" \
        --profile "$AWS_PROFILE" \
        --query 'Invalidation.Id' \
        --output text) || error_exit "Failed to create CloudFront invalidation"

    echo "CloudFront invalidation created: $INVALIDATION_ID"
}

update_index_html() {
    echo "Downloading index.html from S3..."
    aws s3 cp "$S3_BUCKET/index.html" index.html --profile "$AWS_PROFILE" || error_exit "Failed to download index.html"

    echo "Updating download links in index.html..."
    sed -i '' -e "s#https://scourhead.com/releases/.*/Scourhead-[0-9.]*-arm64.dmg#https://scourhead.com/releases/${APP_VERSION}/Scourhead-${APP_VERSION}-arm64.dmg#g" index.html
    sed -i '' -e "s#https://scourhead.com/releases/.*/Scourhead-Setup-x86.exe#https://scourhead.com/releases/${APP_VERSION}/Scourhead-Setup-x86.exe#g" index.html
    sed -i '' -e "s#https://scourhead.com/releases/.*/Scourhead-Setup-arm64.exe#https://scourhead.com/releases/${APP_VERSION}/Scourhead-Setup-arm64.exe#g" index.html
    sed -i '' -e "s#https://scourhead.com/releases/.*/scourhead_[0-9.]*_amd64.deb#https://scourhead.com/releases/${APP_VERSION}/scourhead_${APP_VERSION}_amd64.deb#g" index.html
    sed -i '' -e "s#https://scourhead.com/releases/.*/scourhead_[0-9.]*_arm64.deb#https://scourhead.com/releases/${APP_VERSION}/scourhead_${APP_VERSION}_arm64.deb#g" index.html

    echo "Uploading updated index.html to S3..."
    aws s3 cp index.html "$S3_BUCKET/index.html" --profile "$AWS_PROFILE" || error_exit "Failed to upload updated index.html"

    echo "Invalidating CloudFront cache for /index.html..."
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --paths "/index.html" \
        --profile "$AWS_PROFILE" \
        --query 'Invalidation.Id' \
        --output text) || error_exit "Failed to create CloudFront invalidation for /index.html"

    echo "CloudFront invalidation created for /index.html: $INVALIDATION_ID"

    rm index.html
}

cleanup
build_upload_check "npm run build-mac" \
    "release/Scourhead-${APP_VERSION}-arm64.dmg" \
    "$S3_RELEASE_FOLDER/${APP_VERSION}/Scourhead-${APP_VERSION}-arm64.dmg"

cleanup
build_upload_check "npm run build-win-x86" \
    "release/Scourhead Setup ${APP_VERSION}.exe" \
    "$S3_RELEASE_FOLDER/${APP_VERSION}/Scourhead-Setup-x86.exe"

cleanup
build_upload_check "npm run build-win-arm64" \
    "release/Scourhead Setup ${APP_VERSION}.exe" \
    "$S3_RELEASE_FOLDER/${APP_VERSION}/Scourhead-Setup-arm64.exe"

cleanup
build_upload_check "npm run build-linux-x86" \
    "release/scourhead_${APP_VERSION}_amd64.deb" \
    "$S3_RELEASE_FOLDER/${APP_VERSION}/scourhead_${APP_VERSION}_amd64.deb"

cleanup
build_upload_check "npm run build-linux-arm64" \
    "release/scourhead_${APP_VERSION}_arm64.deb" \
    "$S3_RELEASE_FOLDER/${APP_VERSION}/scourhead_${APP_VERSION}_arm64.deb"

cleanup
invalidate_cloudfront_cache
check_and_create_tag
create_github_release
update_index_html

echo "All tasks completed successfully!"
