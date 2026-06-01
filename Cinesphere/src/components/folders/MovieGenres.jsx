import BackButton from "../common/BackButton";
import AnimateIn from "../common/AnimateIn";
import BigSkeletonCard from "../cards/BigSkeletonCard";

export default function MovieGenres({ rootTitle, genres, onGenreClick, onBack, loading }) {
  return (
      <section className="cs-left">
        <div className="cs-page-header">
          <BackButton onBack={onBack} />
          <h2 className="cs-section-title">
            {rootTitle}{" "}
            <span className="cs-section-subtitle">Categories</span>
          </h2>
        </div>

        <div className="cs-big-list">
          {loading && genres.length === 0
            ? Array.from({ length: 4 }).map((_, idx) => (
                <BigSkeletonCard key={idx} />
              ))
            : genres.map((g, idx) => (
            <AnimateIn key={g.id} variant="cinematic" delay={idx * 200} duration={0.7} threshold={0.08}>
              <div
                className="cs-big-card"
                onClick={() => onGenreClick(g)}
              >
                <div className="cs-big-image-wrap">
                  {g.image && (
                    <img
                      src={g.image}
                      alt={g.title}
                      className="cs-big-image"
                    />
                  )}
                  <div className="cs-big-gradient" />
                </div>

                <div className="cs-big-text">
                  <h3 className="cs-big-title">{g.title}</h3>
                  <p className="cs-big-subtitle">Movie category</p>

                  {g.downloadUrl && (
                    <a
                      href={g.downloadUrl}
                      className="cs-big-download"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ⬇ Download folder
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
