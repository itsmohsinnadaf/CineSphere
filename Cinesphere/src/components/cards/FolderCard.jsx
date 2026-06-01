// src/components/cards/FolderCard.jsx

export default function FolderCard({
  title,
  subtitle,
  image,
  onClick,
  downloadUrl,
}) {
  return (
    <div className="cs-folder-card" onClick={onClick}>
      <div className="cs-folder-image-wrapper cs-folder-large">
        {image && <img src={image} alt={title} className="cs-folder-image" loading="lazy" decoding="async" />}
        <div className="cs-folder-overlay" />
        <span className="cs-folder-icon">📁</span>
      </div>
      <div className="cs-folder-info">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
        {downloadUrl && (
          <a
            href={downloadUrl}
            className="cs-download-pill"
            target="_blank"
            rel="noreferrer"
          >
            ⬇ Download
          </a>
        )}
      </div>
    </div>
  );
}
