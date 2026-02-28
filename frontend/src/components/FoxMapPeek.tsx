import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './FoxMapPeek.css';

const FoxMapPeek: React.FC = () => {
  const { t } = useTranslation();
  const [showSpeech, setShowSpeech] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [bouncing, setBouncing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tips = [
    t('foxMascot.mapTip.explore', "Tap a house to see what's inside! 🏠"),
    t('foxMascot.mapTip.panorama', 'Try the 360° view! 👀'),
    t('foxMascot.mapTip.filter', 'Use filters to find your favorite vendors!'),
    t('foxMascot.mapTip.hello', "Hi! I'm Foxie, your fair guide! 🦊"),
  ];

  const handleClick = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(30);

    setBouncing(true);
    setTimeout(() => setBouncing(false), 350);

    const msg = tips[Math.floor(Math.random() * tips.length)];
    setSpeechText(msg);
    setShowSpeech(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowSpeech(false), 3500);
  }, [tips]);

  return (
    <div
      className={`fox-map-peek ${bouncing ? 'bounce' : ''}`}
      onClick={handleClick}
      role="img"
      aria-label={t('foxMascot.ariaLabel', 'Foxie the fox mascot')}
    >
      {/* Speech bubble — drops below the fox, inside the map */}
      <div
        className={`fox-peek-speech ${showSpeech ? 'visible' : ''}`}
        aria-live="polite"
      >
        {speechText}
      </div>

      {/* Cropped Foxie SVG — ears + eyes peeking */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="25 15 150 100"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="fmp-headGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FF7D4A" />
            <stop offset="100%" stopColor="#D94F1A" />
          </radialGradient>
        </defs>

        {/* Head (partially visible) */}
        <ellipse cx="100" cy="105" rx="52" ry="50" fill="url(#fmp-headGrad)" />

        {/* Ears — animated group */}
        <g className="fox-peek-ears">
          {/* Left ear */}
          <polygon points="58,68 44,28 82,58" fill="#FF6B35" />
          <polygon points="62,65 52,36 76,58" fill="#FFB38A" />
          {/* Right ear */}
          <polygon points="142,68 156,28 118,58" fill="#FF6B35" />
          <polygon points="138,65 148,36 124,58" fill="#FFB38A" />
        </g>

        {/* Forehead white patch */}
        <path
          d="M80 80 Q100 70 120 80 Q112 95 100 92 Q88 95 80 80Z"
          fill="#FFF0DC"
          opacity="0.6"
        />

        {/* Eyes — small happy eyes peeking */}
        <ellipse cx="82" cy="100" rx="9" ry="10" fill="white" />
        <circle cx="83" cy="101" r="6" fill="#1E1206" />
        <circle cx="85" cy="98" r="2" fill="white" />
        <ellipse cx="118" cy="100" rx="9" ry="10" fill="white" />
        <circle cx="119" cy="101" r="6" fill="#1E1206" />
        <circle cx="121" cy="98" r="2" fill="white" />

        {/* Eyebrows */}
        <path d="M74 91 Q82 86 90 91" stroke="#D94F1A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M110 91 Q118 86 126 91" stroke="#D94F1A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
};

export default FoxMapPeek;
