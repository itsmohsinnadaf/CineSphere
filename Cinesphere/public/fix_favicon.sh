#!/bin/bash
OUTPUT=$(/Users/mohsinnadaf/Documents/Mohsin/Websites/Cinesphere/backend/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg -i cinesphere-icon.png -vf "cropdetect=24:16:0" -f null - 2>&1 | grep crop= | tail -n 1 | awk '{print $NF}')
echo "Detected crop: $OUTPUT"
/Users/mohsinnadaf/Documents/Mohsin/Websites/Cinesphere/backend/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg -i cinesphere-icon.png -vf "$OUTPUT,scale='max(iw,ih)':'max(iw,ih)':force_original_aspect_ratio=decrease,pad='max(iw,ih)':'max(iw,ih)':(ow-iw)/2:(oh-ih)/2:color=black@0" -y Favicon.png
