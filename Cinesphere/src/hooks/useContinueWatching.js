// src/hooks/useContinueWatching.js
// Persists and retrieves watch progress from localStorage.

const KEY = "cs_continue_watching";
const MAX_ITEMS = 12;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function save(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("Storage error", e);
  }
}

/**
 * Save / update a video's watch progress.
 * @param {object} video   – video object with id, title, image, videoUrl, type, etc.
 * @param {number} currentTime – seconds watched so far
 * @param {number} duration    – total duration in seconds
 * @param {object} context     – { genre, series, season } for navigation back
 */
export function saveProgress(video, currentTime, duration, context = {}, audioTrack = 0, ccTrack = -1) {
  if (!video?.id || !duration || duration < 5) return;
  const pct = (currentTime / duration) * 100;
  // Don't save if almost finished (>94%) or barely started (<2%)
  if (pct > 94 || pct < 2) {
    // Remove from list if finished
    if (pct > 94) removeProgress(video.id);
    return;
  }

  const items = load().filter((i) => i.id !== video.id);
  const entry = {
    id: video.id,
    title: video.title,
    image: video.image || video.posterUrl || "/images/movies/default-poster.jpg",
    videoUrl: video.videoUrl,
    type: video.type || "Movie",
    path: video.path,
    currentTime,
    duration,
    pct: Math.round(pct),
    savedAt: Date.now(),
    context,
    audioTrack,
    ccTrack,
  };
  items.unshift(entry); // most recent first
  save(items.slice(0, MAX_ITEMS));
}

export function removeProgress(videoId) {
  const items = load().filter((i) => i.id !== videoId);
  save(items);
}

export function getContinueWatching() {
  return load();
}

export function clearContinueWatching() {
  save([]);
}
