#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing npm dependencies..."
npm install

# ffmpeg/ffprobe binaries are bundled via @ffmpeg-installer/ffmpeg
# and @ffprobe-installer/ffprobe npm packages — no system install needed.

echo "Build complete."
