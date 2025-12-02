// src/components/cards/MovieCard.jsx

export default function MovieCard({ movie, active, onClick }) {
  return (
    <div
      className={`cs-item-card ${active ? "cs-item-card-active" : ""}`}
      onClick={onClick}
    >
      <div className="cs-item-image-wrapper">
        <img src={movie.image} alt={movie.title} className="cs-item-image" />
        <div className="cs-item-gradient" />
        <div className="cs-item-play-badge">▶ Play</div>
      </div>
      <div className="cs-item-meta">
        <h3 className="cs-item-title">{movie.title}</h3>
        <p className="cs-item-details">{movie.type}</p>
        {movie.videoUrl && (
          <a
            href={movie.videoUrl}
            className="cs-download-link"
            target="_blank"
            rel="noreferrer"
            download
          >
            ⬇ Download
          </a>
        )}
      </div>
    </div>
  );
}
