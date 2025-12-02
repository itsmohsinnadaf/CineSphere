// graphClient.js
import fetch from "node-fetch";
import "dotenv/config";

const tenantId = process.env.GRAPH_TENANT_ID;
const clientId = process.env.GRAPH_CLIENT_ID;
const clientSecret = process.env.GRAPH_CLIENT_SECRET;
const graphBase = "https://graph.microsoft.com/v1.0";

/* ============== AUTH ============== */

export async function getAppToken() {
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams();
  body.append("client_id", clientId);
  body.append("client_secret", clientSecret);
  body.append("scope", "https://graph.microsoft.com/.default");
  body.append("grant_type", "client_credentials");

  const res = await fetch(url, { method: "POST", body });

  if (!res.ok) {
    const text = await res.text();
    console.error("Token error:", text);
    throw new Error(`Failed to get access token: ${res.status}`);
  }

  const json = await res.json();
  return json.access_token;
}

/* ============== GRAPH HELPER ============== */

export async function getChildren(token, fullPath) {
  const user = encodeURIComponent(process.env.GRAPH_USER);
  const encodedPath = encodeURIComponent(fullPath);

  // full payload (no $select) so we get: file, folder, @microsoft.graph.downloadUrl
  const url = `${graphBase}/users/${user}/drive/root:/${encodedPath}:/children`;

  console.log("➡️ Fetching children for:", fullPath);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Graph error for", fullPath, ":", text);
    throw new Error(`Graph error ${res.status}`);
  }

  const data = await res.json();
  return data.value || [];
}

/* ============== TYPE DETECTION ============== */

// detect video by mime OR extension
function isVideoFile(item) {
  if (!item.file && !item.name) return false;

  if (item.file?.mimeType?.startsWith("video/")) return true;

  const name = (item.name || "").toLowerCase();
  const exts = [".mp4", ".mkv", ".mov", ".avi", ".wmv", ".flv", ".webm"];
  return exts.some((ext) => name.endsWith(ext));
}

// detect images by extension / mime
function isImageFile(item) {
  if (!item.name) return false;

  if (item.file?.mimeType?.startsWith("image/")) return true;

  const name = item.name.toLowerCase();
  const exts = [".jpg", ".jpeg", ".png", ".webp"];
  return exts.some((ext) => name.endsWith(ext));
}

/**
 * Normalise a name so minor differences don't matter:
 * - remove extension
 * - lowercase
 * - remove spaces, dots, underscores, dashes, brackets
 *
 * "Shiddat(2021) 1080p Hindi.mkv" -> "shiddat20211080phindi"
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\.[^/.]+$/, "") // remove extension
    .replace(/[\s._\-()[\]]+/g, "") // remove separators
    .trim();
}

/* ============== FOLDER COVER HELPER ============== */
/**
 * Find a cover image **inside a folder** for that folder:
 * 1) image with same normalized name as folder
 * 2) file starting with "cover"
 * 3) file starting with "poster"
 * 4) otherwise the first image in that folder
 */
async function findFolderCover(token, folderFullPath, folderName) {
  try {
    const children = await getChildren(token, folderFullPath);
    const images = children.filter((c) => isImageFile(c));
    if (!images.length) return null;

    const folderKey = normalizeName(folderName);

    let coverItem =
      images.find((img) => normalizeName(img.name) === folderKey) ||
      images.find((img) =>
        img.name.toLowerCase().startsWith("cover")
      ) ||
      images.find((img) =>
        img.name.toLowerCase().startsWith("poster")
      ) ||
      images[0];

    return coverItem ? coverItem["@microsoft.graph.downloadUrl"] : null;
  } catch (err) {
    console.error("Error finding cover for folder", folderFullPath, err);
    return null;
  }
}

/* ============== MAIN BROWSE FUNCTION ============== */

/**
 * Browse a relative path inside MyStreamingLibrary.
 *
 * relativePath ""                 -> MyStreamingLibrary
 * relativePath "Movies"           -> MyStreamingLibrary/Movies
 * relativePath "Movies/Bollywood" -> MyStreamingLibrary/Movies/Bollywood
 * relativePath "Series"           -> MyStreamingLibrary/Series
 */
export async function browsePath(relativePath = "") {
  const token = await getAppToken();
  const root = process.env.GRAPH_FOLDER_PATH; // e.g. "MyStreamingLibrary"

  const fullPath = relativePath ? `${root}/${relativePath}` : root;

  const children = await getChildren(token, fullPath);

  console.log(
    `📂 children in "${fullPath}":`,
    children.map((c) => c.name)
  );

  const items = [];

  // Separate by type in THIS folder
  const folders = children.filter((i) => i.folder);
  const images = children.filter((i) => isImageFile(i));
  const videos = children.filter((i) => isVideoFile(i));

  const firstImageUrl =
    images.length > 0 ? images[0]["@microsoft.graph.downloadUrl"] : null;

  console.log(
    `   folders=${folders.length}, videos=${videos.length}, images=${images.length}`
  );

  /* ----- 1) FOLDERS (Movies, Series, Bollywood, SeriesName, Season1...) ----- */
  for (const item of folders) {
    const childRelPath = relativePath
      ? `${relativePath}/${item.name}`
      : item.name;

    const subFullPath = `${fullPath}/${item.name}`;
    const coverUrl = await findFolderCover(
      token,
      subFullPath,
      item.name
    );

    items.push({
      type: "folder",
      name: item.name,
      path: childRelPath,
      coverUrl, // used by frontend for folder cards
    });
  }

  /* ----- 2) VIDEOS (movies / episodes) + posterUrl from images in SAME folder ----- */
  for (const item of videos) {
    const childRelPath = relativePath
      ? `${relativePath}/${item.name}`
      : item.name;

    const videoUrl = item["@microsoft.graph.downloadUrl"] || null;

    // find best poster image in THIS folder
    const vKey = normalizeName(item.name);

    let exactPoster = images.find(
      (img) => normalizeName(img.name) === vKey
    );
    let posterItem = exactPoster || images[0] || null;

    const posterUrl = posterItem
      ? posterItem["@microsoft.graph.downloadUrl"]
      : null;

    console.log(
      "  🎥 video item:",
      item.name,
      "| videoUrl:",
      videoUrl ? "OK" : "MISSING",
      "| poster:",
      posterItem ? posterItem.name : "none"
    );

    items.push({
      type: "video",
      name: item.name,
      path: childRelPath,
      videoUrl,
      posterUrl, // used by frontend for movie/episode cards
    });
  }

  console.log(
    `✅ browsePath("${relativePath}") returned ${items.length} items`
  );
  return items;
}
