import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../services/api';
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
  status: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  status: string;
}

const initialFormData: FairFormData = {
  name: '',
  descriptionAz: '',
  descriptionEn: '',
  startDate: '',
  endDate: '',
  locationAddress: '',
  mapCenterLat: '',
  mapCenterLng: '',
  bannerImageUrl: '',
  status: 'upcoming',
};

const FairManagement: React.FC = () => {
  const { t } = useTranslation();
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [pastFairs, setPastFairs] = useState<Fair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFair, setSelectedFair] = useState<Fair | null>(null);
  const [formData, setFormData] = useState<FairFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);

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
      setError('Failed to load fairs');
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

  const handleArchiveFairs = async () => {
    if (!window.confirm('This will archive all fairs that ended more than 30 days ago. Continue?')) {
      return;
    }

    try {
      setArchiving(true);
      const result = await adminApi.archiveFairs();

      if (result.archivedCount > 0) {
        setSuccessMessage(`Successfully archived ${result.archivedCount} fair(s)!`);
      } else {
        setSuccessMessage('No fairs needed to be archived.');
      }

      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh both lists
      fetchFairs();
      fetchPastFairs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to archive fairs');
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
    setError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (fair: Fair) => {
    setSelectedFair(fair);
    setFormData({
      name: fair.name,
      descriptionAz: fair.descriptionAz || '',
      descriptionEn: fair.descriptionEn || '',
      startDate: fair.startDate.split('T')[0],
      endDate: fair.endDate.split('T')[0],
      locationAddress: fair.locationAddress || '',
      mapCenterLat: fair.mapCenterLat?.toString() || '',
      mapCenterLng: fair.mapCenterLng?.toString() || '',
      bannerImageUrl: fair.bannerImageUrl || '',
      status: fair.status,
    });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedFair(null);
    resetForm();
  };

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
        status: formData.status,
      });

      setSuccessMessage('Fair created successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      closeModals();
      fetchFairs();
      fetchPastFairs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create fair');
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
        status: formData.status,
      });

      setSuccessMessage('Fair updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      closeModals();
      fetchFairs();
      fetchPastFairs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update fair');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFair = async (fair: Fair) => {
    if (!window.confirm(`Are you sure you want to delete "${fair.name}"?`)) {
      return;
    }

    try {
      await adminApi.deleteFair(fair.id);
      setSuccessMessage('Fair deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchFairs();
      fetchPastFairs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete fair');
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
      upcoming: 'Upcoming',
      active: 'Active',
      completed: 'Completed',
      archived: 'Archived',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="fair-management-container">
        <div className="loading-spinner">
          {t('Loading...', { defaultValue: 'Loading...' })}
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
            {archiving ? 'Archiving...' : 'Run Archive'}
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            {t('Create Fair', { defaultValue: 'Create Fair' })}
          </button>
        </div>
      </div>

      {fairs.length === 0 ? (
        <div className="no-fairs">
          <p>{t('No active fairs found. Create your first fair!', { defaultValue: 'No active fairs found. Create your first fair!' })}</p>
        </div>
      ) : (
        <div className="fairs-table-container">
          <table className="fairs-table">
            <thead>
              <tr>
                <th>{t('Name', { defaultValue: 'Name' })}</th>
                <th>{t('Start Date', { defaultValue: 'Start Date' })}</th>
                <th>{t('End Date', { defaultValue: 'End Date' })}</th>
                <th>{t('Location', { defaultValue: 'Location' })}</th>
                <th>{t('Status', { defaultValue: 'Status' })}</th>
                <th>{t('Actions', { defaultValue: 'Actions' })}</th>
              </tr>
            </thead>
            <tbody>
              {fairs.map((fair) => (
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
                      {t('Edit', { defaultValue: 'Edit' })}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteFair(fair)}
                    >
                      {t('Delete', { defaultValue: 'Delete' })}
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
            {showPastEvents ? '▼' : '►'} Past Events ({pastFairs.length})
          </h2>
        </div>

        {showPastEvents && (
          pastFairs.length === 0 ? (
            <div className="no-fairs">
              <p>No past events found.</p>
            </div>
          ) : (
            <div className="fairs-table-container past-fairs-table">
              <table className="fairs-table">
                <thead>
                  <tr>
                    <th>{t('Name', { defaultValue: 'Name' })}</th>
                    <th>{t('Start Date', { defaultValue: 'Start Date' })}</th>
                    <th>{t('End Date', { defaultValue: 'End Date' })}</th>
                    <th>{t('Location', { defaultValue: 'Location' })}</th>
                    <th>{t('Status', { defaultValue: 'Status' })}</th>
                    <th>{t('Archived At', { defaultValue: 'Archived At' })}</th>
                    <th>{t('Actions', { defaultValue: 'Actions' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {pastFairs.map((fair) => (
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
                          {t('Edit', { defaultValue: 'Edit' })}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteFair(fair)}
                        >
                          {t('Delete', { defaultValue: 'Delete' })}
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
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('Create New Fair', { defaultValue: 'Create New Fair' })}</h2>
              <button className="modal-close" onClick={closeModals}>&times;</button>
            </div>
            <form onSubmit={handleCreateFair}>
              {error && <div className="form-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="name">{t('Fair Name', { defaultValue: 'Fair Name' })} *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Winter 2026"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">{t('Start Date', { defaultValue: 'Start Date' })} *</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">{t('End Date', { defaultValue: 'End Date' })} *</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="locationAddress">{t('Location Address', { defaultValue: 'Location Address' })}</label>
                <input
                  type="text"
                  id="locationAddress"
                  name="locationAddress"
                  value={formData.locationAddress}
                  onChange={handleInputChange}
                  placeholder="e.g., Baku, Azerbaijan"
                />
              </div>

              <div className="form-group">
                <label htmlFor="descriptionAz">{t('Description (Azerbaijani)', { defaultValue: 'Description (Azerbaijani)' })}</label>
                <textarea
                  id="descriptionAz"
                  name="descriptionAz"
                  value={formData.descriptionAz}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Azerbaijani description..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="descriptionEn">{t('Description (English)', { defaultValue: 'Description (English)' })}</label>
                <textarea
                  id="descriptionEn"
                  name="descriptionEn"
                  value={formData.descriptionEn}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="English description..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="mapCenterLat">{t('Map Center Latitude', { defaultValue: 'Map Center Latitude' })}</label>
                  <input
                    type="number"
                    id="mapCenterLat"
                    name="mapCenterLat"
                    value={formData.mapCenterLat}
                    onChange={handleInputChange}
                    step="any"
                    placeholder="e.g., 40.4093"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="mapCenterLng">{t('Map Center Longitude', { defaultValue: 'Map Center Longitude' })}</label>
                  <input
                    type="number"
                    id="mapCenterLng"
                    name="mapCenterLng"
                    value={formData.mapCenterLng}
                    onChange={handleInputChange}
                    step="any"
                    placeholder="e.g., 49.8671"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="bannerImageUrl">{t('Banner Image URL', { defaultValue: 'Banner Image URL' })}</label>
                <input
                  type="url"
                  id="bannerImageUrl"
                  name="bannerImageUrl"
                  value={formData.bannerImageUrl}
                  onChange={handleInputChange}
                  placeholder="https://..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">{t('Status', { defaultValue: 'Status' })}</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  {t('Cancel', { defaultValue: 'Cancel' })}
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? t('Creating...', { defaultValue: 'Creating...' }) : t('Create Fair', { defaultValue: 'Create Fair' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Fair Modal */}
      {showEditModal && selectedFair && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('Edit Fair', { defaultValue: 'Edit Fair' })}</h2>
              <button className="modal-close" onClick={closeModals}>&times;</button>
            </div>
            <form onSubmit={handleUpdateFair}>
              {error && <div className="form-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="name">{t('Fair Name', { defaultValue: 'Fair Name' })} *</label>
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
                  <label htmlFor="startDate">{t('Start Date', { defaultValue: 'Start Date' })} *</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate">{t('End Date', { defaultValue: 'End Date' })} *</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="locationAddress">{t('Location Address', { defaultValue: 'Location Address' })}</label>
                <input
                  type="text"
                  id="locationAddress"
                  name="locationAddress"
                  value={formData.locationAddress}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="descriptionAz">{t('Description (Azerbaijani)', { defaultValue: 'Description (Azerbaijani)' })}</label>
                <textarea
                  id="descriptionAz"
                  name="descriptionAz"
                  value={formData.descriptionAz}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="descriptionEn">{t('Description (English)', { defaultValue: 'Description (English)' })}</label>
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
                  <label htmlFor="mapCenterLat">{t('Map Center Latitude', { defaultValue: 'Map Center Latitude' })}</label>
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
                  <label htmlFor="mapCenterLng">{t('Map Center Longitude', { defaultValue: 'Map Center Longitude' })}</label>
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
                <label htmlFor="bannerImageUrl">{t('Banner Image URL', { defaultValue: 'Banner Image URL' })}</label>
                <input
                  type="url"
                  id="bannerImageUrl"
                  name="bannerImageUrl"
                  value={formData.bannerImageUrl}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">{t('Status', { defaultValue: 'Status' })}</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModals}>
                  {t('Cancel', { defaultValue: 'Cancel' })}
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? t('Saving...', { defaultValue: 'Saving...' }) : t('Save Changes', { defaultValue: 'Save Changes' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FairManagement;
