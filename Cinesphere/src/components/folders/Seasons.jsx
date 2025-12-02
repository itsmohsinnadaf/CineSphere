// src/components/folders/Seasons.jsx

export default function Seasons({ seriesTitle, seasons, onSeasonClick }) {
  return (
    <section className="cs-left">
      <h2 className="cs-section-title">
        {seriesTitle} <span className="cs-section-subtitle">Seasons</span>
      </h2>

      <div className="cs-big-list">
        {seasons.map((s) => (
          <div
            key={s.id}
            className="cs-big-card"
            onClick={() => onSeasonClick(s)}
          >
            {/* LEFT IMAGE SIDE */}
            <div className="cs-big-image-wrap">
              {s.image && (
                <img src={s.image} alt={s.title} className="cs-big-image" />
              )}
              <div className="cs-big-gradient" />
            </div>

            {/* RIGHT TEXT + DOWNLOAD BUTTON */}
            <div className="cs-big-text">
              <h3 className="cs-big-title">{s.title}</h3>
              <p className="cs-big-subtitle">Season</p>

              {s.path && (
                <button
                  className="cs-btn cs-btn-primary cs-btn-large"
                  style={{
                    marginTop: "24px",
                    alignSelf: "flex-end",
                  }}
                  onClick={async (e) => {
                    // don’t trigger card click when pressing download
                    e.stopPropagation();
                    try {
                      const api = await import("../../api/api");
                      api.downloadFolder(
                        s.path,
                        (s.name || s.title || "season").replace(/\s+/g, "-")
                      );
                    } catch (err) {
                      console.error(err);
                      alert("Download failed");
                    }
                  }}
                >
                  ⬇ Download
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
