#!/bin/bash

# PocketBase version
VERSION="0.22.21"
ZIP_FILE="pocketbase_${VERSION}_linux_amd64.zip"
URL="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/${ZIP_FILE}"

# Download
if [ ! -f "pocketbase" ]; then
  echo "Downloading PocketBase v${VERSION}..."
  wget -q "${URL}"
  unzip -o "${ZIP_FILE}"
  rm "${ZIP_FILE}"
  chmod +x pocketbase
  echo "PocketBase installed."
else
  echo "PocketBase already exists."
fi
