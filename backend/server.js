// server.js
import express from "express";
import cors from "cors";
import archiver from "archiver";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobePath from "@ffprobe-installer/ffprobe";
import { browsePath, getAppToken, getChildren, getFreshDownloadUrl } from "./graphClient.js";
import "dotenv/config";

import fs from "fs";

// Configure fluent-ffmpeg with static binaries
// Ensure they have execution permissions (fixes issues on Render/Linux deployments)
try {
  if (fs.existsSync(ffmpegPath.path)) fs.chmodSync(ffmpegPath.path, 0o755);
  if (fs.existsSync(ffprobePath.path)) fs.chmodSync(ffprobePath.path, 0o755);
} catch (err) {
  console.warn("Could not set execute permissions on ffmpeg binaries:", err);
}

ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

const app = express();
const PORT = process.env.PORT || 4000;

// #6 — restrict CORS to the known frontend origins
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://cinesphereworld.netlify.app",
    process.env.FRONTEND_ORIGIN
  ].filter(Boolean),
  methods: ["GET"],
}));
app.use(express.json());


/* ============== /api/browse (existing behaviour) ============== */

app.get("/api/browse", async (req, res) => {
  const relativePath = req.query.path || "";

  try {
    const items = await browsePath(relativePath);
    res.json({ items });
  } catch (err) {
    console.error("browse error:", err);
    res.status(500).json({ error: "Failed to browse path" });
  }
});

/* ============== Download helpers ============== */

// video file detection by extension
function isVideoFileName(name = "") {
  const lower = name.toLowerCase();
  const exts = [".mp4", ".mkv", ".mov", ".avi", ".wmv", ".flv", ".webm"];
  return exts.some((ext) => lower.endsWith(ext));
}

// recursively walk a OneDrive folder & add videos to archive
async function addFolderVideosToArchive(token, archive, fullPath, relPath = "") {
  const children = await getChildren(token, fullPath);

  for (const item of children) {
    const itemName = item.name;
    const itemFullPath = `${fullPath}/${itemName}`;
    const itemRelPath = relPath ? `${relPath}/${itemName}` : itemName;

    // Folder → recurse
    if (item.folder) {
      await addFolderVideosToArchive(token, archive, itemFullPath, itemRelPath);
      continue;
    }

    // Only include video files, skip images and others
    if (!item.file || !isVideoFileName(itemName)) {
      continue;
    }

    const downloadUrl = item["@microsoft.graph.downloadUrl"];
    if (!downloadUrl) continue;

    console.log("Adding video to zip:", itemRelPath);

    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      console.warn(
        "Failed to fetch file",
        itemName,
        "status:",
        fileRes.status
      );
      continue;
    }

    // Stream file into zip, preserving relative path
    archive.append(fileRes.body, { name: itemRelPath });
  }
}

/* ============== /api/download (videos-only ZIP) ============== */

/**
 * GET /api/download?path=Series/Alien Earth
 *
 * Zips ONLY video files inside:
 *   GRAPH_FOLDER_PATH/Series/Alien Earth/** (recursively)
 * Skips all images and other non-video files.
 */
app.get("/api/download", async (req, res) => {
  const relativePath = req.query.path || "";

  try {
    const token = await getAppToken();
    const root = process.env.GRAPH_FOLDER_PATH; // e.g. "MyStreamingLibrary"
    const fullPath = relativePath ? `${root}/${relativePath}` : root;

    console.log("Zipping videos for folder:", fullPath);

    const safeName = (relativePath || "library").replace(/[\/\\]/g, "-");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}-videos.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        res.status(500).end("Archive error");
      }
    });

    // Pipe archive to HTTP response
    archive.pipe(res);

    // Add all videos recursively (async)
    await addFolderVideosToArchive(token, archive, fullPath, "");

    // Finalize archive – do NOT await; archiver will handle stream end
    archive.finalize();
  } catch (err) {
    console.error("Download error:", err);
    if (!res.headersSent) {
      res.status(500).send("Download failed");
    }
  }
});

/* ============== /api/probe (audio + subtitle tracks) ============== */

/**
 * GET /api/probe?path=Movies/Bollywood/Shiddat.mkv
 *
 * Uses ffprobe to list all audio and subtitle tracks embedded in the file.
 * Returns: { audio: [...], subtitles: [...] }
 */
app.get("/api/probe", async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: "path is required" });

  const tempId = Date.now() + "-" + Math.floor(Math.random() * 10000);
  const tempPath = `/tmp/probe-${tempId}.mkv`;

  try {
    const downloadUrl = await getFreshDownloadUrl(filePath);

    // Render's static ffprobe binaries crash (SIGSEGV) when reading HTTPS streams directly.
    // Workaround: Download the first 5MB locally to read the MKV headers safely.
    const fileRes = await fetch(downloadUrl, {
      headers: { Range: "bytes=0-5242880" }
    });
    
    if (!fileRes.ok) throw new Error("Failed to fetch stream chunk");
    
    const buffer = await fileRes.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(buffer));

    ffmpeg.ffprobe(tempPath, (err, metadata) => {
      // Clean up the temp file immediately
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (e) {}
      }

      if (err) {
        console.error("ffprobe error:", err.message);
        return res.status(500).json({ error: "Failed to probe file", details: err.message });
      }

      const streams = metadata.streams || [];

      const audio = streams
        .filter((s) => s.codec_type === "audio")
        .map((s, i) => ({
          index: s.index,
          language: s.tags?.language || "und",
          title: s.tags?.title || "",
          codec: s.codec_name,
          channels: s.channels,
          default: !!(s.disposition?.default),
          order: i,
        }));

      // Only text-based subtitle codecs can be converted to WebVTT.
      // Bitmap-based formats (PGS, VobSub, DVB, XSUB) are excluded.
      const TEXT_SUB_CODECS = new Set([
        "srt", "subrip", "ass", "ssa", "webvtt", "mov_text", "text",
        "ttml", "stl", "realtext", "subviewer", "subviewer1",
        "microdvd", "mpl2", "jacosub", "sami", "pjs",
      ]);

      const allSubs = streams.filter((s) => s.codec_type === "subtitle");
      const subtitles = allSubs
        .filter((s) => TEXT_SUB_CODECS.has(s.codec_name))
        .map((s) => {
          // Find the original order index among ALL subtitle streams
          // (needed for ffmpeg -map 0:s:N which counts by subtitle-stream order)
          const orderAmongAll = allSubs.indexOf(s);
          return {
            index: s.index,
            language: s.tags?.language || "und",
            title: s.tags?.title || "",
            codec: s.codec_name,
            default: !!(s.disposition?.default),
            forced: !!(s.disposition?.forced),
            order: orderAmongAll,
          };
        });

      const totalDuration = parseFloat(metadata.format?.duration) || 0;
      console.log(`🎵 Probe "${filePath}": ${audio.length} audio, ${subtitles.length} subtitle tracks, duration: ${totalDuration}s`);
      res.json({ audio, subtitles, duration: totalDuration });
    });
  } catch (err) {
    console.error("probe endpoint error:", err);
    res.status(500).json({ error: err.message });
  }
});


/* ============== /api/stream (remux with selected audio track) ============== */

/**
 * GET /api/stream?path=Movies/Bollywood/Shiddat.mkv&audio=1
 *
 * Remuxes the video with only the selected audio track.
 * Uses -c copy (no re-encoding) for speed.
 * Outputs MP4 container for broad browser compatibility.
 */
app.get("/api/stream", async (req, res) => {
  const filePath = req.query.path;
  const audioIndex = parseInt(req.query.audio, 10);
  const startTime = parseFloat(req.query.ss) || 0;
  if (!filePath) return res.status(400).json({ error: "path is required" });
  if (isNaN(audioIndex)) return res.status(400).json({ error: "audio index is required" });

  try {
    const downloadUrl = await getFreshDownloadUrl(filePath);

    console.log(`🔄 Streaming "${filePath}" with audio track ${audioIndex} from ${startTime}s`);

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Transfer-Encoding", "chunked");

    let command = ffmpeg(downloadUrl);
    if (startTime > 0) {
      command = command.setStartTime(startTime);
    }

    command = command
      .outputOptions([
        "-map", "0:v:0",            // first video stream
        "-map", `0:a:${audioIndex}`, // selected audio stream (by order among audio streams)
        "-c", "copy",               // no re-encoding
        "-movflags", "frag_keyframe+empty_moov+faststart", // streaming-friendly MP4
        "-f", "mp4",
      ])
      .on("error", (err) => {
        // "Output stream closed" is normal when the user navigates away
        if (!err.message.includes("Output stream closed")) {
          console.error("stream ffmpeg error:", err.message);
        }
        if (!res.headersSent) res.status(500).end();
      })
      .pipe(res, { end: true });

    // If client disconnects, kill ffmpeg
    req.on("close", () => {
      command?.kill?.("SIGKILL");
    });
  } catch (err) {
    console.error("stream endpoint error:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

/* ============== /api/subtitles (extract subtitle as WebVTT — cached) ============== */

// In-memory subtitle cache: key = "path:track" → VTT string
const _subtitleCache = new Map();

/**
 * GET /api/subtitles?path=Movies/Bollywood/Shiddat.mkv&track=0
 *
 * Extracts the specified subtitle track and converts to WebVTT format.
 * Results are cached in memory so repeat requests are instant.
 */
app.get("/api/subtitles", async (req, res) => {
  const filePath = req.query.path;
  const trackOrder = parseInt(req.query.track, 10);
  if (!filePath) return res.status(400).json({ error: "path is required" });
  if (isNaN(trackOrder)) return res.status(400).json({ error: "track index is required" });

  const cacheKey = `${filePath}:${trackOrder}`;

  // Serve from cache if available
  if (_subtitleCache.has(cacheKey)) {
    console.log(`⚡️ Subtitle cache hit: "${cacheKey}"`);
    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    return res.send(_subtitleCache.get(cacheKey));
  }

  try {
    const downloadUrl = await getFreshDownloadUrl(filePath);

    console.log(`📝 Extracting subtitle track ${trackOrder} from "${filePath}"`);

    // Collect ffmpeg output into a buffer, then cache + send
    const chunks = [];
    const command = ffmpeg(downloadUrl)
      .outputOptions([
        "-map", `0:s:${trackOrder}`,
        "-f", "webvtt",
      ])
      .on("error", (err) => {
        if (!err.message.includes("Output stream closed")) {
          console.error("subtitle ffmpeg error:", err.message);
        }
        if (!res.headersSent) res.status(500).end();
      });

    const stream = command.pipe();
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => {
      const vttText = Buffer.concat(chunks).toString("utf-8");
      _subtitleCache.set(cacheKey, vttText);
      console.log(`✅ Subtitle cached: "${cacheKey}" (${vttText.length} bytes)`);
      if (!res.headersSent) {
        res.setHeader("Content-Type", "text/vtt; charset=utf-8");
        res.send(vttText);
      }
    });

    req.on("close", () => {
      if (!res.writableEnded) command?.kill?.("SIGKILL");
    });
  } catch (err) {
    console.error("subtitle endpoint error:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});


/* ============== START SERVER ============== */

app.listen(PORT, () => {
  console.log(`✅ API server listening on http://localhost:${PORT}`);
});
