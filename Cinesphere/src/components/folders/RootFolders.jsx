// src/components/folders/RootFolders.jsx
import AnimateIn from "../common/AnimateIn";
import FeaturedSlider from "../common/FeaturedSlider";
import BigSkeletonCard from "../cards/BigSkeletonCard";
import ProgressiveImage from "../common/ProgressiveImage";

export default function RootFolders({ folders, loading, error, onRootClick, continueWatchingSlot, onWatchNow }) {
  if (loading && !folders.length) {
    return (
      <section className="cs-left">
        <FeaturedSlider onWatchNow={onWatchNow} />
        {continueWatchingSlot}
        <h2 className="cs-section-title" style={{ marginTop: 10 }}>Library</h2>
        <div className="cs-hero-list">
          {Array.from({ length: 3 }).map((_, idx) => (
            <BigSkeletonCard key={idx} />
          ))}
        </div>
      </section>
    );
  }

  if (error && !folders.length) {
    return (
      <section className="cs-left">
        <h2 className="cs-section-title">Library</h2>
        <p className="cs-section-subtitle">Error: {error}</p>
      </section>
    );
  }

  return (
    <section className="cs-left">
      {/* Featured auto-sliding banner */}
      <FeaturedSlider onWatchNow={onWatchNow} />

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
                  <ProgressiveImage
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
