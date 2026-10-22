import { useEffect, useRef } from 'react';

type Particle = {
  glyph: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
};

export default function CursorNumberField({ className = 'cursor-number-field' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: -1000, y: -1000 };
    const particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(116, Math.max(44, Math.floor((width * height) / 12000)));
      particles.length = 0;
      for (let index = 0; index < count; index += 1) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        particles.push({
          glyph: String(Math.floor(Math.random() * 10)),
          x,
          y,
          vx: 0,
          vy: 0,
          size: 10 + Math.random() * 14,
          alpha: 0.09 + Math.random() * 0.12,
        });
      }
      if (reducedMotion) draw();
    };

    const movePointer = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        if (!reducedMotion) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.hypot(dx, dy) || 1;
          const radius = 135;
          if (distance < radius) {
            const force = ((radius - distance) / radius) * 1.55;
            particle.vx += (dx / distance) * force;
            particle.vy += (dy / distance) * force;
          }
          particle.vx += (Math.random() - 0.5) * 0.018;
          particle.vy += (Math.random() - 0.5) * 0.018;
          particle.vx = Math.max(-0.65, Math.min(0.65, particle.vx * 0.992));
          particle.vy = Math.max(-0.65, Math.min(0.65, particle.vy * 0.992));
          particle.x += particle.vx;
          particle.y += particle.vy;
          if (particle.x < -20) particle.x = width + 20;
          else if (particle.x > width + 20) particle.x = -20;
          if (particle.y < -20) particle.y = height + 20;
          else if (particle.y > height + 20) particle.y = -20;
        }

        const distance = Math.hypot(particle.x - pointer.x, particle.y - pointer.y);
        const glow = Math.max(0, 1 - distance / 150);
        context.font = `${particle.size}px "DM Mono", monospace`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = `rgba(119, 208, 255, ${particle.alpha + glow * 0.34})`;
        context.shadowColor = 'rgba(90, 185, 255, 0.75)';
        context.shadowBlur = glow * 14;
        context.fillText(particle.glyph, particle.x, particle.y);
      }
      context.shadowBlur = 0;
      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    };

    resize();
    if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', movePointer, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', movePointer);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
