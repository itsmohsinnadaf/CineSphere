// src/components/cards/EpisodeCard.jsx

export default function EpisodeCard({ episode, index, active, onClick }) {
  const episodeNumber = index + 1;

  return (
    <div
      className={`cs-item-card ${active ? "cs-item-card-active" : ""}`}
      onClick={onClick}
    >
      <div className="cs-item-image-wrapper">
        <img
          src={episode.image}
          alt={episode.title}
          className="cs-item-image"
        />
        <div className="cs-item-gradient" />
        <div className="cs-item-play-badge">▶ Play</div>
        <span className="cs-episode-chip">Ep {episodeNumber}</span>
      </div>
      <div className="cs-item-meta">
        <h3 className="cs-item-title">{episode.title}</h3>
        <p className="cs-item-details">{episode.type}</p>
        {episode.videoUrl && (
          <a
            href={episode.videoUrl}
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
