import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../services/api';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';
import { useAdminSearchQuery, matchesQuery } from '../hooks/useAdminSearch';
import './FairManagement.css';

interface Fair {
  id: string;
  name: string;
  descriptionAz: string | null;
  descriptionEn: string | null;
  startDate: string;
  endDate: string;
  locationAddress: string | null;
  mapCenterLat: number | null;
  mapCenterLng: number | null;
  bannerImageUrl: string | null;
  galleryUrls: string | null;
  archiveVideoUrl: string | null;
  status: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ParticipatingVendor {
  vendorId: string;
  companyName: string | null;
  productCategory: string | null;
  contactEmail: string;
  contactName: string;
  contactPhone: string | null;
  houseNumber: string;
  houseArea: number | null;
  housePrice: number | null;
  bookingStatus: string;
  bookingStartDate: string;
  bookingEndDate: string;
}

interface RentedHouse {
  id: string;
  houseNumber: string;
  areaSqm: number | null;
  price: number | null;
  vendorCompany: string | null;
}

interface ApplicationStats {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

interface FairDetails {
  fair: Fair;
  applicationStats: ApplicationStats;
  participatingVendors: ParticipatingVendor[];
  rentedHouses: RentedHouse[];
  totalRevenue: number;
}

interface FairFormData {
  name: string;
  descriptionAz: string;
  descriptionEn: string;
  startDate: string;
  endDate: string;
  locationAddress: string;
  mapCenterLat: string;
  mapCenterLng: string;
  bannerImageUrl: string;
  galleryUrl1: string;
  galleryUrl2: string;
  galleryUrl3: string;
  galleryUrl4: string;
  archiveVideoUrl: string;
  status: string;
}

// Get a date string offset by N days from today
const getDateString = (daysOffset: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

const initialFormData: FairFormData = {
  name: '',
  descriptionAz: '',
  descriptionEn: '',
  startDate: getDateString(30),
  endDate: getDateString(60),
  locationAddress: '',
  mapCenterLat: '',
  mapCenterLng: '',
  bannerImageUrl: '',
  galleryUrl1: '',
  galleryUrl2: '',
  galleryUrl3: '',
  galleryUrl4: '',
  archiveVideoUrl: '',
  status: 'upcoming',
};

// Get today's date in YYYY-MM-DD format for date input min attribute
const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Fair.galleryUrls arrives from the API as a JSON-stringified array of image URLs.
// Parse defensively into a clean string[] for the (up to 4) edit-form inputs.
const parseGalleryUrls = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string') : [];
  } catch {
    return [];
  }
};

// Collect the 4 gallery-URL inputs into a trimmed, non-empty array for the API.
const collectGallery = (data: FairFormData): string[] =>
  [data.galleryUrl1, data.galleryUrl2, data.galleryUrl3, data.galleryUrl4]
    .map((u) => u.trim())
    .filter((u) => u.length > 0);

const FairManagement: React.FC = () => {
  const { t } = useTranslation();
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [pastFairs, setPastFairs] = useState<Fair[]>([]);
  const searchQuery = useAdminSearchQuery();
  const fairMatches = useCallback(
    (f: Fair) =>
      matchesQuery(f.name, searchQuery) ||
      matchesQuery(f.locationAddress, searchQuery) ||
      matchesQuery(f.descriptionEn, searchQuery) ||
      matchesQuery(f.descriptionAz, searchQuery),
    [searchQuery]
  );
  const visibleFairs = useMemo(() => fairs.filter(fairMatches), [fairs, fairMatches]);
  const visiblePastFairs = useMemo(() => pastFairs.filter(fairMatches), [pastFairs, fairMatches]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFair, setSelectedFair] = useState<Fair | null>(null);
  const [formData, setFormData] = useState<FairFormData>(initialFormData);
  const [originalFormData, setOriginalFormData] = useState<FairFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [fairDetails, setFairDetails] = useState<FairDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Track if form has unsaved changes
  const isFormDirty = useMemo(() => {
    if (!showCreateModal && !showEditModal) return false;
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  }, [formData, originalFormData, showCreateModal, showEditModal]);

  // Use unsaved changes warning hook
  const {
    showWarningModal,
    confirmNavigation,
    handleStay,
    handleLeave,
    warningMessage,
  } = useUnsavedChangesWarning({
    isDirty: isFormDirty,
    message: t('unsavedChanges.message', 'You have unsaved changes. Are you sure you want to leave?'),
  });

  useEffect(() => {
    fetchFairs();
    fetchPastFairs();
  }, []);

  const fetchFairs = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getFairs();
      // Filter out archived fairs from the main list
      const activeFairs = data.fairs.filter((fair: Fair) => fair.status !== 'archived' && fair.status !== 'completed');
      setFairs(activeFairs);
      setError(null);
    } catch (err) {
      setError(t('fairAdmin.loadFailed'));
      console.error('Error fetching fairs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPastFairs = async () => {
    try {
      const data = await adminApi.getPastFairs();
      setPastFairs(data.fairs);
    } catch (err) {
      console.error('Error fetching past fairs:', err);
    }
  };

  const fetchFairDetails = async (fairId: string) => {
    try {
      setLoadingDetails(true);
      const data = await adminApi.getFairDetails(fairId);
      setFairDetails(data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error fetching fair details:', err);
      setError(t('fairAdmin.loadDetailsFailed'));
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setFairDetails(null);
  };

  const handleArchiveFairs = async () => {
    if (!window.confirm(t('fairAdmin.archiveConfirm'))) {
      return;
    }

    try {
      setArchiving(true);
      const result = await adminApi.archiveFairs();

      if (result.archivedCount > 0) {
        setSuccessMessage(t('fairAdmin.archivedCount', { count: result.archivedCount }));
      } else {
        setSuccessMessage(t('fairAdmin.noneToArchive'));
      }

      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh both lists
      fetchFairs();
      fetchPastFairs();
    } catch (err: any) {
      setError(err.response?.data?.error || t('fairAdmin.archiveFailed'));
    } finally {
      setArchiving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setOriginalFormData(initialFormData);
    setError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (fair: Fair) => {
    setSelectedFair(fair);
    const gallery = parseGalleryUrls(fair.galleryUrls);
    const editFormData = {
      name: fair.name,
      descriptionAz: fair.descriptionAz || '',
      descriptionEn: fair.descriptionEn || '',
      startDate: fair.startDate.split('T')[0],
      endDate: fair.endDate.split('T')[0],
      locationAddress: fair.locationAddress || '',
      mapCenterLat: fair.mapCenterLat?.toString() || '',
      mapCenterLng: fair.mapCenterLng?.toString() || '',
      bannerImageUrl: fair.bannerImageUrl || '',
      galleryUrl1: gallery[0] || '',
      galleryUrl2: gallery[1] || '',
      galleryUrl3: gallery[2] || '',
      galleryUrl4: gallery[3] || '',
      archiveVideoUrl: fair.archiveVideoUrl || '',
      status: fair.status,
    };
    setFormData(editFormData);
    setOriginalFormData(editFormData);
    setShowEditModal(true);
  };

  // Close modals - checks for unsaved changes first
  const closeModals = useCallback(() => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedFair(null);
    resetForm();
  }, []);

  // Attempt to close modal - shows warning if dirty
  const attemptCloseModal = useCallback(() => {
    if (isFormDirty) {
      confirmNavigation(closeModals);
    } else {
      closeModals();
    }
  }, [isFormDirty, confirmNavigation, closeModals]);

  const handleCreateFair = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await adminApi.createFair({
        name: formData.name,
        descriptionAz: formData.descriptionAz || undefined,
        descriptionEn: formData.descriptionEn || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        locationAddress: formData.locationAddress || undefined,
        mapCenterLat: formData.mapCenterLat ? parseFloat(formData.mapCenterLat) : undefined,
        mapCenterLng: formData.mapCenterLng ? parseFloat(formData.mapCenterLng) : undefined,
        bannerImageUrl: formData.bannerImageUrl || undefined,
        gallery: collectGallery(formData),
        archiveVideoUrl: formData.archiveVideoUrl || undefined,
        status: formData.status,
      });

      setSuccessMessage(t('fairAdmin.createSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
      closeModals();
      fetchFairs();
      fetchPastFairs();
    } catch (err: any) {
      setError(err.response?.data?.error || t('fairAdmin.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateFair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFair) return;

    setSubmitting(true);
    setError(null);

    try {
      await adminApi.updateFair(selectedFair.id, {
        name: formData.name,
        descriptionAz: formData.descriptionAz,
        descriptionEn: formData.descriptionEn,
        startDate: formData.startDate,
        endDate: formData.endDate,
        locationAddress: formData.locationAddress,
        mapCenterLat: formData.mapCenterLat ? parseFloat(formData.mapCenterLat) : undefined,
        mapCenterLng: formData.mapCenterLng ? parseFloat(formData.mapCenterLng) : undefined,
        bannerImageUrl: formData.bannerImageUrl,
        gallery: collectGallery(formData),
        archiveVideoUrl: formData.archiveVideoUrl,
        status: formData.status,
      });

      setSuccessMessage(t('fairAdmin.updateSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
      closeModals();
      fetchFairs();
      fetchPastFairs();
    } catch (err: any) {
      setError(err.response?.data?.error || t('fairAdmin.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFair = async (fair: Fair) => {
    if (!window.confirm(t('fairAdmin.deleteConfirm', { name: fair.name }))) {
      return;
    }

    try {
      await adminApi.deleteFair(fair.id);
      setSuccessMessage(t('fairAdmin.deleteSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchFairs();
      fetchPastFairs();
    } catch (err: any) {
      setError(err.response?.data?.error || t('fairAdmin.deleteFailed'));
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'active':
        return 'badge-success';
      case 'upcoming':
        return 'badge-info';
      case 'completed':
        return 'badge-secondary';
      case 'archived':
        return 'badge-dark';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      upcoming: t('fairAdmin.statusUpcoming'),
      active: t('fairAdmin.statusActive'),
      completed: t('fairAdmin.statusCompleted'),
      archived: t('fairAdmin.statusArchived'),
    };
    return labels[status] || status;
  };

  // Archive media inputs (up to 4 gallery image URLs + one optional video URL),
  // shared by the Create and Edit fair modals. Plain text inputs so relative
  // paths like /winter.jpg are accepted (an `url` input would reject them).
  const renderMediaFields = () => (
    <>
      <div className="form-group">
        <label>{t('fairAdmin.galleryImages', 'Gallery images (up to 4)')}</label>
        {(['galleryUrl1', 'galleryUrl2', 'galleryUrl3', 'galleryUrl4'] as const).map((field, i) => (
          <input
            key={field}
            type="text"
            name={field}
            value={formData[field]}
            onChange={handleInputChange}
            placeholder={`/image-${i + 1}.jpg or https://...`}
            style={i > 0 ? { marginTop: 8 } : undefined}
          />
        ))}
        <small className="field-hint">
          {t('fairAdmin.galleryHint', 'Image URLs shown on the public archive page (e.g. /spring.jpg).')}
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="archiveVideoUrl">{t('fairAdmin.archiveVideoUrl', 'Archive video URL (optional)')}</label>
        <input
          type="text"
          id="archiveVideoUrl"
          name="archiveVideoUrl"
          value={formData.archiveVideoUrl}
          onChange={handleInputChange}
          placeholder="/recap.mp4 or https://..."
        />
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="fair-management-container">
        <div className="loading-spinner">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="fair-management-container">
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      {error && !showCreateModal && !showEditModal && (
        <div className="error-message">{error}</div>
      )}

      <div className="fair-header">
        <h1>{t('admin.fairManagement', { defaultValue: 'Fair Management' })}</h1>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={handleArchiveFairs}
            disabled={archiving}
          >
            {archiving ? t('fairAdmin.archiving') : t('fairAdmin.runArchive')}
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            {t('fairAdmin.createFair')}
          </button>
        </div>
      </div>

      {fairs.length === 0 ? (
        <div className="no-fairs">
          <p>{t('fairAdmin.noFairs')}</p>
        </div>
      ) : visibleFairs.length === 0 ? (
        <div className="no-fairs">
          <p>{t('common.noResults', { defaultValue: 'No results found.' })}</p>
        </div>
      ) : (
        <div className="fairs-table-container">
          <table className="fairs-table">
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('fairAdmin.startDate')}</th>
                <th>{t('fairAdmin.endDate')}</th>
                <th>{t('common.location')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleFairs.map((fair) => (
                <tr key={fair.id}>
                  <td className="name-cell">
                    <strong>{fair.name}</strong>
                    {fair.descriptionAz && (
                      <span className="description-preview">{fair.descriptionAz.substring(0, 50)}...</span>
                    )}
                  </td>
                  <td>{formatDate(fair.startDate)}</td>
                  <td>{formatDate(fair.endDate)}</td>
                  <td>{fair.locationAddress || '-'}</td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(fair.status)}`}>
                      {getStatusLabel(fair.status)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditModal(fair)}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteFair(fair)}
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Past Events Section */}
      <div className="past-events-section">
        <div className="past-events-header">
          <h2 onClick={() => setShowPastEvents(!showPastEvents)} style={{ cursor: 'pointer' }}>
            {showPastEvents ? '▼' : '►'} {t('fairAdmin.pastEvents')} ({pastFairs.length})
          </h2>
        </div>

        {showPastEvents && (
          pastFairs.length === 0 ? (
            <div className="no-fairs">
              <p>{t('fairAdmin.noPastEvents')}</p>
            </div>
          ) : visiblePastFairs.length === 0 ? (
            <div className="no-fairs">
              <p>{t('common.noResults', { defaultValue: 'No results found.' })}</p>
            </div>
          ) : (
            <div className="fairs-table-container past-fairs-table">
              <table className="fairs-table">
                <thead>
                  <tr>
                    <th>{t('common.name')}</th>
                    <th>{t('fairAdmin.startDate')}</th>
                    <th>{t('fairAdmin.endDate')}</th>
                    <th>{t('common.location')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('fairAdmin.archivedAt')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePastFairs.map((fair) => (
                    <tr key={fair.id} className="past-fair-row">
                      <td className="name-cell">
                        <strong>{fair.name}</strong>
                        {fair.descriptionAz && (
                          <span className="description-preview">{fair.descriptionAz.substring(0, 50)}...</span>
                        )}
                      </td>
                      <td>{formatDate(fair.startDate)}</td>
                      <td>{formatDate(fair.endDate)}</td>
                      <td>{fair.locationAddress || '-'}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(fair.status)}`}>
                          {getStatusLabel(fair.status)}
                        </span>
                      </td>
                      <td>{formatDateTime(fair.archivedAt)}</td>
                      <td className="actions-cell">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(fair)}
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => fetchFairDetails(fair.id)}
                          disabled={loadingDetails}
                        >
                          {loadingDetails ? t('common.loading') : t('fairAdmin.viewDetails')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Create Fair Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={attemptCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('fairAdmin.createTitle')}</h2>
              <button className="modal-close" onClick={attemptCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleCreateFair}>
              <div className="modal-form-body">
              {error && <div className="form-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="name">{t('fairAdmin.fairName')} *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder={t('fairAdmin.namePlaceholder')}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">{t('fairAdmin.startDate')} *</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    // When editing, allow the fair's existing (possibly past) start date so
                    // archived/completed fairs stay saveable. On create, selectedFair is null,
                    // so this falls back to today — unchanged behavior.
                    min={
                      selectedFair && selectedFair.startDate.split('T')[0] < getTodayDateString()
                        ? selectedFair.startDate.split('T')[0]
                        : getTodayDateString()
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">{t('fairAdmin.endDate')} *</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    min={formData.startDate || getTodayDateString()}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="locationAddress">{t('fairAdmin.locationAddress')}</label>
                <input
                  type="text"
                  id="locationAddress"
                  name="locationAddress"
                  value={formData.locationAddress}
                  onChange={handleInputChange}
                  placeholder={t('fairAdmin.addressPlaceholder')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="descriptionAz">{t('fairAdmin.descriptionAz')}</label>
                <textarea
                  id="descriptionAz"
                  name="descriptionAz"
                  value={formData.descriptionAz}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder={t('fairAdmin.descAzPlaceholder')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="descriptionEn">{t('fairAdmin.descriptionEn')}</label>
                <textarea
                  id="descriptionEn"
                  name="descriptionEn"
                  value={formData.descriptionEn}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder={t('fairAdmin.descEnPlaceholder')}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="mapCenterLat">{t('fairAdmin.mapCenterLat')}</label>
                  <input
                    type="number"
                    id="mapCenterLat"
                    name="mapCenterLat"
                    value={formData.mapCenterLat}
                    onChange={handleInputChange}
                    step="any"
                    placeholder="40.4093"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="mapCenterLng">{t('fairAdmin.mapCenterLng')}</label>
                  <input
                    type="number"
                    id="mapCenterLng"
                    name="mapCenterLng"
                    value={formData.mapCenterLng}
                    onChange={handleInputChange}
                    step="any"
                    placeholder="49.8671"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="bannerImageUrl">{t('fairAdmin.bannerImageUrl')}</label>
                <input
                  type="text"
                  id="bannerImageUrl"
                  name="bannerImageUrl"
                  value={formData.bannerImageUrl}
                  onChange={handleInputChange}
                  placeholder="/winter.jpg or https://..."
                />
              </div>

              {renderMediaFields()}

              <div className="form-group">
                <label htmlFor="status">{t('common.status')}</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="upcoming">{t('fairAdmin.statusUpcoming')}</option>
                  <option value="active">{t('fairAdmin.statusActive')}</option>
                  <option value="completed">{t('fairAdmin.statusCompleted')}</option>
                  <option value="archived">{t('fairAdmin.statusArchived')}</option>
                </select>
              </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={attemptCloseModal}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? t('common.creating') : t('fairAdmin.createFair')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Fair Modal */}
      {showEditModal && selectedFair && (
        <div className="modal-overlay" onClick={attemptCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('fairAdmin.editTitle')}</h2>
              <button className="modal-close" onClick={attemptCloseModal}>&times;</button>
            </div>
            <form onSubmit={handleUpdateFair}>
              <div className="modal-form-body">
              {error && <div className="form-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="name">{t('fairAdmin.fairName')} *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">{t('fairAdmin.startDate')} *</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    // When editing, allow the fair's existing (possibly past) start date so
                    // archived/completed fairs stay saveable. On create, selectedFair is null,
                    // so this falls back to today — unchanged behavior.
                    min={
                      selectedFair && selectedFair.startDate.split('T')[0] < getTodayDateString()
                        ? selectedFair.startDate.split('T')[0]
                        : getTodayDateString()
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">{t('fairAdmin.endDate')} *</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    min={formData.startDate || getTodayDateString()}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="locationAddress">{t('fairAdmin.locationAddress')}</label>
                <input
                  type="text"
                  id="locationAddress"
                  name="locationAddress"
                  value={formData.locationAddress}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="descriptionAz">{t('fairAdmin.descriptionAz')}</label>
                <textarea
                  id="descriptionAz"
                  name="descriptionAz"
                  value={formData.descriptionAz}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="descriptionEn">{t('fairAdmin.descriptionEn')}</label>
                <textarea
                  id="descriptionEn"
                  name="descriptionEn"
                  value={formData.descriptionEn}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="mapCenterLat">{t('fairAdmin.mapCenterLat')}</label>
                  <input
                    type="number"
                    id="mapCenterLat"
                    name="mapCenterLat"
                    value={formData.mapCenterLat}
                    onChange={handleInputChange}
                    step="any"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="mapCenterLng">{t('fairAdmin.mapCenterLng')}</label>
                  <input
                    type="number"
                    id="mapCenterLng"
                    name="mapCenterLng"
                    value={formData.mapCenterLng}
                    onChange={handleInputChange}
                    step="any"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="bannerImageUrl">{t('fairAdmin.bannerImageUrl')}</label>
                <input
                  type="text"
                  id="bannerImageUrl"
                  name="bannerImageUrl"
                  value={formData.bannerImageUrl}
                  onChange={handleInputChange}
                  placeholder="/winter.jpg or https://..."
                />
              </div>

              {renderMediaFields()}

              <div className="form-group">
                <label htmlFor="status">{t('common.status')}</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="upcoming">{t('fairAdmin.statusUpcoming')}</option>
                  <option value="active">{t('fairAdmin.statusActive')}</option>
                  <option value="completed">{t('fairAdmin.statusCompleted')}</option>
                  <option value="archived">{t('fairAdmin.statusArchived')}</option>
                </select>
              </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={attemptCloseModal}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? t('common.saving') : t('fairAdmin.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning Modal */}
      {showWarningModal && (
        <div className="modal-overlay warning-overlay">
          <div className="modal-content warning-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header warning-header">
              <h2>⚠️ {t('unsavedChanges.title', 'Unsaved Changes')}</h2>
            </div>
            <div className="warning-body">
              <p>{warningMessage}</p>
            </div>
            <div className="modal-footer warning-footer">
              <button type="button" className="btn btn-secondary" onClick={handleStay}>
                {t('unsavedChanges.stay', 'Stay')}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleLeave}>
                {t('unsavedChanges.leave', 'Leave')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fair Details Modal (Read-only) */}
      {showDetailsModal && fairDetails && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('fairAdmin.detailsTitle')} - {fairDetails.fair.name}</h2>
              <button className="modal-close" onClick={closeDetailsModal}>&times;</button>
            </div>
            <div className="fair-details-content">
              {/* Fair Info Section */}
              <div className="details-section">
                <h3>{t('fairAdmin.fairInfo')}</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">{t('common.name')}:</span>
                    <span className="detail-value">{fairDetails.fair.name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t('common.location')}:</span>
                    <span className="detail-value">{fairDetails.fair.locationAddress || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t('fairAdmin.startDate')}:</span>
                    <span className="detail-value">{formatDate(fairDetails.fair.startDate)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t('fairAdmin.endDate')}:</span>
                    <span className="detail-value">{formatDate(fairDetails.fair.endDate)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t('common.status')}:</span>
                    <span className={`badge ${getStatusBadgeClass(fairDetails.fair.status)}`}>
                      {getStatusLabel(fairDetails.fair.status)}
                    </span>
                  </div>
                  {fairDetails.fair.archivedAt && (
                    <div className="detail-item">
                      <span className="detail-label">{t('fairAdmin.archivedAt')}:</span>
                      <span className="detail-value">{formatDateTime(fairDetails.fair.archivedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Application Statistics Section */}
              <div className="details-section">
                <h3>{t('fairAdmin.applicationStats')}</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-value">{fairDetails.applicationStats.total}</span>
                    <span className="stat-label">{t('fairAdmin.totalApplications')}</span>
                  </div>
                  <div className="stat-card stat-approved">
                    <span className="stat-value">{fairDetails.applicationStats.approved}</span>
                    <span className="stat-label">{t('applicationReview.approved')}</span>
                  </div>
                  <div className="stat-card stat-rejected">
                    <span className="stat-value">{fairDetails.applicationStats.rejected}</span>
                    <span className="stat-label">{t('applicationReview.rejected')}</span>
                  </div>
                  <div className="stat-card stat-pending">
                    <span className="stat-value">{fairDetails.applicationStats.pending}</span>
                    <span className="stat-label">{t('applicationReview.pending')}</span>
                  </div>
                </div>
              </div>

              {/* Revenue Section */}
              <div className="details-section">
                <h3>{t('fairAdmin.revenueSummary')}</h3>
                <div className="revenue-summary">
                  <span className="revenue-label">{t('fairAdmin.totalRevenue')}:</span>
                  <span className="revenue-value">${fairDetails.totalRevenue.toFixed(2)}</span>
                </div>
              </div>

              {/* Rented Houses Section */}
              <div className="details-section">
                <h3>{t('fairAdmin.rentedHouses')} ({fairDetails.rentedHouses.length})</h3>
                {fairDetails.rentedHouses.length === 0 ? (
                  <p className="no-data">{t('fairAdmin.noRentedHouses')}</p>
                ) : (
                  <table className="details-table">
                    <thead>
                      <tr>
                        <th>{t('fairAdmin.houseNumber')}</th>
                        <th>{t('fairAdmin.areaSqm')}</th>
                        <th>{t('application.price')}</th>
                        <th>{t('auth.roleVendor')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fairDetails.rentedHouses.map((house) => (
                        <tr key={house.id}>
                          <td>{house.houseNumber}</td>
                          <td>{house.areaSqm || '-'}</td>
                          <td>{house.price ? `$${house.price}` : '-'}</td>
                          <td>{house.vendorCompany || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Participating Vendors Section */}
              <div className="details-section">
                <h3>{t('fairAdmin.participatingVendors')} ({fairDetails.participatingVendors.length})</h3>
                {fairDetails.participatingVendors.length === 0 ? (
                  <p className="no-data">{t('fairAdmin.noParticipatingVendors')}</p>
                ) : (
                  <table className="details-table">
                    <thead>
                      <tr>
                        <th>{t('applicationReview.company')}</th>
                        <th>{t('applicationReview.category')}</th>
                        <th>{t('applicationReview.contact')}</th>
                        <th>{t('applicationReview.house')}</th>
                        <th>{t('fairAdmin.bookingStatus')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fairDetails.participatingVendors.map((vendor) => (
                        <tr key={vendor.vendorId}>
                          <td>{vendor.companyName || '-'}</td>
                          <td>{vendor.productCategory ? t(`categories.${vendor.productCategory}`, vendor.productCategory) : '-'}</td>
                          <td>
                            <div>{vendor.contactName || '-'}</div>
                            <div className="contact-email">{vendor.contactEmail}</div>
                          </td>
                          <td>{vendor.houseNumber}</td>
                          <td>
                            <span className={`badge ${vendor.bookingStatus === 'approved' ? 'badge-success' : 'badge-secondary'}`}>
                              {t(`applications.status.${vendor.bookingStatus}`, vendor.bookingStatus)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeDetailsModal}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FairManagement;
