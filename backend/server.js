// server.js
import express from "express";
import cors from "cors";
import archiver from "archiver";
import fetch from "node-fetch";
import { browsePath, getAppToken, getChildren } from "./graphClient.js";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
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

/* ============== START SERVER ============== */

app.listen(PORT, () => {
  console.log(`✅ API server listening on http://localhost:${PORT}`);
});
