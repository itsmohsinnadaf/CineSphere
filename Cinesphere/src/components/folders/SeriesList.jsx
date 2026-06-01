// src/components/folders/SeriesList.jsx
import AnimateIn from "../common/AnimateIn";
import BigSkeletonCard from "../cards/BigSkeletonCard";

export default function SeriesList({ rootTitle, series, onSeriesClick, loading }) {
  return (
    <section className="cs-left">
      <div className="cs-big-list">
        {loading && series.length === 0
          ? Array.from({ length: 4 }).map((_, idx) => (
              <BigSkeletonCard key={idx} />
            ))
          : series.map((s, idx) => (
          <AnimateIn key={s.id} variant="cinematic" delay={idx * 200} duration={0.7} threshold={0.08}>
            <div
              className="cs-big-card"
              onClick={() => onSeriesClick(s)}
            >
              {/* LEFT IMAGE SIDE */}
              <div className="cs-big-image-wrap">
                {s.image && (
                  <img src={s.image} alt={s.title} className="cs-big-image" loading="lazy" decoding="async" />
                )}
                <div className="cs-big-gradient" />
              </div>

              {/* RIGHT TEXT + DOWNLOAD BUTTON */}
              <div className="cs-big-text">
                <h3 className="cs-big-title">{s.title}</h3>
                <p className="cs-big-subtitle">TV Series</p>

                {s.path && (
                  <button
                    className="cs-btn cs-btn-primary cs-btn-large"
                    style={{
                      marginTop: "24px",
                      alignSelf: "flex-end",
                    }}
                    onClick={async (e) => {
                      // don't trigger card click when pressing download
                      e.stopPropagation();
                      try {
                        const api = await import("../../api/api");
                        api.downloadFolder(
                          s.path,
                          (s.name || s.title || "series").replace(/\s+/g, "-")
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
          </AnimateIn>
        ))}
      </div>
    </section>
  );
}
