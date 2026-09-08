import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../services/api';
import './MarketingSignupModal.css';

/**
 * Marketing signup popup — split card (image left, phone form right), styled
 * with FestivKids tokens (Fraunces headings, coral/sky-blue accents) so it
 * feels native to Fair Marketplace rather than a black Sneaker Con clone.
 *
 * Presentation only: *when* it appears is decided by useMarketingPopupTriggers
 * at the App level. On submit it posts to /api/public/marketing-leads and asks
 * the parent to mark the lead as permanently suppressed.
 */

const PHONE_CODES = ['+994', '+90', '+995', '+7'];

interface Props {
  onClose: () => void; // × button — soft dismiss (7-day suppression)
  onDismiss: () => void; // "No, thanks" — soft dismiss (7-day suppression)
  onSubmitted: () => void; // success — permanent suppression
}

const MarketingSignupModal: React.FC<Props> = ({ onClose, onDismiss, onSubmitted }) => {
  const { t, i18n } = useTranslation();
  const [phoneCode, setPhoneCode] = useState('+994');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // Escape to close + focus the dismiss control on open + basic focus trap.
  useEffect(() => {
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = cardRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    // Lock background scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (status === 'submitting') return;
      if (phoneNumber.trim().length < 5) {
        setStatus('error');
        return;
      }
      setStatus('submitting');
      try {
        await publicApi.submitMarketingLead({
          phone: `${phoneCode} ${phoneNumber.trim()}`,
          consentAccepted: true,
          preferredLanguage: i18n.language?.startsWith('az') ? 'az' : 'en',
          source: 'popup',
        });
        setStatus('success');
        // Let the success message land before permanently suppressing/closing.
        window.setTimeout(onSubmitted, 1600);
      } catch {
        setStatus('error');
      }
    },
    [status, phoneNumber, phoneCode, i18n.language, onSubmitted]
  );

  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="msm-overlay" onMouseDown={onBackdropClick}>
      <div
        className="msm-card"
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="msm-close"
          onClick={onClose}
          aria-label={t('marketingPopup.closeAria', 'Close signup')}
          ref={closeRef}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div
          className="msm-media"
          role="img"
          aria-label={t('marketingPopup.imageAlt', 'Festive Fair Marketplace installation')}
        >
          <span className="msm-media-glow" aria-hidden="true" />
        </div>

        <div className="msm-body">
          {status === 'success' ? (
            <div className="msm-success" role="status">
              <span className="msm-success-mark" aria-hidden="true">
                ✦
              </span>
              <p>{t('marketingPopup.success', "You're on the list! See you at the fair.")}</p>
            </div>
          ) : (
            <>
              <h2 id={titleId} className="msm-title">
                {t(
                  'marketingPopup.title',
                  'Stay in the loop for fair announcements, seasonal events & exclusive content.'
                )}
              </h2>

              <form className="msm-form" onSubmit={handleSubmit} noValidate>
                <div className="msm-phone">
                  <select
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    aria-label="Country code"
                  >
                    {PHONE_CODES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (status === 'error') setStatus('idle');
                    }}
                    placeholder={t('marketingPopup.phonePlaceholder', 'Phone number')}
                    autoComplete="tel-national"
                  />
                </div>

                {status === 'error' && (
                  <p className="msm-error" role="alert">
                    {t('marketingPopup.error', 'Something went wrong. Please try again.')}
                  </p>
                )}

                <p className="msm-consent">{t('marketingPopup.consent')}</p>

                <button type="submit" className="msm-cta" disabled={status === 'submitting'}>
                  {status === 'submitting'
                    ? t('marketingPopup.submitting', 'Signing up…')
                    : t('marketingPopup.cta', 'Sign me up!')}
                </button>

                <button type="button" className="msm-dismiss" onClick={onDismiss}>
                  {t('marketingPopup.dismiss', 'No, thanks')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketingSignupModal;
