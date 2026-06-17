// src/api/api.js
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:4000"
  : "https://cinesphere-mj9d.onrender.com";

// Frontend session cache — avoids re-fetching if we revisit a folder
// Entries expire after 5 minutes to pick up newly added content.
const _browseCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Browse a path via backend.
 * ""                  -> root (Movies, Series)
 * "Movies"            -> Movies folder
 * "Movies/Bollywood"  -> Movies/Bollywood
 * "Series/Alien Earth"-> Series/Alien Earth
 */
export async function browsePath(path = "") {
  const cached = _browseCache.get(path);
  if (cached && Date.now() < cached.expiry) {
    return cached.items;
  }

  const url = path
    ? `${API_BASE}/api/browse?path=${encodeURIComponent(path)}`
    : `${API_BASE}/api/browse`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  
  _browseCache.set(path, { items, expiry: Date.now() + CACHE_TTL_MS });
  return items;
}

/**
 * Silently pre-warm the backend + client cache for a path.
 * Safe to call at any time — ignores errors.
 */
export function prefetchPath(path = "") {
  const cached = _browseCache.get(path);
  if (cached && Date.now() < cached.expiry) return; // still valid
  browsePath(path).catch(() => {});
}



/**
 * Trigger a folder download handled by the browser.
 * Backend returns a ZIP stream.
 */
export function downloadFolder(path = "", suggestedName = "download") {
  const url = `${API_BASE}/api/download?path=${encodeURIComponent(path)}`;

  // Let the browser handle the file download (no blob in JS)
  const a = document.createElement("a");
  a.href = url;
  // `download` attribute is a hint; actual filename comes from server headers
  a.download = `${suggestedName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


/* ============== Media Track APIs ============== */

/**
 * Probe a video file for audio and subtitle tracks.
 * Returns: { audio: [...], subtitles: [...] }
 */
export async function probeMediaTracks(path) {
  const url = `${API_BASE}/api/probe?path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Probe failed: HTTP ${res.status}`);
  return res.json();
}

/**
 * Build a stream URL with a specific audio track selected.
 * The backend remuxes on-the-fly with ffmpeg -c copy.
 */
export function getStreamUrl(path, audioIndex, start = 0) {
  return `${API_BASE}/api/stream?path=${encodeURIComponent(path)}&audio=${audioIndex}&ss=${start}`;
}

/**
 * Build a subtitle URL for a specific subtitle track.
 * The backend extracts and converts to WebVTT.
 */
export function getSubtitleUrl(path, trackOrder) {
  return `${API_BASE}/api/subtitles?path=${encodeURIComponent(path)}&track=${trackOrder}`;
}

/**
 * Build an audio-only stream URL for a specific audio track.
 * The backend extracts only the audio (no video) — much lighter for parallel loading.
 */
export function getAudioStreamUrl(path, audioIndex, start = 0) {
  return `${API_BASE}/api/audio-stream?path=${encodeURIComponent(path)}&audio=${audioIndex}&ss=${start}`;
}
