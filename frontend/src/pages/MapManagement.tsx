import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../services/api';
import './MapManagement.css';

interface VendorHouse {
  id: string;
  houseNumber: string;
  areaSqm: number | null;
  price: number | null;
  description: string | null;
  panorama360Url: string | null;
  isEnabled: boolean;
  latitude?: number;
  longitude?: number;
}

interface EditFormData {
  houseNumber: string;
  areaSqm: string;
  price: string;
  description: string;
  isEnabled: boolean;
}

const MapManagement: React.FC = () => {
  const { t } = useTranslation();
  const [houses, setHouses] = useState<VendorHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingHouse, setEditingHouse] = useState<VendorHouse | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    houseNumber: '',
    areaSqm: '',
    price: '',
    description: '',
    isEnabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deletingHouse, setDeletingHouse] = useState<VendorHouse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPanoramaId, setUploadingPanoramaId] = useState<string | null>(null);
  const panoramaInputRef = React.useRef<HTMLInputElement>(null);

  const fetchHouses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getVendorHouses();
      setHouses(data.houses || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load vendor houses';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHouses();
  }, [fetchHouses]);

  const handleEdit = (house: VendorHouse) => {
    setEditingHouse(house);
    setEditFormData({
      houseNumber: house.houseNumber,
      areaSqm: house.areaSqm !== null ? String(house.areaSqm) : '',
      price: house.price !== null ? String(house.price) : '',
      description: house.description || '',
      isEnabled: house.isEnabled,
    });
    setFormErrors({});
    setSuccessMessage('');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingHouse(null);
    setEditFormData({
      houseNumber: '',
      areaSqm: '',
      price: '',
      description: '',
      isEnabled: true,
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editFormData.houseNumber.trim()) {
      errors.houseNumber = 'House number is required';
    }

    if (editFormData.areaSqm && isNaN(parseFloat(editFormData.areaSqm))) {
      errors.areaSqm = 'Area must be a valid number';
    }

    if (editFormData.areaSqm && parseFloat(editFormData.areaSqm) < 0) {
      errors.areaSqm = 'Area cannot be negative';
    }

    if (editFormData.price && isNaN(parseFloat(editFormData.price))) {
      errors.price = 'Price must be a valid number';
    }

    if (editFormData.price && parseFloat(editFormData.price) < 0) {
      errors.price = 'Price cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!editingHouse || !validateForm()) return;

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const updateData: {
        houseNumber?: string;
        areaSqm?: number | null;
        price?: number | null;
        description?: string | null;
        isEnabled?: boolean;
      } = {};

      // Only send changed fields
      if (editFormData.houseNumber !== editingHouse.houseNumber) {
        updateData.houseNumber = editFormData.houseNumber.trim();
      }

      const newAreaSqm = editFormData.areaSqm ? parseFloat(editFormData.areaSqm) : null;
      if (newAreaSqm !== editingHouse.areaSqm) {
        updateData.areaSqm = newAreaSqm;
      }

      const newPrice = editFormData.price ? parseFloat(editFormData.price) : null;
      if (newPrice !== editingHouse.price) {
        updateData.price = newPrice;
      }

      const newDescription = editFormData.description.trim() || null;
      if (newDescription !== editingHouse.description) {
        updateData.description = newDescription;
      }

      if (editFormData.isEnabled !== editingHouse.isEnabled) {
        updateData.isEnabled = editFormData.isEnabled;
      }

      // Check if anything changed
      if (Object.keys(updateData).length === 0) {
        setSuccessMessage('No changes to save');
        setEditingHouse(null);
        return;
      }

      const result = await adminApi.updateVendorHouse(editingHouse.id, updateData);

      // Update local state
      setHouses((prev) =>
        prev.map((h) =>
          h.id === editingHouse.id
            ? { ...h, ...result.vendorHouse }
            : h
        )
      );

      setSuccessMessage(`Vendor house "${result.vendorHouse.houseNumber}" updated successfully`);
      setEditingHouse(null);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || 'Failed to update vendor house');
      } else {
        setError('Failed to update vendor house');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (field: keyof EditFormData, value: string | boolean) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleDeleteClick = (house: VendorHouse) => {
    setDeletingHouse(house);
    setSuccessMessage('');
    setError('');
  };

  const handleCancelDelete = () => {
    setDeletingHouse(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingHouse) return;

    try {
      setDeleting(true);
      setError('');
      setSuccessMessage('');

      const result = await adminApi.deleteVendorHouse(deletingHouse.id);

      // Remove from local state
      setHouses((prev) => prev.filter((h) => h.id !== deletingHouse.id));
      setSuccessMessage(result.message || `Vendor house "${deletingHouse.houseNumber}" deleted successfully`);
      setDeletingHouse(null);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || 'Failed to delete vendor house');
      } else {
        setError('Failed to delete vendor house');
      }
      setDeletingHouse(null);
    } finally {
      setDeleting(false);
    }
  };

  const handlePanoramaUploadClick = (houseId: string) => {
    setUploadingPanoramaId(houseId);
    setSuccessMessage('');
    setError('');
    // Trigger hidden file input
    if (panoramaInputRef.current) {
      panoramaInputRef.current.value = '';
      panoramaInputRef.current.click();
    }
  };

  const handlePanoramaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingPanoramaId) {
      setUploadingPanoramaId(null);
      return;
    }

    try {
      setError('');
      setSuccessMessage('');

      const result = await adminApi.uploadVendorHousePanorama(uploadingPanoramaId, file);

      // Update local state
      setHouses((prev) =>
        prev.map((h) =>
          h.id === uploadingPanoramaId
            ? { ...h, panorama360Url: result.vendorHouse.panorama360Url }
            : h
        )
      );

      setSuccessMessage(result.message || 'Panorama image uploaded successfully');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || 'Failed to upload panorama image');
      } else {
        setError('Failed to upload panorama image');
      }
    } finally {
      setUploadingPanoramaId(null);
    }
  };

  if (loading) {
    return (
      <div className="map-management-container">
        <div className="loading-spinner">Loading vendor houses...</div>
      </div>
    );
  }

  return (
    <div className="map-management-container">
      {/* Hidden file input for panorama upload */}
      <input
        ref={panoramaInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handlePanoramaFileChange}
      />

      <div className="map-mgmt-header">
        <h2>{t('admin.mapManagement', { defaultValue: 'Map Management' })}</h2>
        <p className="map-mgmt-subtitle">
          Manage vendor houses, their properties, and availability.
        </p>
      </div>

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* Edit Modal */}
      {editingHouse && (
        <div className="edit-modal-overlay" onClick={handleCancelEdit}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Edit Vendor House: {editingHouse.houseNumber}</h3>
              <button
                className="btn-close"
                onClick={handleCancelEdit}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="edit-modal-body">
              <div className={`form-group ${formErrors.houseNumber ? 'has-error' : ''}`}>
                <label htmlFor="houseNumber">House Number *</label>
                <input
                  id="houseNumber"
                  type="text"
                  value={editFormData.houseNumber}
                  onChange={(e) => handleFormChange('houseNumber', e.target.value)}
                  className={formErrors.houseNumber ? 'input-error' : ''}
                  placeholder="e.g. H-01"
                />
                {formErrors.houseNumber && (
                  <span className="field-error">{formErrors.houseNumber}</span>
                )}
              </div>

              <div className={`form-group ${formErrors.areaSqm ? 'has-error' : ''}`}>
                <label htmlFor="areaSqm">Area (m²)</label>
                <input
                  id="areaSqm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={editFormData.areaSqm}
                  onChange={(e) => handleFormChange('areaSqm', e.target.value)}
                  className={formErrors.areaSqm ? 'input-error' : ''}
                  placeholder="e.g. 130"
                />
                {formErrors.areaSqm && (
                  <span className="field-error">{formErrors.areaSqm}</span>
                )}
              </div>

              <div className={`form-group ${formErrors.price ? 'has-error' : ''}`}>
                <label htmlFor="price">Price (AZN)</label>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.price}
                  onChange={(e) => handleFormChange('price', e.target.value)}
                  className={formErrors.price ? 'input-error' : ''}
                  placeholder="e.g. 500"
                />
                {formErrors.price && (
                  <span className="field-error">{formErrors.price}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Optional description of the vendor house"
                />
              </div>

              <div className="form-group form-group-checkbox">
                <label htmlFor="isEnabled" className="checkbox-label">
                  <input
                    id="isEnabled"
                    type="checkbox"
                    checked={editFormData.isEnabled}
                    onChange={(e) => handleFormChange('isEnabled', e.target.checked)}
                  />
                  <span>Enabled (visible on map)</span>
                </label>
              </div>
            </div>

            <div className="edit-modal-footer">
              <button
                className="btn btn-secondary"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingHouse && (
        <div className="edit-modal-overlay" onClick={handleCancelDelete}>
          <div className="edit-modal delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>Delete Vendor House</h3>
              <button
                className="btn-close"
                onClick={handleCancelDelete}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="edit-modal-body">
              <p className="delete-warning">
                Are you sure you want to delete vendor house <strong>{deletingHouse.houseNumber}</strong>?
              </p>
              <p className="delete-note">
                This action cannot be undone. The house and all its non-pending data will be permanently removed.
              </p>
            </div>
            <div className="edit-modal-footer">
              <button
                className="btn btn-secondary"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete House'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Houses Table */}
      {houses.length === 0 ? (
        <div className="no-houses">
          <p>No vendor houses found.</p>
          <p>Vendor houses are created through fair setup or database seeding.</p>
        </div>
      ) : (
        <div className="houses-table-container">
          <table className="houses-table">
            <thead>
              <tr>
                <th>House #</th>
                <th>Area (m²)</th>
                <th>Price (AZN)</th>
                <th>Description</th>
                <th>Panorama</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {houses.map((house) => (
                <tr key={house.id} className={!house.isEnabled ? 'house-disabled' : ''}>
                  <td className="house-number-cell">
                    <strong>{house.houseNumber}</strong>
                  </td>
                  <td>{house.areaSqm !== null ? `${house.areaSqm} m²` : '—'}</td>
                  <td>{house.price !== null ? `${house.price} AZN` : '—'}</td>
                  <td className="description-cell">
                    {house.description || '—'}
                  </td>
                  <td>
                    {house.panorama360Url ? (
                      <span className="badge badge-success">Yes</span>
                    ) : (
                      <span className="badge badge-muted">No</span>
                    )}
                  </td>
                  <td>
                    {house.isEnabled ? (
                      <span className="badge badge-active">Active</span>
                    ) : (
                      <span className="badge badge-inactive">Disabled</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleEdit(house)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-panorama"
                      onClick={() => handlePanoramaUploadClick(house.id)}
                      disabled={uploadingPanoramaId === house.id}
                    >
                      {uploadingPanoramaId === house.id ? 'Uploading...' : 'Upload Panorama'}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteClick(house)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MapManagement;
