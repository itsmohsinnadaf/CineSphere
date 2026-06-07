#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing npm dependencies..."
npm install

echo "Updating apt cache and installing ffmpeg..."
apt-get update
apt-get install -y ffmpeg

echo "Build complete."
