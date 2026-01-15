import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../services/api';
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
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNextFair();
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

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>{t('welcome.title', 'Welcome to Fair Marketplace')}</h1>
        <p className="hero-subtitle">{t('welcome.subtitle', 'Discover amazing fairs and vendors')}</p>

        <div className="home-actions">
          <Link to="/map" className="btn btn-primary btn-lg">
            {t('welcome.cta.browseMap', 'Browse Map')}
          </Link>
          <Link to="/login" className="btn btn-outline btn-lg">
            {t('welcome.cta.applyVendor', 'Apply as Vendor')}
          </Link>
        </div>
      </div>

      {/* Countdown Section */}
      {!loading && nextFair && (
        <div className="countdown-section">
          <div className="countdown-container">
            <h2 className="countdown-title">
              {nextFair.status === 'active'
                ? t('countdown.fairActive', 'Fair is happening now!')
                : t('countdown.upcomingFair', 'Next Fair')}
            </h2>
            <h3 className="fair-name">{nextFair.name}</h3>

            {nextFair.status === 'upcoming' && timeRemaining && (
              <div className="countdown-timer">
                <div className="countdown-item">
                  <span className="countdown-value">{timeRemaining.days}</span>
                  <span className="countdown-label">{t('countdown.days', 'Days')}</span>
                </div>
                <div className="countdown-separator">:</div>
                <div className="countdown-item">
                  <span className="countdown-value">{String(timeRemaining.hours).padStart(2, '0')}</span>
                  <span className="countdown-label">{t('countdown.hours', 'Hours')}</span>
                </div>
                <div className="countdown-separator">:</div>
                <div className="countdown-item">
                  <span className="countdown-value">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                  <span className="countdown-label">{t('countdown.minutes', 'Minutes')}</span>
                </div>
                <div className="countdown-separator">:</div>
                <div className="countdown-item">
                  <span className="countdown-value">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                  <span className="countdown-label">{t('countdown.seconds', 'Seconds')}</span>
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
              {t('countdown.viewOnMap', 'View on Map')}
            </Link>
          </div>
        </div>
      )}

      {!loading && !nextFair && (
        <div className="no-fairs-section">
          <p>{t('countdown.noUpcoming', 'No upcoming fairs scheduled at this time.')}</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
