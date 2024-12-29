#!/bin/zsh

# Set variables
BROWSERS_DIR="./browsers"
BASE_URL="https://playwright.azureedge.net/builds/chromium/1148"

# Check for platform argument
if [ $# -eq 0 ]; then
  echo "Usage: $0 <platform>"
  echo "Supported platforms: mac, win, linux"
  exit 1
fi

PLATFORM=$1
case $PLATFORM in
  mac)
    ZIP_FILENAME="chromium-headless-shell-mac-arm64.zip"
    ;;
  win)
    ZIP_FILENAME="chromium-headless-shell-win64.zip"
    ;;
  linux)
    ZIP_FILENAME="chromium-headless-shell-linux.zip"
    ;;
  *)
    echo "Invalid platform: $PLATFORM"
    echo "Supported platforms: mac, win, linux"
    exit 1
    ;;
esac

# Create the browsers directory if it doesn't exist
if [ -d "$BROWSERS_DIR" ]; then
  echo "Removing existing $BROWSERS_DIR directory..."
  rm -rf "$BROWSERS_DIR"
fi

echo "Creating $BROWSERS_DIR directory..."
mkdir "$BROWSERS_DIR"

# Download the Chromium zip file
echo "Downloading Chromium headless shell for $PLATFORM from $BASE_URL/$ZIP_FILENAME..."
curl -o "$BROWSERS_DIR/$ZIP_FILENAME" -L "$BASE_URL/$ZIP_FILENAME"

# Extract the zip file into the browsers directory
echo "Extracting $ZIP_FILENAME..."
unzip -o "$BROWSERS_DIR/$ZIP_FILENAME" -d "$BROWSERS_DIR"

# Remove the zip file
echo "Cleaning up..."
rm "$BROWSERS_DIR/$ZIP_FILENAME"

echo "Chromium headless shell for $PLATFORM installed in $BROWSERS_DIR."