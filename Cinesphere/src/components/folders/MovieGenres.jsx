import CenterZoom from "../common/CenterZoom";
import BackButton from "../common/BackButton";
import BigSkeletonCard from "../cards/BigSkeletonCard";

export default function MovieGenres({ rootTitle, genres, onGenreClick, onBack }) {
  return (
    <section className="cs-left cs-view-enter">
      <div className="cs-page-header">
        <BackButton onBack={onBack} />
        <h2 className="cs-section-title">
          {rootTitle}
          <span className="cs-section-subtitle"> Categories</span>
        </h2>
      </div>

      <div className="cs-big-list">
        {genres.length === 0
          ? Array.from({ length: 3 }).map((_, idx) => (
              <BigSkeletonCard key={idx} />
            ))
          : genres.map((g) => (
            <CenterZoom key={g.id}>
              <div
                className="cs-big-card"
                onClick={() => onGenreClick(g)}
              >
                <div className="cs-big-image-wrap">
                  {g.image ? (
                    <img
                      src={g.image}
                      alt={g.title}
                      className="cs-big-image"
                      loading="lazy"
                    />
                  ) : (
                    <div className="cs-big-image" style={{ background: "#222" }} />
                  )}
                  <div className="cs-big-gradient" />
                </div>
                <div className="cs-big-text">
                  <h3 className="cs-big-title">{g.title}</h3>
                  <p className="cs-big-subtitle">Movies</p>
                  <span className="cs-btn cs-btn-primary">View Collection</span>
                </div>
              </div>
            </CenterZoom>
          ))}
        </div>
      </section>
  );
}
