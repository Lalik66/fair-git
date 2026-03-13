import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ALLOWED_EMOJIS } from '../services/reactionsService';
import './ReactionPicker.css';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  className?: string;
}

const ReactionPicker: React.FC<ReactionPickerProps> = ({
  onSelect,
  onClose,
  className = '',
}) => {
  const { t } = useTranslation();
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };
    // Delay adding listener to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
    onClose?.();
  };

  return (
    <div
      ref={pickerRef}
      className={`reaction-picker ${className}`}
      role="listbox"
      aria-label={t('reactions.pickEmoji')}
    >
      <div className="reaction-picker-header">
        <span className="reaction-picker-title">{t('reactions.pickEmoji')}</span>
        {onClose && (
          <button
            className="reaction-picker-close"
            onClick={onClose}
            aria-label={t('common.close')}
            type="button"
          >
            &times;
          </button>
        )}
      </div>
      <div className="reaction-picker-grid">
        {ALLOWED_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            className="reaction-picker-emoji"
            onClick={() => handleEmojiClick(emoji)}
            role="option"
            aria-label={emoji}
            type="button"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReactionPicker;
