import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { feedbackApi } from '../services/api';
import Reveal from './Reveal';
import RevealText from './RevealText';
import './FairFeedbackSection.css';

const MIN_MESSAGE_LENGTH = 5;
const MAX_MESSAGE_LENGTH = 1000;

/**
 * "Leave feedback" section on the About page (section 07). A deliberately
 * small form — overall stars + a free-text message, name/email optional —
 * that lands in the organizers' admin inbox. Nothing is displayed publicly,
 * so there is no moderation flow on this path.
 */
const FairFeedbackSection: React.FC = () => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError(t('feedback.errors.ratingRequired', 'Please pick a star rating.'));
      return;
    }
    if (message.trim().length < MIN_MESSAGE_LENGTH) {
      setError(t('feedback.errors.messageTooShort', 'Please write a few words of feedback.'));
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await feedbackApi.submit({
        rating,
        message: message.trim(),
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError(t('feedback.errors.rateLimited', 'Too many submissions — please try again later.'));
      } else {
        setError(err.response?.data?.error || t('feedback.errors.submitFailed', 'Could not send your feedback. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="feedback-section">
      <div className="about-wrap">
        <div className="feedback-grid">
          <div>
            <div className="marker">
              <span className="marker-n">07</span>
              {t('feedback.marker', 'Feedback')}
            </div>
            <RevealText as="h2" className="feedback-h2">
              {t('feedback.headlineA', 'Been to the fair?')}<br />
              {t('feedback.headlineB', 'Tell us how ')}<em>{t('feedback.headlineEm', 'it went')}</em>.
            </RevealText>
            <p className="feedback-lede">
              {t('feedback.lede', 'Praise, complaints, ideas for the next season — everything goes straight to the organizers. Leave your name if you want a reply, or stay anonymous.')}
            </p>
            <div className="feedback-meta">
              <span>{t('feedback.metaPrivate', 'Read by the organizers only')}</span>
            </div>
          </div>

          <Reveal as="div" className="feedback-card" delay={120}>
            {submitted ? (
              <div className="feedback-success" role="status">
                <span className="feedback-success-stars" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={i <= rating ? 'fb-star filled' : 'fb-star'}>★</span>
                  ))}
                </span>
                <h3>{t('feedback.success.title', 'Thank you!')}</h3>
                <p>{t('feedback.success.body', 'Your feedback is on its way to the organizers.')}</p>
              </div>
            ) : (
              <form className="feedback-form" onSubmit={handleSubmit} noValidate>
                <div className="feedback-field">
                  <label className="feedback-label" id="fb-rating-label">
                    {t('feedback.form.ratingLabel', 'Overall impression')} <span className="fb-req">*</span>
                  </label>
                  <div
                    className="fb-star-input"
                    role="radiogroup"
                    aria-labelledby="fb-rating-label"
                    onMouseLeave={() => setHovered(0)}
                  >
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        role="radio"
                        aria-checked={rating === i}
                        aria-label={`${i}/5`}
                        className={i <= (hovered || rating) ? 'fb-star-btn filled' : 'fb-star-btn'}
                        onMouseEnter={() => setHovered(i)}
                        onFocus={() => setHovered(i)}
                        onBlur={() => setHovered(0)}
                        onClick={() => setRating(i)}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div className="feedback-field">
                  <label className="feedback-label" htmlFor="fb-message">
                    {t('feedback.form.messageLabel', 'Feedback & suggestions')} <span className="fb-req">*</span>
                  </label>
                  <textarea
                    id="fb-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('feedback.form.messagePlaceholder', 'What did you enjoy? What should we improve next time?')}
                    maxLength={MAX_MESSAGE_LENGTH}
                    rows={5}
                    required
                  />
                  <span className="fb-counter">{message.length}/{MAX_MESSAGE_LENGTH}</span>
                </div>

                <div className="feedback-row">
                  <div className="feedback-field">
                    <label className="feedback-label" htmlFor="fb-name">
                      {t('feedback.form.nameLabel', 'Name (optional)')}
                    </label>
                    <input
                      id="fb-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('feedback.form.namePlaceholder', 'Your name')}
                      maxLength={100}
                    />
                  </div>
                  <div className="feedback-field">
                    <label className="feedback-label" htmlFor="fb-email">
                      {t('feedback.form.emailLabel', 'Email (optional)')}
                    </label>
                    <input
                      id="fb-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('feedback.form.emailPlaceholder', 'If you would like a reply')}
                      maxLength={200}
                    />
                  </div>
                </div>

                {error && <p className="feedback-error" role="alert">{error}</p>}

                <button type="submit" className="feedback-submit" disabled={submitting}>
                  {submitting
                    ? t('feedback.form.submitting', 'Sending…')
                    : t('feedback.form.submit', 'Send feedback')}
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default FairFeedbackSection;
