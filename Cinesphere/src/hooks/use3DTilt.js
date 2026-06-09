import { useCallback } from "react";

export function use3DTilt({ maxTilt = 10, scale = 1 } = {}) {
  const onMouseMove = useCallback((e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    requestAnimationFrame(() => {
      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;
      card.style.setProperty('--tilt-transition', '0.15s cubic-bezier(0.25, 1, 0.5, 1)');
      card.style.setProperty('--rotate-x', `${rotateX}deg`);
      card.style.setProperty('--rotate-y', `${rotateY}deg`);
      if (scale !== 1) card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
    });
  }, [maxTilt, scale]);

  const onMouseLeave = useCallback((e) => {
    const card = e.currentTarget;
    requestAnimationFrame(() => {
      card.style.setProperty('--tilt-transition', '0.8s cubic-bezier(0.16, 1, 0.3, 1)');
      card.style.setProperty('--rotate-x', `0deg`);
      card.style.setProperty('--rotate-y', `0deg`);
      if (scale !== 1) card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
    });
  }, [scale]);

  return { onMouseMove, onMouseLeave };
}
