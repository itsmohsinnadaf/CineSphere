// src/components/common/SearchOverlay.jsx
// Full-screen cinematic search overlay — triggered by "/" key or search icon.
// Searches movies and episodes by browsing known paths.

import { useEffect, useRef, useState, useCallback } from "react";
import { browsePath } from "../../api/api";

// #9 — module-level cache so index survives overlay close/reopen
let _cachedIndex = null;
let _indexBuilding = false;

function prettify(name) {
  return name.replace(/\.[^/.]+$/, "").replace(/[._]+/g, " ");
}

const SEARCH_PATHS = [
  { path: "Movies/Bollywood", kind: "Movie", genre: "Bollywood" },
  { path: "Movies/Hollywood", kind: "Movie", genre: "Hollywood" },
  { path: "Movies/Tollywood", kind: "Movie", genre: "Tollywood" },
  { path: "Series",           kind: "Series", genre: "Series" },
];

// Build a flat searchable index from the known library structure
async function buildIndex() {
  const results = await Promise.allSettled(
    SEARCH_PATHS.map(async ({ path, kind, genre }) => {
      const items = await browsePath(path);
      return items
        .filter((i) => i.type === "video" || i.type === "folder")
        .map((i) => ({
          title: prettify(i.name),
          rawName: i.name,
          kind,
          genre,
          path: i.path,
          image: i.posterUrl || i.coverUrl || "/images/movies/default-poster.jpg",
          videoUrl: i.videoUrl || null,
          type: i.type,
        }));
    })
  );
  return results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

export default function SearchOverlay({ open, onClose, onPlay }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [index, setIndex]     = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Build index when first opened — use module-level cache (#9)
  useEffect(() => {
    if (!open) return;
    if (_cachedIndex) { setTimeout(() => setIndex(_cachedIndex), 0); return; } // already cached
    if (_indexBuilding) return;                           // already in-flight
    _indexBuilding = true;
    setTimeout(() => setIndexing(true), 0);
    buildIndex()
      .then((result) => { _cachedIndex = result; setIndex(result); })
      .catch(console.error)
      .finally(() => { _indexBuilding = false; setIndexing(false); });
  }, [open]); // #5 — 'open' is the only dep that should trigger rebuild

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setTimeout(() => {
        setQuery("");
        setResults([]);
      }, 0);
    }
  }, [open]);

  // Keyboard: Escape to close, "/" to open (handled in App)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Search logic with debounce
  const search = useCallback((q) => {
    if (!q.trim()) { setResults([]); return; }
    const lower = q.toLowerCase();
    const found = index
      .filter((item) => item.title.toLowerCase().includes(lower))
      .slice(0, 20);
    setResults(found);
  }, [index]);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 150);
  };

  if (!open) return null;

  return (
    <div className="cs-search-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search">
      <div className="cs-search-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="cs-search-header">
          <span className="cs-search-icon">🔍</span>
          <input
            ref={inputRef}
            className="cs-search-input"
            type="text"
            placeholder={indexing ? "Building index…" : "Search movies, series…"}
            value={query}
            onChange={handleInput}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="cs-search-clear" onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}>
              ✕
            </button>
          )}
          <button className="cs-search-close-btn" onClick={onClose}>
            <span>ESC</span>
          </button>
        </div>

        {/* Hint when empty */}
        {!query && !indexing && (
          <div className="cs-search-hint">
            <div className="cs-search-hint-icon">🎬</div>
            <p>Type to search across your entire library</p>
            <div className="cs-search-shortcuts">
              <span><kbd>/</kbd> open</span>
              <span><kbd>ESC</kbd> close</span>
            </div>
          </div>
        )}

        {indexing && !query && (
          <div className="cs-search-hint">
            <div className="cs-search-indexing-spinner" />
            <p>Scanning library…</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="cs-search-results">
            <p className="cs-search-count">{results.length} result{results.length !== 1 ? "s" : ""} for "<strong>{query}</strong>"</p>
            <div className="cs-search-list">
              {results.map((item) => (
                <button
                  key={item.path}
                  className="cs-search-item"
                  onClick={() => {
                    onPlay(item);
                    onClose();
                  }}
                >
                  <img
                    className="cs-search-thumb"
                    src={item.image}
                    alt={item.title}
                    onError={(e) => { e.target.src = "/images/movies/default-poster.jpg"; }}
                  />
                  <div className="cs-search-meta">
                    <span className="cs-search-title">{item.title}</span>
                    <span className="cs-search-badge">{item.kind} · {item.genre}</span>
                  </div>
                  <span className="cs-search-play-icon">▶</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {query && results.length === 0 && !indexing && (
          <div className="cs-search-hint">
            <div className="cs-search-hint-icon">🫙</div>
            <p>No results for "<strong>{query}</strong>"</p>
          </div>
        )}
      </div>
    </div>
  );
}
