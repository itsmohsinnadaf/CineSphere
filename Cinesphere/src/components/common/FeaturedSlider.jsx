// src/components/common/FeaturedSlider.jsx
// Cinematic full-bleed slider with bottom thumbnail strip.

import { useEffect, useRef, useState } from "react";
import { browsePath } from "../../api/api";

function prettify(name) {
  return name.replace(/\.[^/.]+$/, "").replace(/[._]+/g, " ");
}

const SERIES_IMAGES  = { "Alien Earth": "/images/series/alien-earth.jpg" };
const DEFAULT_POSTER = "/images/movies/default-poster.jpg";

function resolveImage(item, fallbackMap = {}) {
  return item.posterUrl || item.coverUrl || fallbackMap[item.name] || DEFAULT_POSTER;
}

async function fetchSlides(path, type, fallbackMap, kind, limit = 3) {
  try {
    const items = await browsePath(path);
    const filtered = items.filter((i) => i.type === type);
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    return filtered.slice(0, limit).map((i) => ({
      title: prettify(i.name),
      image: resolveImage(i, fallbackMap),
      path: i.path,
      kind,
      type: i.type,
      videoUrl: i.videoUrl || null,
    }));
  } catch { return []; }
}

export default function FeaturedSlider({ onWatchNow }) {
  const [slides, setSlides]       = useState([]);
  const [active, setActive]       = useState(0);
  const [loaded, setLoaded]       = useState(false);
  const [animating, setAnimating] = useState(false);
  const timerRef  = useRef(null);
  const stripRef  = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [bollywood, hollywood, tollywood, series] = await Promise.all([
        fetchSlides("Movies/Bollywood", "video", {}, "movie", 2),
        fetchSlides("Movies/Hollywood", "video", {}, "movie", 2),
        fetchSlides("Movies/Tollywood", "video", {}, "movie", 2),
        fetchSlides("Series", "folder", SERIES_IMAGES, "series", 3),
      ]);
      if (cancelled) return;

      const movies = [...bollywood, ...hollywood, ...tollywood];
      const mixed  = [];
      const maxLen = Math.max(movies.length, series.length);
      for (let i = 0; i < maxLen; i++) {
        if (movies[i]) mixed.push(movies[i]);
        if (series[i]) mixed.push(series[i]);
      }
      const seen   = new Set();
      const unique = mixed.filter((s) => {
        if (seen.has(s.title)) return false;
        seen.add(s.title);
        return true;
      });
      setSlides(unique.slice(0, 8));
      setLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Auto-advance
  const startTimer = (slideCount) => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 500);
      setActive((prev) => (prev + 1) % slideCount);
    }, 6000);
  };

  useEffect(() => {
    if (slides.length < 2) return;
    startTimer(slides.length);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  // Scroll active thumb into view
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const thumb = strip.children[active];
    if (thumb) {
      const scrollLeft = thumb.offsetLeft - strip.offsetLeft - (strip.clientWidth / 2) + (thumb.clientWidth / 2);
      strip.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [active]);

  const goTo = (idx) => {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 500);
    setActive(idx);
    startTimer(slides.length);
  };

  if (!loaded) return <div className="cs-featured-wrapper cs-fs-skeleton" />;
  if (!slides.length) return null;

  const current = slides[active];

  return (
    /* Outer wrapper: overflow visible so strip thumbnails can lift freely */
    <div className="cs-featured-wrapper">

      {/* Inner cinematic area: overflow hidden for the BG image */}
      <div className="cs-featured-slider">
        {/* Background crossfade panels */}
        {slides.map((s, i) => (
          <div
            key={s.path || s.title}
            className={`cs-fs-bg ${i === active ? "cs-fs-bg-active" : ""}`}
            style={{ backgroundImage: `url(${s.image})` }}
          />
        ))}
        <div className="cs-fs-overlay-color" />
        <div className="cs-fs-overlay" />
        <div className="cs-fs-overlay-bottom" />

        {/* Content block — bottom left */}
        <div className={`cs-fs-content ${animating ? "cs-fs-content-exit" : "cs-fs-content-enter"}`}>
          <span className="cs-fs-kind-badge">
            {current.kind === "series" ? "📺 Series" : "🎬 Movie"}
          </span>
          <h2 className="cs-fs-title">{current.title}</h2>
          <button
            className="cs-fs-watch-btn"
            onClick={() => onWatchNow && onWatchNow(current)}
          >
            <span className="cs-fs-play-icon">▶</span>
            Watch Now
          </button>
        </div>
      </div>

      {/* Thumbnail strip — OUTSIDE the overflow:hidden box */}
      <div className="cs-fs-strip-wrap">
        <div className="cs-fs-strip" ref={stripRef}>
          {slides.map((s, i) => (
            <button
              key={s.path || s.title}
              className={`cs-fs-thumb ${i === active ? "cs-fs-thumb-active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={s.title}
            >
              <img 
                src={s.image} 
                alt={s.title} 
                fetchpriority="high"
                loading="eager"
                decoding="sync"
              />
              <div className="cs-fs-thumb-overlay" />
              <span className="cs-fs-thumb-title">{s.title}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
