import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../services/api';
import FoxMascot from '../components/FoxMascot';
import './HomePage.css';

interface Fair {
  id: string;
  name: string;
  descriptionAz: string | null;
  descriptionEn: string | null;
  startDate: string;
  endDate: string;
  locationAddress: string | null;
  status: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [nextFair, setNextFair] = useState<Fair | null>(null);
  const [upcomingFairs, setUpcomingFairs] = useState<Fair[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNextFair();
    fetchUpcomingFairs();
  }, []);

  useEffect(() => {
    if (!nextFair) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const targetDate = new Date(nextFair.startDate).getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        // Fair has started or already passed
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const timer = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(timer);
  }, [nextFair]);

  const fetchNextFair = async () => {
    try {
      setLoading(true);
      const response = await publicApi.getNextFair();
      setNextFair(response.fair);
    } catch (error) {
      console.error('Error fetching next fair:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingFairs = async () => {
    try {
      const response = await publicApi.getFairs();
      const fairs = (response.fairs || []).filter(
        (fair: Fair) => fair.status === 'upcoming' || fair.status === 'active'
      );
      setUpcomingFairs(fairs);
    } catch (error) {
      console.error('Error fetching upcoming fairs:', error);
    }
  };

  const getDescription = (fair: Fair) => {
    return i18n.language === 'en' ? fair.descriptionEn : fair.descriptionAz;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'az-AZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Generate snowflake elements
  const snowflakes = Array.from({ length: 15 }, (_, i) => (
    <span key={i} className="snowflake">❄</span>
  ));

  return (
    <div className="home-page">
      {/* Snowflake Animation */}
      <div className="snowflakes-container">
        {snowflakes}
      </div>

      <div className="hero-section">
        <h1>{t('welcome.title', 'Welcome to Fair Marketplace')}</h1>
        <p className="hero-subtitle">{t('welcome.subtitle', 'Discover amazing fairs and vendors')}</p>

        <div className="home-actions">
          <Link to="/map" className="btn btn-primary btn-lg">
            🗺️ {t('welcome.cta.browseMap', 'Browse Map')}
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">
            📝 {t('welcome.cta.applyVendor', 'Apply as Vendor')}
          </Link>
        </div>
      </div>

      {/* Countdown Section */}
      {!loading && nextFair && (
        <div className="countdown-section">
          <div className="countdown-container">
            <h2 className="countdown-title">
              {nextFair.status === 'active'
                ? t('welcome.countdown.fairIsLive', 'Fair is Live!')
                : t('welcome.countdown.upcomingFair', 'Next Fair')}
            </h2>
            <h3 className="fair-name">{nextFair.name}</h3>

            {nextFair.status === 'upcoming' && timeRemaining && (
              <div className="countdown-timer">
                <div className="countdown-item">
                  <span className="countdown-value">{timeRemaining.days}</span>
                  <span className="countdown-label">{t('welcome.countdown.days', 'Days')}</span>
                </div>
                <div className="countdown-separator">:</div>
                <div className="countdown-item">
                  <span className="countdown-value">{String(timeRemaining.hours).padStart(2, '0')}</span>
                  <span className="countdown-label">{t('welcome.countdown.hours', 'Hours')}</span>
                </div>
                <div className="countdown-separator">:</div>
                <div className="countdown-item">
                  <span className="countdown-value">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                  <span className="countdown-label">{t('welcome.countdown.minutes', 'Minutes')}</span>
                </div>
                <div className="countdown-separator">:</div>
                <div className="countdown-item">
                  <span className="countdown-value">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                  <span className="countdown-label">{t('welcome.countdown.seconds', 'Seconds')}</span>
                </div>
              </div>
            )}

            <div className="fair-details">
              {nextFair.locationAddress && (
                <p className="fair-location">
                  <span className="icon">📍</span> {nextFair.locationAddress}
                </p>
              )}
              <p className="fair-dates">
                <span className="icon">📅</span> {formatDate(nextFair.startDate)} - {formatDate(nextFair.endDate)}
              </p>
              {getDescription(nextFair) && (
                <p className="fair-description">{getDescription(nextFair)}</p>
              )}
            </div>

            <Link to="/map" className="btn btn-primary">
              {t('welcome.countdown.viewOnMap', 'View on Map')}
            </Link>
          </div>
        </div>
      )}

      {!loading && !nextFair && (
        <div className="no-fairs-section">
          <p>{t('welcome.countdown.noUpcoming', 'No upcoming fairs scheduled at this time.')}</p>
        </div>
      )}

      {/* Upcoming Events Section */}
      {upcomingFairs.length > 0 && (
        <section className="homepage-upcoming-section">
          <h2 className="homepage-upcoming-title">
            <span className="section-icon">🎪</span>
            {t('welcome.upcomingEvents', 'Upcoming Events')}
          </h2>
          <p className="homepage-upcoming-subtitle">
            {t('welcome.upcomingEventsSubtitle', "Don't miss these exciting fairs!")}
          </p>
          <div className="homepage-upcoming-grid">
            {upcomingFairs.map((fair) => (
              <div key={fair.id} className="homepage-event-card">
                <div className="homepage-event-card-header">
                  <span className={`homepage-event-badge ${fair.status}`}>
                    {fair.status === 'active'
                      ? t('welcome.status.live', '🔴 Live Now')
                      : t('welcome.status.upcoming', '🎯 Coming Soon')}
                  </span>
                </div>
                <h3 className="homepage-event-name">{fair.name}</h3>
                <div className="homepage-event-dates">
                  <span className="icon">📅</span> {formatDate(fair.startDate)} – {formatDate(fair.endDate)}
                </div>
                {fair.locationAddress && (
                  <div className="homepage-event-location">
                    <span className="icon">📍</span> {fair.locationAddress}
                  </div>
                )}
                {getDescription(fair) && (
                  <p className="homepage-event-description">{getDescription(fair)}</p>
                )}
                <Link to="/map" className="btn btn-secondary homepage-event-cta">
                  🗺️ {t('welcome.viewOnMap', 'View on Map')}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Animated Train */}
      <div className="train-container">
        <div className="train-track"></div>
        <div className="train">
          <span className="train-smoke">💨</span>
          <span className="train-engine">🚂</span>
          <span className="train-car">🚃</span>
          <span className="train-car">🚃</span>
          <span className="train-car">🚃</span>
          <span className="train-car">🚃</span>
        </div>
      </div>

      <FoxMascot isFairActive={nextFair?.status === 'active'} />
    </div>
  );
};

export default HomePage;
