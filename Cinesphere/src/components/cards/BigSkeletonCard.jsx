// src/components/cards/BigSkeletonCard.jsx

export default function BigSkeletonCard() {
  return (
    <div className="cs-big-card cs-skeleton-card" style={{ pointerEvents: "none" }}>
      <div className="cs-big-image-wrap cs-skeleton-pulse" />
      <div className="cs-big-text">
        <div className="cs-skeleton-text cs-skeleton-pulse" style={{ width: "60%", height: "28px", marginBottom: "12px", borderRadius: "6px" }} />
        <div className="cs-skeleton-text cs-skeleton-pulse" style={{ width: "40%", height: "18px", borderRadius: "4px" }} />
        <div className="cs-skeleton-text cs-skeleton-pulse" style={{ width: "160px", height: "48px", marginTop: "24px", alignSelf: "flex-end", borderRadius: "24px" }} />
      </div>
    </div>
  );
}
