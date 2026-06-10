// src/components/folders/Seasons.jsx
import CenterZoom from "../common/CenterZoom";
import BigSkeletonCard from "../cards/BigSkeletonCard";

export default function Seasons({ seasons, onSeasonClick, loading }) {
  return (
    <section className="cs-left">
      <div className="cs-big-list">
        {loading && seasons.length === 0
          ? Array.from({ length: 4 }).map((_, idx) => (
              <BigSkeletonCard key={idx} />
            ))
          : seasons.map((s) => (
          <CenterZoom key={s.id}>
            <div
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
                      // don't trigger card click when pressing download
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
          </CenterZoom>
        ))}
      </div>
    </section>
  );
}
