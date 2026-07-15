import React, { useEffect, useRef } from 'react';
import './FourSeasonsSky.css';

// Animated four-seasons background: sky gradient + optional sun + seasonal
// particles (snow / spring petals / autumn wind + rain / clear summer).
// Auto-rotates every 6s. Ported from festivkids_four_seasons_sky_v4.html.
type SeasonKind = 'snow' | 'spring' | 'wind' | 'none';

interface Season {
  name: string;
  sky: string;
  kind: SeasonKind;
  sun: boolean;
}

const SEASONS: Season[] = [
  { name: 'Qış',   sky: 'linear-gradient(180deg,#7BA3CC 0%,#BCD3E8 100%)', kind: 'snow',   sun: false },
  { name: 'Bahar', sky: 'linear-gradient(180deg,#6FB5DE 0%,#C8E4B8 100%)', kind: 'spring', sun: false },
  { name: 'Yay',   sky: 'linear-gradient(180deg,#F4B860 0%,#FFE5B0 100%)', kind: 'none',   sun: true  },
  { name: 'Payız', sky: 'linear-gradient(180deg,#D97742 0%,#F0B080 100%)', kind: 'wind',   sun: false },
];

const AUTO_MS = 6000;

const FourSeasonsSky: React.FC = () => {
  const skyRef = useRef<HTMLDivElement | null>(null);
  const sunRef = useRef<HTMLDivElement | null>(null);
  const raysRef = useRef<HTMLDivElement | null>(null);
  const raysRevRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<HTMLDivElement | null>(null);

  // Build the sun rays once. The ray divs are static; only the sun-wrap
  // toggles `.on` when summer becomes active.
  useEffect(() => {
    const rays = raysRef.current;
    const rays2 = raysRevRef.current;
    if (!rays || !rays2) return;

    for (let i = 0; i < 12; i++) {
      const r = document.createElement('div');
      r.className = 'fk-ray';
      r.style.transform = `rotate(${i * 30}deg)`;
      r.style.animationDelay = `${Math.random() * 2.2}s`;
      rays.appendChild(r);
    }
    for (let i = 0; i < 12; i++) {
      const r = document.createElement('div');
      r.className = 'fk-ray short';
      r.style.transform = `rotate(${i * 30 + 15}deg)`;
      r.style.animationDelay = `${Math.random() * 1.6}s`;
      rays2.appendChild(r);
    }
  }, []);

  // Drive the season cycle: switch every 6s, spawn per-season particles.
  useEffect(() => {
    const sky = skyRef.current;
    const sun = sunRef.current;
    const particles = particlesRef.current;
    if (!sky || !sun || !particles) return;

    const spawn = (kind: SeasonKind) => {
      particles.innerHTML = '';
      if (kind === 'none') return;

      if (kind === 'snow') {
        for (let i = 0; i < 45; i++) {
          const el = document.createElement('div');
          el.className = 'fk-flake';
          el.textContent = '❄';
          el.style.left = `${Math.random() * 100}%`;
          const dur = 4 + Math.random() * 5;
          el.style.fontSize = `${10 + Math.random() * 12}px`;
          el.style.animationDuration = `${dur}s`;
          el.style.animationDelay = `${-Math.random() * dur}s`;
          particles.appendChild(el);
        }
      } else if (kind === 'spring') {
        const colors = ['#F5E6A8', '#FFD96B', '#F8C8A0', '#F4A5C0'];
        for (let i = 0; i < 30; i++) {
          const el = document.createElement('div');
          el.className = 'fk-petal';
          el.style.background = colors[Math.floor(Math.random() * colors.length)];
          el.style.left = `${Math.random() * 100}%`;
          const dur = 5 + Math.random() * 4;
          el.style.animationDuration = `${dur}s`;
          el.style.animationDelay = `${-Math.random() * dur}s`;
          const size = 8 + Math.random() * 6;
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          particles.appendChild(el);
        }
      } else if (kind === 'wind') {
        const leafColors = ['#C75D2C', '#E08A3C', '#B8451F', '#D97742'];
        for (let i = 0; i < 40; i++) {
          const el = document.createElement('div');
          const isLeaf = Math.random() >= 0.7;
          if (isLeaf) {
            el.className = 'fk-leaf';
            el.style.background = leafColors[Math.floor(Math.random() * leafColors.length)];
          } else {
            el.className = 'fk-drop';
          }
          el.style.left = `${Math.random() * 100}%`;
          const dur = isLeaf ? 3 + Math.random() * 2 : 1 + Math.random() * 1.2;
          el.style.animationDuration = `${dur}s`;
          el.style.animationDelay = `${-Math.random() * dur}s`;
          particles.appendChild(el);
        }
      }
    };

    const apply = (i: number) => {
      const s = SEASONS[i];
      sky.style.background = s.sky;
      sun.classList.toggle('on', s.sun);
      spawn(s.kind);
    };

    let current = 0;
    apply(current);
    const timer = window.setInterval(() => {
      current = (current + 1) % SEASONS.length;
      apply(current);
    }, AUTO_MS);

    return () => {
      window.clearInterval(timer);
      particles.innerHTML = '';
    };
  }, []);

  return (
    <div className="fk-season-stage" aria-hidden="true">
      <div className="fk-sky" ref={skyRef} />
      <div className="fk-sun-wrap" ref={sunRef}>
        <div className="fk-sun-rays" ref={raysRef} />
        <div className="fk-sun-rays-2" ref={raysRevRef} />
        <div className="fk-sun-core" />
      </div>
      <div className="fk-particles" ref={particlesRef} />
    </div>
  );
};

export default FourSeasonsSky;
