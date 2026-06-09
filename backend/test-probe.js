import fs from "fs";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobePath from "@ffprobe-installer/ffprobe";
import { getFreshDownloadUrl } from "./graphClient.js";

ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

async function test() {
  const url = await getFreshDownloadUrl("Movies/Bollywood/Border-2 (2026)1080p10Bit Hindi WEB-DL.mkv");
  console.log("Got URL, fetching first 5MB...");
  
  const res = await fetch(url, {
    headers: { Range: "bytes=0-5242880" } // First 5MB
  });
  
  const buffer = await res.buffer();
  fs.writeFileSync("/tmp/test.mkv", buffer);
  
  console.log("Wrote /tmp/test.mkv, probing...");
  
  ffmpeg.ffprobe("/tmp/test.mkv", (err, metadata) => {
    if (err) {
      console.error("Probe error:", err.message);
    } else {
      console.log("Streams:", metadata.streams.map(s => s.codec_type));
    }
  });
}

test();
