// src/components/folders/RootFolders.jsx

export default function RootFolders({ folders, loading, error, onRootClick }) {
  if (loading && !folders.length) {
    return (
      <section className="cs-left">
        <h2 className="cs-section-title">Library</h2>
        <p className="cs-section-subtitle">Loading from OneDrive...</p>
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
      <h2 className="cs-section-title">Library</h2>
      <div className="cs-hero-list">
        {folders.map((root) => (
          <div
            key={root.id}
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
        ))}
      </div>
    </section>
  );
}
