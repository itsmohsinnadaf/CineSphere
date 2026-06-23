// src/components/common/ProgressiveImage.jsx
// Reusable image component with shimmer placeholder, fade-in reveal,
// and error fallback. Improves perceived loading speed across the site.

import { useState, useRef, useEffect } from "react";

const DEFAULT_FALLBACK = "/images/movies/default-poster.jpg";

export default function ProgressiveImage({
  src,
  alt,
  className = "",
  fallback = DEFAULT_FALLBACK,
  loading = "lazy",
  decoding = "async",
  fetchPriority,
  style,
  ...rest
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef(null);

  // Reset state when src changes
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  // If the image is already cached by the browser (complete before React mounts),
  // mark it as loaded immediately to skip the shimmer
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  const handleLoad = () => setLoaded(true);

  const handleError = (e) => {
    if (!errored) {
      setErrored(true);
      e.target.src = fallback;
    }
  };

  return (
    <div className={`cs-progressive-wrap ${loaded ? "cs-progressive-loaded" : ""}`} style={style}>
      {/* Shimmer placeholder — visible until image loads */}
      {!loaded && <div className="cs-progressive-shimmer" />}
      <img
        ref={imgRef}
        src={src || fallback}
        alt={alt}
        className={`cs-progressive-img ${className}`}
        loading={loading}
        decoding={decoding}
        fetchpriority={fetchPriority}
        onLoad={handleLoad}
        onError={handleError}
        {...rest}
      />
    </div>
  );
}
