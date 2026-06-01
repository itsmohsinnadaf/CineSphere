// src/hooks/use3DTilt.js
import { useCallback } from "react";

export function use3DTilt({ maxTilt = 10, scale = 1.02 } = {}) {
  const onMouseMove = useCallback((e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    
    // Disable transition during movement so it tracks mouse instantly
    card.style.transition = 'none';
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
    card.style.zIndex = 10;
  }, [maxTilt, scale]);

  const onMouseLeave = useCallback((e) => {
    const card = e.currentTarget;
    // Enable transition for a smooth return to original state
    card.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    card.style.zIndex = 1;
  }, []);

  return { onMouseMove, onMouseLeave };
}
