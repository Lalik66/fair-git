const fs = require('fs');

const newContent = `import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { vendorApi } from '../services/api';
import PanoramaViewer from '../components/PanoramaViewer';
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
  const [selectedPanorama, setSelectedPanorama] = useState<{ url: string; houseNumber: string } | null>(null);

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
      setError(err.response?.data?.error || 'Failed to load bookings');
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
        return 'Active';
      case 'upcoming':
        return 'Upcoming';
      case 'completed':
        return 'Completed';
      case 'archived':
        return 'Archived';
      default:
        return status;
    }
  };

  const handleView360Tour = (panoramaUrl: string, houseNumber: string) => {
    setSelectedPanorama({ url: panoramaUrl, houseNumber });
    setShowPanorama(true);
  };

  const handleClosePanorama = () => {
    setShowPanorama(false);
    setSelectedPanorama(null);
  };

  if (loading) {
    return (
      <div className="vendor-bookings-container">
        <div className="loading-spinner">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="vendor-bookings-container">
      <div className="page-header">
        <h1>{t('vendor.myBookings', { defaultValue: 'My Bookings' })}</h1>
        <button className="btn btn-secondary" onClick={fetchBookings}>
          Refresh
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {bookings.length === 0 ? (
        <div className="no-bookings">
          <p>You don't have any approved bookings yet.</p>
          <p className="help-text">
            Once your applications are approved, your bookings will appear here.
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
                  Fair: {getFairStatusLabel(booking.fairStatus)}
                </span>
              </div>

              <div className="booking-content">
                <h3 className="fair-name">{booking.fairName}</h3>

                <div className="booking-details">
                  <div className="detail-row">
                    <span className="detail-label">House Number:</span>
                    <span className="detail-value house-number">{booking.houseNumber}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Fair Dates:</span>
                    <span className="detail-value">
                      {formatDate(booking.fairStartDate)} - {formatDate(booking.fairEndDate)}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Booking Period:</span>
                    <span className="detail-value">
                      {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                    </span>
                  </div>

                  {booking.houseArea && (
                    <div className="detail-row">
                      <span className="detail-label">House Area:</span>
                      <span className="detail-value">{booking.houseArea.toFixed(1)} m²</span>
                    </div>
                  )}

                  {booking.housePrice && (
                    <div className="detail-row">
                      <span className="detail-label">Price:</span>
                      <span className="detail-value price">{booking.housePrice.toLocaleString()} AZN</span>
                    </div>
                  )}

                  {booking.fairLocation && (
                    <div className="detail-row">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">{booking.fairLocation}</span>
                    </div>
                  )}

                  {booking.houseDescription && (
                    <div className="detail-row full-width">
                      <span className="detail-label">House Description:</span>
                      <span className="detail-value">{booking.houseDescription}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="booking-footer">
                <span className="booked-date">
                  Booked: {formatDate(booking.createdAt)}
                </span>
                {booking.housePanorama360Url && (
                  <button
                    className="btn btn-360-tour"
                    onClick={() => handleView360Tour(booking.housePanorama360Url!, booking.houseNumber)}
                    title="View 360° panoramic tour of your house"
                  >
                    <span className="tour-icon">🔄</span>
                    360° Tour
                  </button>
                )}
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
`;

fs.writeFileSync('D:/fair-marketplace/frontend/src/pages/VendorBookings.tsx', newContent);
console.log('VendorBookings.tsx updated successfully');
