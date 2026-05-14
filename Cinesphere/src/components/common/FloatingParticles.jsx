// src/components/common/FloatingParticles.jsx
// Ambient floating particles that drift across the background.

export default function FloatingParticles() {
  // 12 particles with randomized positions and sizes
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 4,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 12 + Math.random() * 10,
    opacity: 0.08 + Math.random() * 0.15,
  }));

  return (
    <div className="cs-floating-particles" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="cs-fp"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}
