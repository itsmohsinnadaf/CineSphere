// src/api/api.js
const API_BASE = "https://cinesphere-mj9d.onrender.com";

/**
 * Browse a path via backend.
 * ""                  -> root (Movies, Series)
 * "Movies"            -> Movies folder
 * "Movies/Bollywood"  -> Movies/Bollywood
 * "Series/Alien Earth"-> Series/Alien Earth
 */
export async function browsePath(path = "") {
  const url = path
    ? `${API_BASE}/api/browse?path=${encodeURIComponent(path)}`
    : `${API_BASE}/api/browse`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
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
