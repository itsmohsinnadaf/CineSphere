// src/components/cards/SkeletonCard.jsx

export default function SkeletonCard({ type = "movie" }) {
  // Use slightly different dimensions for folder vs movie vs episode
  // But generally, they follow the .cs-item-card or .cs-folder-card shape
  
  const baseClass = type === "folder" ? "cs-folder-card cs-skeleton-card" : "cs-item-card cs-skeleton-card";
  const imageClass = type === "folder" ? "cs-folder-image-wrapper cs-folder-large cs-skeleton-pulse" : "cs-item-image-wrapper cs-skeleton-pulse";

  return (
    <div className={baseClass}>
      <div className={imageClass} />
      <div className={type === "folder" ? "cs-folder-info" : "cs-item-meta"}>
        <div className="cs-skeleton-text cs-skeleton-pulse" style={{ width: "80%", height: "20px", marginBottom: "8px", borderRadius: "4px" }} />
        <div className="cs-skeleton-text cs-skeleton-pulse" style={{ width: "40%", height: "14px", borderRadius: "4px" }} />
      </div>
    </div>
  );
}
