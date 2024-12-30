#!/bin/zsh

# Set variables
BROWSERS_DIR="./browsers"
BASE_URL="https://playwright.azureedge.net/builds/chromium/1148"

# Function to detect platform automatically
detect_platform() {
  case "$(uname -s)" in
    Darwin)
      echo "mac"
      ;;
    Linux)
      echo "linux"
      ;;
    CYGWIN*|MINGW*|MSYS*|MINGW32*|MINGW64*)
      echo "win"
      ;;
    *)
      echo "unknown"
      ;;
  esac
}

# Parse arguments
PLATFORM=""
NO_OVERWRITE=false

for ARG in "$@"; do
  case $ARG in
    --no-overwrite)
      NO_OVERWRITE=true
      ;;
    *)
      PLATFORM=$ARG
      ;;
  esac
done

# Auto-detect platform if not provided
if [ -z "$PLATFORM" ]; then
  PLATFORM=$(detect_platform)
  if [ "$PLATFORM" = "unknown" ]; then
    echo "Unable to detect platform. Please specify one of: mac, win, linux"
    exit 1
  fi
  echo "Auto-detected platform: $PLATFORM"
fi

# Validate platform
case $PLATFORM in
  mac)
    ZIP_FILENAME="chromium-headless-shell-mac-arm64.zip"
    ;;
  mac-x64)
    ZIP_FILENAME="chromium-headless-shell-mac.zip"
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

# Check if the browsers directory exists
if [ -d "$BROWSERS_DIR" ]; then
  if [ "$NO_OVERWRITE" = false ]; then
    echo "Removing existing $BROWSERS_DIR directory..."
    rm -rf "$BROWSERS_DIR"
    echo "Creating $BROWSERS_DIR directory..."
    mkdir "$BROWSERS_DIR"
  elif [ "$NO_OVERWRITE" = true ]; then
    echo "$BROWSERS_DIR already exists. Skipping download and extraction due to --no-overwrite option."
    exit 0
  fi
else
  echo "Creating $BROWSERS_DIR directory..."
  mkdir "$BROWSERS_DIR"
fi

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