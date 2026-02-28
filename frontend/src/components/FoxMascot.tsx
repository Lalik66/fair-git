import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './FoxMascot.css';

interface FoxMascotProps {
  isFairActive?: boolean;
}

type ScrollPhase = 'hidden' | 'peek' | 'reveal' | 'balloon' | 'exit';
type Emotion = 'happy' | 'surprised' | 'cool' | 'sleepy';

const PET_STORAGE_KEY = 'foxie-pet-count';
const SPECIAL_PET_THRESHOLD = 5;

function getEmotion(isFairActive: boolean, isFirstScroll: boolean): Emotion {
  if (isFairActive) return 'cool';
  if (isFirstScroll) return 'surprised';
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) return 'sleepy';
  return 'happy';
}

function getSeason(isFairActive: boolean): 'halloween' | 'christmas' | 'spring' | 'fair' | null {
  if (isFairActive) return 'fair';
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (month === 10) return 'halloween';
  if (month === 12 && day <= 26) return 'christmas';
  if ((month === 3 && day >= 20) || (month > 3 && month < 6) || (month === 6 && day <= 20)) return 'spring';
  return null;
}

function getMouthPath(emotion: Emotion): string {
  switch (emotion) {
    case 'happy': return 'M88 122 Q100 134 112 122';
    case 'cool': return 'M90 123 Q100 130 110 126';
    case 'sleepy': return 'M93 124 Q100 127 107 124';
    case 'surprised': return 'M92 124 Q100 128 108 124';
    default: return 'M88 122 Q100 134 112 122';
  }
}

const CONFETTI_COLORS = [
  'var(--color-warm-yellow, #FFD166)',
  'var(--color-coral, #FF6B6B)',
  'var(--color-sky-blue, #06BEE1)',
  'var(--color-soft-purple, #A78BFA)',
];

const FoxMascot: React.FC<FoxMascotProps> = ({ isFairActive = false }) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<ScrollPhase>('hidden');
  const [emotion, setEmotion] = useState<Emotion>(() => getEmotion(isFairActive, false));
  const [speechText, setSpeechText] = useState('');
  const [showSpeech, setShowSpeech] = useState(false);
  const [pulseBubble, setPulseBubble] = useState(false);
  const [clickBounce, setClickBounce] = useState(false);
  const [specialDance, setSpecialDance] = useState(false);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [confetti, setConfetti] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const lastPhaseRef = useRef<ScrollPhase>('hidden');
  const sparkleIdRef = useRef(0);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const season = getSeason(isFairActive);

  const revealMessages = [
    t('foxMascot.speech.dontMiss', "Don't miss the Fair!"),
    t('foxMascot.speech.explore', "Let's explore!"),
    t('foxMascot.speech.amazing', 'Something amazing is waiting... 👀'),
  ];

  const balloonMessage = t('foxMascot.speech.marketplace', "Let's explore the marketplace!");

  const clickMessages = [
    t('foxMascot.click.foundMe', 'Yay! You found me! 🎉'),
    t('foxMascot.click.again', 'Click me again... if you dare 😏'),
    t('foxMascot.click.love', "You're going to love what's inside!"),
  ];

  const specialMessage = t('foxMascot.click.special', 'Okay okay, I like you 🦊💛');

  const getScrollProgress = useCallback(() => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return 0;
    return Math.min(1, Math.max(0, window.scrollY / scrollHeight));
  }, []);

  const spawnSparkles = useCallback((count: number) => {
    if (prefersReducedMotion.current) return;
    const newSparkles = Array.from({ length: count }, () => {
      sparkleIdRef.current += 1;
      return {
        id: sparkleIdRef.current,
        x: Math.random() * 80 - 40,
        y: -(Math.random() * 60 + 20),
      };
    });
    setSparkles(prev => [...prev.slice(-8), ...newSparkles]);
    setTimeout(() => {
      setSparkles(prev => prev.filter(s => !newSparkles.find(n => n.id === s.id)));
    }, 1600);
  }, []);

  const spawnConfetti = useCallback(() => {
    if (prefersReducedMotion.current) return;
    const count = 8 + Math.floor(Math.random() * 5);
    const newConfetti = Array.from({ length: count }, () => {
      sparkleIdRef.current += 1;
      return {
        id: sparkleIdRef.current,
        x: Math.random() * 120 - 60,
        y: -(Math.random() * 80 + 30),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      };
    });
    setConfetti(prev => [...prev.slice(-5), ...newConfetti]);
    setTimeout(() => {
      setConfetti(prev => prev.filter(c => !newConfetti.find(n => n.id === c.id)));
    }, 900);
  }, []);

  useEffect(() => {
    let throttleTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
        animFrameRef.current = requestAnimationFrame(() => {
          const progress = getScrollProgress();

          if (!hasScrolledRef.current && progress > 0.02) {
            hasScrolledRef.current = true;
            setEmotion(getEmotion(isFairActive, true));
            setTimeout(() => setEmotion(getEmotion(isFairActive, false)), 2500);
          }

          let newPhase: ScrollPhase;
          if (progress < 0.02) newPhase = 'hidden';
          else if (progress < 0.15) newPhase = 'peek';
          else if (progress < 0.35) newPhase = 'reveal';
          else if (progress < 0.85) newPhase = 'balloon';
          else newPhase = 'exit';

          if (newPhase !== lastPhaseRef.current) {
            lastPhaseRef.current = newPhase;
            setPhase(newPhase);

            if (newPhase === 'reveal') {
              const msg = revealMessages[Math.floor(Math.random() * revealMessages.length)];
              setSpeechText(msg);
              setShowSpeech(true);
              setPulseBubble(false);
              spawnSparkles(6);
            } else if (newPhase === 'balloon') {
              setSpeechText(balloonMessage);
              setShowSpeech(true);
              setPulseBubble(true);
            } else if (newPhase === 'exit') {
              setShowSpeech(false);
              spawnSparkles(4);
            } else if (newPhase === 'peek') {
              setShowSpeech(false);
            } else {
              setShowSpeech(false);
            }
          }
        });
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (throttleTimeout) clearTimeout(throttleTimeout);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isFairActive, getScrollProgress, spawnSparkles, balloonMessage, revealMessages]);

  const handleClick = useCallback(() => {
    if (prefersReducedMotion.current) return;

    const stored = parseInt(localStorage.getItem(PET_STORAGE_KEY) || '0', 10);
    const newCount = stored + 1;
    localStorage.setItem(PET_STORAGE_KEY, String(newCount));

    if (navigator.vibrate) navigator.vibrate(50);

    setClickBounce(true);
    setTimeout(() => setClickBounce(false), 350);

    spawnConfetti();

    if (newCount >= SPECIAL_PET_THRESHOLD && newCount % SPECIAL_PET_THRESHOLD === 0) {
      setSpeechText(specialMessage);
      setShowSpeech(true);
      setSpecialDance(true);
      setTimeout(() => setSpecialDance(false), 1300);
    } else {
      const msg = clickMessages[Math.floor(Math.random() * clickMessages.length)];
      setSpeechText(msg);
      setShowSpeech(true);
    }

    setTimeout(() => {
      if (phase === 'reveal') {
        const msg = revealMessages[Math.floor(Math.random() * revealMessages.length)];
        setSpeechText(msg);
      } else if (phase === 'balloon') {
        setSpeechText(balloonMessage);
      } else {
        setShowSpeech(false);
      }
    }, 3000);
  }, [phase, spawnConfetti, specialMessage, clickMessages, revealMessages, balloonMessage]);

  const phaseClass = `phase-${phase}`;
  const wagTail = phase === 'reveal' || phase === 'balloon';
  const waveArm = phase === 'exit';
  const showBalloonSvg = phase === 'balloon';
  const showSurprisedMouth = emotion === 'surprised';
  const mouthPath = getMouthPath(emotion);

  const classNames = [
    'fox-mascot',
    phaseClass,
    wagTail ? 'wag-tail' : '',
    waveArm ? 'wave-arm' : '',
    clickBounce ? 'click-bounce' : '',
    specialDance ? 'special-dance' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={containerRef}
      className={classNames}
      onClick={handleClick}
      role="img"
      aria-label={t('foxMascot.ariaLabel', 'Foxie the fox mascot')}
    >
      {/* Speech Bubble */}
      <div
        className={`fox-speech-bubble ${showSpeech ? 'visible' : ''} ${pulseBubble ? 'pulse-border' : ''}`}
        aria-live="polite"
      >
        {speechText}
      </div>

      {/* Sparkles */}
      {sparkles.map(s => (
        <span
          key={s.id}
          className="fox-sparkle"
          style={{
            left: '50%',
            bottom: '50%',
            '--sparkle-x': `${s.x}px`,
            '--sparkle-y': `${s.y}px`,
          } as React.CSSProperties}
        >
          ✨
        </span>
      ))}

      {/* Confetti */}
      {confetti.map(c => (
        <span
          key={c.id}
          className="fox-confetti"
          style={{
            left: '50%',
            bottom: '50%',
            background: c.color,
            '--confetti-x': `${c.x}px`,
            '--confetti-y': `${c.y}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* Foxie SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={showBalloonSvg ? '0 -80 200 320' : '0 0 200 240'}
        role="img"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="fm-tailGrad" cx="75%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#FFF0DC"/>
            <stop offset="100%" stopColor="#FFD4A8"/>
          </radialGradient>
          <radialGradient id="fm-bodyGrad" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FF7D4A"/>
            <stop offset="100%" stopColor="#D94F1A"/>
          </radialGradient>
          <radialGradient id="fm-headGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FF7D4A"/>
            <stop offset="100%" stopColor="#D94F1A"/>
          </radialGradient>
        </defs>

        {/* Balloon (Phase 3 only) */}
        {showBalloonSvg && (
          <g className="fox-balloon-group" style={{ display: 'block' }}>
            <g className="fox-balloon-sway">
              <line x1="100" y1="60" x2="100" y2="-10" stroke="#718096" strokeWidth="1.5" />
              <ellipse cx="100" cy="-35" rx="30" ry="38" fill="url(#fm-balloon-grad)" />
              <defs>
                <linearGradient id="fm-balloon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-coral, #FF6B6B)" />
                  <stop offset="100%" stopColor="var(--color-warm-yellow, #FFD166)" />
                </linearGradient>
              </defs>
              <ellipse cx="92" cy="-45" rx="8" ry="12" fill="white" opacity="0.2" />
              <polygon points="92,-2 100,2 108,-2" fill="var(--color-coral, #FF6B6B)" />
            </g>
          </g>
        )}

        {/* Shadow */}
        <ellipse cx="100" cy="232" rx="52" ry="7" fill="#D94F1A" opacity="0.18" />

        {/* Tail */}
        <g className="fox-tail-group" style={{ transformOrigin: '62px 185px' }}>
          <path d="M62 185 C30 175,5 155,12 128 C18 105,42 100,55 112 C65 122,62 140,58 155 C54 168,56 178,62 185Z" fill="url(#fm-tailGrad)" stroke="#FF6B35" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M62 185 C38 177,18 158,24 133 C29 112,48 108,58 118 C67 127,63 143,60 158 C57 170,59 180,62 185Z" fill="#FF6B35" />
          <ellipse cx="20" cy="122" rx="14" ry="18" transform="rotate(-20 20 122)" fill="#FFF0DC" />
          <ellipse cx="22" cy="124" rx="9" ry="12" transform="rotate(-20 22 124)" fill="white" />
        </g>

        {/* Body */}
        <ellipse cx="100" cy="175" rx="42" ry="48" fill="url(#fm-bodyGrad)" />
        <ellipse cx="100" cy="185" rx="26" ry="32" fill="#FFF0DC" />

        {/* Arms */}
        <g>
          <ellipse cx="68" cy="175" rx="14" ry="10" transform="rotate(30 68 175)" fill="#FF6B35" />
          <ellipse cx="60" cy="183" rx="10" ry="8" fill="#FF6B35" />
          <ellipse cx="57" cy="184" rx="4" ry="3" fill="#D94F1A" opacity="0.4" />
          <ellipse cx="61" cy="187" rx="4" ry="3" fill="#D94F1A" opacity="0.4" />
          <ellipse cx="65" cy="184" rx="4" ry="3" fill="#D94F1A" opacity="0.4" />
        </g>
        <g className="fox-arm-right-group" style={{ transformOrigin: '132px 148px' }}>
          <ellipse cx="133" cy="175" rx="14" ry="10" transform="rotate(-30 133 175)" fill="#FF6B35" />
          <ellipse cx="141" cy="183" rx="10" ry="8" fill="#FF6B35" />
          <ellipse cx="138" cy="184" rx="4" ry="3" fill="#D94F1A" opacity="0.4" />
          <ellipse cx="142" cy="187" rx="4" ry="3" fill="#D94F1A" opacity="0.4" />
          <ellipse cx="146" cy="184" rx="4" ry="3" fill="#D94F1A" opacity="0.4" />
        </g>

        {/* Head */}
        <ellipse cx="100" cy="105" rx="52" ry="50" fill="url(#fm-headGrad)" />

        {/* Ears */}
        <g className="fox-ear-group">
          <g style={{ transformOrigin: '70px 62px' }}>
            <polygon points="58,68 44,28 82,58" fill="#FF6B35" />
            <polygon points="62,65 52,36 76,58" fill="#FFB38A" />
          </g>
          <g style={{ transformOrigin: '130px 62px' }}>
            <polygon points="142,68 156,28 118,58" fill="#FF6B35" />
            <polygon points="138,65 148,36 124,58" fill="#FFB38A" />
          </g>
        </g>

        {/* Markings */}
        <ellipse cx="100" cy="118" rx="30" ry="24" fill="#FFF0DC" />
        <path d="M80 80 Q100 70 120 80 Q112 95 100 92 Q88 95 80 80Z" fill="#FFF0DC" opacity="0.6" />

        {/* Eyes — Happy */}
        {emotion === 'happy' && (
          <g>
            <ellipse cx="82" cy="100" rx="9" ry="10" fill="white" />
            <circle cx="83" cy="101" r="6" fill="#1E1206" />
            <circle cx="85" cy="98" r="2" fill="white" />
            <ellipse cx="118" cy="100" rx="9" ry="10" fill="white" />
            <circle cx="119" cy="101" r="6" fill="#1E1206" />
            <circle cx="121" cy="98" r="2" fill="white" />
            <path d="M74 91 Q82 86 90 91" stroke="#D94F1A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M110 91 Q118 86 126 91" stroke="#D94F1A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* Eyes — Cool (sunglasses) */}
        {emotion === 'cool' && (
          <g>
            <rect x="68" y="93" width="26" height="18" rx="9" fill="#1A1A2E" />
            <rect x="106" y="93" width="26" height="18" rx="9" fill="#1A1A2E" />
            <rect x="94" y="99" width="12" height="4" rx="2" fill="#1A1A2E" />
            <rect x="48" y="98" width="20" height="4" rx="2" fill="#1A1A2E" />
            <rect x="132" y="98" width="20" height="4" rx="2" fill="#1A1A2E" />
            <ellipse cx="78" cy="98" rx="7" ry="4" fill="white" opacity="0.18" />
            <ellipse cx="116" cy="98" rx="7" ry="4" fill="white" opacity="0.18" />
          </g>
        )}

        {/* Eyes — Sleepy */}
        {emotion === 'sleepy' && (
          <g>
            <ellipse cx="82" cy="102" rx="9" ry="7" fill="white" />
            <ellipse cx="82" cy="98" rx="9" ry="5" fill="#FF6B35" />
            <ellipse cx="83" cy="103" rx="4" ry="4" fill="#1E1206" />
            <ellipse cx="118" cy="102" rx="9" ry="7" fill="white" />
            <ellipse cx="118" cy="98" rx="9" ry="5" fill="#FF6B35" />
            <ellipse cx="119" cy="103" rx="4" ry="4" fill="#1E1206" />
            <path d="M74 95 Q82 93 90 95" stroke="#D94F1A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M110 95 Q118 93 126 95" stroke="#D94F1A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <text x="128" y="76" fontFamily="sans-serif" fontWeight="bold" fontSize="9" fill="#B0B0CC">z</text>
            <text x="136" y="66" fontFamily="sans-serif" fontWeight="bold" fontSize="12" fill="#B0B0CC">z</text>
            <text x="145" y="54" fontFamily="sans-serif" fontWeight="bold" fontSize="16" fill="#B0B0CC">Z</text>
          </g>
        )}

        {/* Eyes — Surprised */}
        {emotion === 'surprised' && (
          <g>
            <ellipse cx="82" cy="99" rx="11" ry="13" fill="white" />
            <circle cx="83" cy="101" r="7" fill="#1E1206" />
            <circle cx="85" cy="98" r="2.5" fill="white" />
            <ellipse cx="118" cy="99" rx="11" ry="13" fill="white" />
            <circle cx="119" cy="101" r="7" fill="#1E1206" />
            <circle cx="121" cy="98" r="2.5" fill="white" />
            <path d="M72 85 Q82 79 92 85" stroke="#D94F1A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M108 85 Q118 79 128 85" stroke="#D94F1A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* Nose */}
        <ellipse cx="100" cy="114" rx="7" ry="5" fill="#1E1206" />
        <ellipse cx="98" cy="112" rx="2.5" ry="1.5" fill="white" opacity="0.4" />

        {/* Mouth */}
        {showSurprisedMouth ? (
          <g>
            <ellipse cx="100" cy="127" rx="9" ry="11" fill="#1E1206" />
            <ellipse cx="100" cy="128" rx="6" ry="7" fill="#C93558" />
          </g>
        ) : (
          <path d={mouthPath} stroke="#D94F1A" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        )}

        {/* Cheeks */}
        <ellipse cx="68" cy="118" rx="12" ry="8" fill="rgba(255,140,90,0.45)" />
        <ellipse cx="132" cy="118" rx="12" ry="8" fill="rgba(255,140,90,0.45)" />

        {/* Seasonal Costumes */}
        {season === 'halloween' && (
          <g>
            <rect x="96" y="42" width="8" height="14" rx="3" fill="#4A6741" />
            <ellipse cx="100" cy="62" rx="34" ry="24" fill="#FF6800" />
            <path d="M68 62 Q76 46 84 62 Q76 78 68 62Z" fill="#E85500" opacity="0.5" />
            <path d="M84 62 Q92 44 100 62 Q92 80 84 62Z" fill="#E85500" opacity="0.4" />
            <path d="M100 62 Q108 44 116 62 Q108 80 100 62Z" fill="#E85500" opacity="0.4" />
            <path d="M116 62 Q124 46 132 62 Q124 78 116 62Z" fill="#E85500" opacity="0.5" />
            <polygon points="82,58 86,52 90,58" fill="#1A0A00" />
            <polygon points="110,58 114,52 118,58" fill="#1A0A00" />
            <path d="M86 66 L90 62 L94 66 L98 62 L102 66 L106 62 L110 66 L114 62 L118 66" stroke="#1A0A00" strokeWidth="2" fill="none" strokeLinejoin="round" />
          </g>
        )}

        {season === 'christmas' && (
          <g>
            <polygon points="70,68 100,10 130,68" fill="#CC2200" />
            <ellipse cx="100" cy="68" rx="32" ry="8" fill="white" />
            <circle cx="100" cy="10" r="8" fill="white" />
            <line x1="78" y1="54" x2="122" y2="54" stroke="#FF4422" strokeWidth="3" opacity="0.5" />
            <rect x="66" y="148" width="68" height="14" rx="7" fill="#CC2200" />
            <rect x="68" y="156" width="16" height="28" rx="6" fill="#CC2200" />
            <rect x="68" y="178" width="16" height="8" rx="3" fill="#AA1800" />
            <rect x="66" y="153" width="68" height="3" rx="1.5" fill="#FF4422" opacity="0.6" />
            <circle cx="92" cy="184" r="5" fill="#FFD700" />
            <rect x="90" y="178" width="4" height="5" rx="1" fill="#B8A000" />
          </g>
        )}

        {season === 'spring' && (
          <g>
            <path d="M58 68 Q100 56 142 68" stroke="#7DB87D" strokeWidth="5" strokeLinecap="round" fill="none" />
            <circle cx="62" cy="67" r="7" fill="#FF9EC0" />
            <circle cx="62" cy="67" r="3" fill="#FFD166" />
            <circle cx="56" cy="64" r="5" fill="#FFB8D0" />
            <circle cx="68" cy="64" r="5" fill="#FFB8D0" />
            <circle cx="82" cy="60" r="8" fill="#FF6BA8" />
            <circle cx="82" cy="60" r="3.5" fill="#FFD166" />
            <circle cx="75" cy="57" r="5" fill="#FF8EC0" />
            <circle cx="89" cy="57" r="5" fill="#FF8EC0" />
            <circle cx="100" cy="57" r="9" fill="#FFB3D9" />
            <circle cx="100" cy="57" r="4" fill="#FFE066" />
            <circle cx="92" cy="54" r="6" fill="#FFC8E0" />
            <circle cx="108" cy="54" r="6" fill="#FFC8E0" />
            <circle cx="118" cy="60" r="8" fill="#FF6BA8" />
            <circle cx="118" cy="60" r="3.5" fill="#FFD166" />
            <circle cx="111" cy="57" r="5" fill="#FF8EC0" />
            <circle cx="125" cy="57" r="5" fill="#FF8EC0" />
            <circle cx="138" cy="67" r="7" fill="#FF9EC0" />
            <circle cx="138" cy="67" r="3" fill="#FFD166" />
            <ellipse cx="72" cy="62" rx="5" ry="3" transform="rotate(-30 72 62)" fill="#5BAD6A" />
            <ellipse cx="128" cy="62" rx="5" ry="3" transform="rotate(30 128 62)" fill="#5BAD6A" />
          </g>
        )}

        {season === 'fair' && (
          <g>
            <rect x="74" y="40" width="52" height="30" rx="4" fill="#1A1A2E" />
            <rect x="64" y="68" width="72" height="10" rx="4" fill="#1A1A2E" />
            <rect x="74" y="62" width="52" height="7" rx="2" fill="#CC2200" />
            <circle cx="86" cy="53" r="3" fill="#FFD700" opacity="0.7" />
            <circle cx="100" cy="48" r="3" fill="#FFD700" opacity="0.7" />
            <circle cx="114" cy="55" r="3" fill="#FFD700" opacity="0.7" />
            <polygon points="78,157 100,150 100,164" fill="#CC2200" />
            <polygon points="122,157 100,150 100,164" fill="#AA1800" />
            <circle cx="100" cy="157" r="5" fill="#FF4422" />
            <circle cx="88" cy="153" r="2" fill="#FF8866" opacity="0.7" />
            <circle cx="112" cy="153" r="2" fill="#FF8866" opacity="0.7" />
          </g>
        )}
      </svg>
    </div>
  );
};

export default FoxMascot;
