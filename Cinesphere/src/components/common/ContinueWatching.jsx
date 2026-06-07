// src/components/common/ContinueWatching.jsx
// "Continue Watching" horizontal scroll row shown on the home page.

import { useEffect, useState } from "react";
import { getContinueWatching, removeProgress } from "../../hooks/useContinueWatching";

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
    setTimeout(refresh, 0);
    // Re-read on storage events (e.g. other tab)
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
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
