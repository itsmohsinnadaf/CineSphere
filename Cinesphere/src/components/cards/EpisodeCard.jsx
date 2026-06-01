// src/components/cards/EpisodeCard.jsx
import { use3DTilt } from "../../hooks/use3DTilt";

export default function EpisodeCard({ episode, index, active, onClick }) {
  const tiltProps = use3DTilt();
  const episodeNumber = index + 1;

  return (
    <div
      className={`cs-item-card ${active ? "cs-item-card-active" : ""}`}
      onClick={onClick}
      {...tiltProps}
    >
      <div className="cs-item-image-wrapper">
        <img
          src={episode.image}
          alt={episode.title}
          className="cs-item-image"
          loading="lazy"
          decoding="async"
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
