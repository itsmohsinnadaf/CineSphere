// src/components/common/HeroWelcome.jsx
// Cinematic welcome section with animated gradient text.

import AnimateIn from "./AnimateIn";

export default function HeroWelcome() {
  return (
    <div className="cs-hero-welcome">
      <AnimateIn variant="fade-scale" duration={0.8}>
        <h1 className="cs-welcome-heading">
          <span className="cs-welcome-line1">Your Personal</span>
          <span className="cs-welcome-line2">Cinema</span>
        </h1>
      </AnimateIn>
      <AnimateIn variant="fade-up" delay={300} duration={0.7}>
        <p className="cs-welcome-tagline">
          Stream movies & series from your private collection
        </p>
      </AnimateIn>
      <AnimateIn variant="fade-up" delay={500} duration={0.6}>
        <div className="cs-welcome-divider" />
      </AnimateIn>
    </div>
  );
}
