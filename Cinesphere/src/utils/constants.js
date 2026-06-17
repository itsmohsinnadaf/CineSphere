// src/utils/constants.js
// Shared constants and utility functions used across the app.

/* ── Image fallback maps ── */

export const DEFAULT_POSTER = "/images/movies/default-poster.jpg";

export const SERIES_IMAGES = {
  "Alien Earth": "/images/series/alien-earth.jpg",
};

/* ── Filename prettifier ── */

/**
 * Turn a raw filename (with extension) into a human-readable title.
 * "Shiddat(2021).1080p_Hindi.mkv" → "Shiddat(2021) 1080p Hindi"
 */
export function prettifyFilename(name) {
  const withoutExt = name.replace(/\.[^/.]+$/, "");
  return withoutExt.replace(/[._-]+/g, " ");
}
