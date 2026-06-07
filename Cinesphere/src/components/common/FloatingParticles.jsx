// src/components/common/FloatingParticles.jsx
// Ambient floating particles that drift across the background.
// Particle data is generated once at module level to satisfy React purity rules.

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  size: 2 + Math.random() * 4,
  x: Math.random() * 100,
  y: Math.random() * 100,
  delay: Math.random() * 8,
  duration: 12 + Math.random() * 10,
  opacity: 0.08 + Math.random() * 0.15,
}));

export default function FloatingParticles() {
  return (
    <div className="cs-floating-particles" aria-hidden="true">
      {PARTICLES.map((p) => (
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
