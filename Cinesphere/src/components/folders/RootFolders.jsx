// src/components/folders/RootFolders.jsx
import AnimateIn from "../common/AnimateIn";
import FeaturedSlider from "../common/FeaturedSlider";

export default function RootFolders({ folders, loading, error, onRootClick, continueWatchingSlot }) {
  // Loading screen is rendered at the App level (outside animated wrapper)
  if (loading && !folders.length) {
    return null;
  }

  if (error && !folders.length) {
    return (
      <section className="cs-left">
        <h2 className="cs-section-title">Library</h2>
        <p className="cs-section-subtitle">Error: {error}</p>
      </section>
    );
  }

  const handleWatchNow = (slide) => {
    const isMovie = slide.path?.toLowerCase().startsWith("movies");
    const target = folders.find((f) =>
      isMovie
        ? f.name.toLowerCase() === "movies"
        : f.name.toLowerCase() === "series"
    ) || folders[0];
    if (target) onRootClick(target);
  };

  return (
    <section className="cs-left">
      {/* Featured auto-sliding banner */}
      <FeaturedSlider onWatchNow={handleWatchNow} />

      {/* Continue Watching — sits between slider and library */}
      {continueWatchingSlot}

      <AnimateIn variant="slide-left" delay={200}>
        <h2 className="cs-section-title" style={{ marginTop: 10 }}>
          Library
        </h2>
      </AnimateIn>

      <div className="cs-hero-list">
        {folders.map((root, idx) => (
          <AnimateIn
            key={root.id}
            variant="cinematic"
            delay={300 + idx * 200}
            duration={0.7}
          >
            <div
              className="cs-hero-card"
              onClick={() => onRootClick(root)}
            >
              <div className="cs-hero-image-wrap">
                {root.image && (
                  <img
                    src={root.image}
                    alt={root.title}
                    className="cs-hero-image"
                  />
                )}
                <div className="cs-hero-image-gradient" />
              </div>
              <div className="cs-hero-text">
                <h3 className="cs-hero-title">{root.title}</h3>
                <p className="cs-hero-subtitle">Categories</p>
                {root.downloadUrl && (
                  <a
                    href={root.downloadUrl}
                    className="cs-btn cs-btn-secondary cs-btn-small"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ⬇ Download
                  </a>
                )}
              </div>
            </div>
          </AnimateIn>
        ))}
      </div>
    </section>
  );
}
