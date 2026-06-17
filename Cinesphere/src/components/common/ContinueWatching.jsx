// src/components/common/ContinueWatching.jsx
// "Continue Watching" horizontal scroll row shown on the home page.

import { useEffect, useState } from "react";
import { getContinueWatching, removeProgress, updateContinueWatching } from "../../hooks/useContinueWatching";
import { resolveVideo } from "../../api/api";

function formatTime(secs) {
  if (!secs) return "";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  // #10 — no seconds shown; < 1 min gets a friendly label
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m left`;
  return "< 1m left";
}

export default function ContinueWatching({ onPlay }) {
  const [items, setItems] = useState([]);

  const refresh = () => setItems(getContinueWatching());

  useEffect(() => {
    let mounted = true;
    const fetchFresh = async () => {
      const stored = getContinueWatching();
      setItems(stored); // Optimistic render

      let updated = false;
      const refreshed = await Promise.all(
        stored.map(async (item) => {
          // If the item hasn't been refreshed/saved recently (older than 45 mins), fetch a fresh Graph URL
          if (!item.savedAt || Date.now() - item.savedAt > 45 * 60 * 1000) {
            try {
              const fresh = await resolveVideo(item.path);
              if (fresh.videoUrl) {
                item.videoUrl = fresh.videoUrl;
                if (fresh.posterUrl) item.image = fresh.posterUrl;
                item.savedAt = Date.now();
                updated = true;
              }
            } catch (err) {
              console.warn("Failed to refresh continue watching URLs", err);
            }
          }
          return item;
        })
      );

      if (mounted && updated) {
        setItems([...refreshed]);
        updateContinueWatching(refreshed);
      }
    };

    fetchFresh();

    const onStorage = () => setItems(getContinueWatching());
    window.addEventListener("storage", onStorage);
    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!items.length) return null;

  const handleRemove = (e, id) => {
    e.stopPropagation();
    removeProgress(id);
    refresh();
  };

  return (
    <section className="cs-cw-section">
      <div className="cs-cw-header">
        <h2 className="cs-cw-title">
          <span className="cs-cw-icon">▶</span> Continue Watching
        </h2>
        <button
          className="cs-cw-clear"
          onClick={() => { items.forEach(i => removeProgress(i.id)); refresh(); }}
        >
          Clear all
        </button>
      </div>

      <div className="cs-cw-strip">
        {items.map((item) => {
          const remaining = item.duration - item.currentTime;
          return (
            <div
              key={item.id}
              className="cs-cw-card"
              onClick={() => onPlay(item)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlay(item); } }}
              role="button"
              tabIndex={0}
              title={item.title}
            >
              {/* Thumbnail */}
              <div className="cs-cw-thumb-wrap">
                <img
                  className="cs-cw-thumb"
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/images/movies/default-poster.jpg";
                  }}
                />
                
                {/* Bottom Gradient overlay for text */}
                <div className="cs-cw-bottom-gradient" />

                {/* Progress bar overlay */}
                <div className="cs-cw-progress-bar">
                  <div
                    className="cs-cw-progress-fill"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
                
                {/* Info (Inside thumbnail) */}
                <div className="cs-cw-info">
                  <p className="cs-cw-name">{item.title}</p>
                  <p className="cs-cw-time">{formatTime(remaining)}</p>
                </div>

                {/* Play icon */}
                <div className="cs-cw-play-overlay">
                  <span className="cs-cw-play-btn">▶</span>
                </div>
                
                {/* Remove button */}
                <button
                  className="cs-cw-remove"
                  onClick={(e) => handleRemove(e, item.id)}
                  aria-label="Remove"
                >
                  ✕
                </button>
                
                {/* Type badge */}
                <span className="cs-cw-type-badge">{item.type}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
