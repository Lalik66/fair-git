import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { vendorApi } from '../services/api';
import PanoramaViewer from '../components/PanoramaViewer';
import { DEMO_PANORAMA_URL } from '../types/map';
import './VendorBookings.css';

interface Booking {
  id: string;
  bookingStatus: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  fairId: string;
  fairName: string;
  fairStartDate: string;
  fairEndDate: string;
  fairStatus: string;
  fairLocation: string | null;
  houseId: string;
  houseNumber: string;
  houseArea: number | null;
  housePrice: number | null;
  houseDescription: string | null;
  housePanorama360Url: string | null;
  applicationId: string;
  applicationSubmittedAt: string;
}

const VendorBookings: React.FC = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPanorama, setShowPanorama] = useState(false);
  const [selectedPanorama, setSelectedPanorama] = useState<{ url: string; houseNumber: string; isDemo?: boolean } | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vendorApi.getBookings();
      setBookings(response.bookings);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError(err.response?.data?.error || t('vendor.errorLoadBookings'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'badge badge-success';
      case 'cancelled':
        return 'badge badge-danger';
      case 'completed':
        return 'badge badge-info';
      default:
        return 'badge badge-secondary';
    }
  };

  const getFairStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return t('vendor.statusActive');
      case 'upcoming':
        return t('vendor.statusUpcoming');
      case 'completed':
        return t('vendor.statusCompleted');
      case 'archived':
        return t('vendor.statusArchived');
      default:
        return status;
    }
  };

  const handleView360Tour = (panoramaUrl: string | null, houseNumber: string) => {
    // Use demo panorama as fallback when no URL provided
    setSelectedPanorama({ url: panoramaUrl || DEMO_PANORAMA_URL, houseNumber, isDemo: !panoramaUrl });
    setShowPanorama(true);
  };

  const handleClosePanorama = () => {
    setShowPanorama(false);
    setSelectedPanorama(null);
  };

  if (loading) {
    return (
      <div className="vendor-bookings-container">
        <div className="loading-spinner">{t('vendor.loadingBookings')}</div>
      </div>
    );
  }

  return (
    <div className="vendor-bookings-container">
      <div className="page-header">
        <h1>{t('vendor.myBookings', { defaultValue: 'My Bookings' })}</h1>
        <button className="btn btn-secondary" onClick={fetchBookings}>
          {t('vendor.refresh')}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {bookings.length === 0 ? (
        <div className="no-bookings">
          <p>{t('vendor.noBookingsYet')}</p>
          <p className="help-text">
            {t('vendor.noBookingsHint')}
          </p>
        </div>
      ) : (
        <div className="bookings-grid">
          {bookings.map((booking) => (
            <div key={booking.id} className="booking-card">
              <div className="booking-header">
                <span className={getStatusBadgeClass(booking.bookingStatus)}>
                  {booking.bookingStatus.charAt(0).toUpperCase() + booking.bookingStatus.slice(1)}
                </span>
                <span className="fair-status">
                  {t('vendor.fair')} {getFairStatusLabel(booking.fairStatus)}
                </span>
              </div>

              <div className="booking-content">
                <h3 className="fair-name">{booking.fairName}</h3>

                <div className="booking-details">
                  <div className="detail-row">
                    <span className="detail-label">{t('vendor.houseNumber')}</span>
                    <span className="detail-value house-number">{booking.houseNumber}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{t('vendor.fairDates')}</span>
                    <span className="detail-value">
                      {formatDate(booking.fairStartDate)} - {formatDate(booking.fairEndDate)}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">{t('vendor.bookingPeriod')}</span>
                    <span className="detail-value">
                      {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                    </span>
                  </div>

                  {booking.houseArea && (
                    <div className="detail-row">
                      <span className="detail-label">{t('vendor.houseArea')}</span>
                      <span className="detail-value">{booking.houseArea.toFixed(1)} m²</span>
                    </div>
                  )}

                  {booking.housePrice && (
                    <div className="detail-row">
                      <span className="detail-label">{t('vendor.price')}</span>
                      <span className="detail-value price">{booking.housePrice.toLocaleString()} AZN</span>
                    </div>
                  )}

                  {booking.fairLocation && (
                    <div className="detail-row">
                      <span className="detail-label">{t('vendor.location')}</span>
                      <span className="detail-value">{booking.fairLocation}</span>
                    </div>
                  )}

                  {booking.houseDescription && (
                    <div className="detail-row full-width">
                      <span className="detail-label">{t('vendor.houseDescription')}</span>
                      <span className="detail-value">{booking.houseDescription}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="booking-footer">
                <span className="booked-date">
                  {t('vendor.booked')} {formatDate(booking.createdAt)}
                </span>
                <button
                  className="btn btn-360-tour"
                  onClick={() => handleView360Tour(booking.housePanorama360Url, booking.houseNumber)}
                  title={t('vendor.view360Tour')}
                >
                  <span className="tour-icon">🔄</span>
                  {!booking.housePanorama360Url ? t('vendor.tour360Demo') : t('vendor.tour360')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPanorama && selectedPanorama && (
        <PanoramaViewer
          panoramaUrl={selectedPanorama.url}
          houseNumber={selectedPanorama.houseNumber}
          onClose={handleClosePanorama}
        />
      )}
    </div>
  );
};

export default VendorBookings;
