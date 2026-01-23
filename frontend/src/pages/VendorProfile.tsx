import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { vendorApi } from '../services/api';
import './VendorProfile.css';

interface ProductImage {
  id: string;
  imageUrl: string;
  orderIndex: number;
}

interface Profile {
  id: string;
  companyName: string | null;
  businessDescription: string | null;
  productCategory: string | null;
  logoUrl: string | null;
  contactEmail: string;
  contactName: string;
  firstName: string | null;
  lastName: string | null;
  contactPhone: string | null;
  productImages: ProductImage[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3002';
const MAX_PRODUCT_IMAGES = 5;

const VendorProfile: React.FC = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [productCategory, setProductCategory] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vendorApi.getProfile();
      setProfile(response.profile);
      populateForm(response.profile);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (p: Profile) => {
    setFirstName(p.firstName || '');
    setLastName(p.lastName || '');
    setPhone(p.contactPhone || '');
    setEmail(p.contactEmail || '');
    setCompanyName(p.companyName || '');
    setBusinessDescription(p.businessDescription || '');
    setProductCategory(p.productCategory || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await vendorApi.updateProfile({
        firstName,
        lastName,
        phone,
        email,
        companyName,
        businessDescription,
        productCategory,
      });

      setProfile(response.profile);
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      populateForm(profile);
    }
    setIsEditing(false);
    setError(null);
  };

  const handleLogoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      return;
    }

    try {
      setUploadingLogo(true);
      setError(null);
      setSuccessMessage(null);

      const response = await vendorApi.uploadLogo(file);

      // Update profile with new logo URL
      if (profile) {
        setProfile({ ...profile, logoUrl: response.logoUrl });
      }

      setSuccessMessage('Logo uploaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      setError(err.response?.data?.error || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm('Are you sure you want to delete your logo?')) return;

    try {
      setUploadingLogo(true);
      setError(null);
      setSuccessMessage(null);

      await vendorApi.deleteLogo();

      // Update profile to remove logo URL
      if (profile) {
        setProfile({ ...profile, logoUrl: null });
      }

      setSuccessMessage('Logo deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting logo:', err);
      setError(err.response?.data?.error || 'Failed to delete logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleProductImageUploadClick = () => {
    productImageInputRef.current?.click();
  };

  const handleProductImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if already at max
    if (profile && profile.productImages.length >= MAX_PRODUCT_IMAGES) {
      setError(`Maximum of ${MAX_PRODUCT_IMAGES} product images allowed.`);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      return;
    }

    try {
      setUploadingProductImage(true);
      setError(null);
      setSuccessMessage(null);

      const response = await vendorApi.uploadProductImage(file);

      // Add new image to profile
      if (profile) {
        setProfile({
          ...profile,
          productImages: [...profile.productImages, response.productImage],
        });
      }

      setSuccessMessage('Product image uploaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error uploading product image:', err);
      setError(err.response?.data?.error || 'Failed to upload product image');
    } finally {
      setUploadingProductImage(false);
      // Reset file input
      if (productImageInputRef.current) {
        productImageInputRef.current.value = '';
      }
    }
  };

  const handleDeleteProductImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this product image?')) return;

    try {
      setDeletingImageId(imageId);
      setError(null);
      setSuccessMessage(null);

      await vendorApi.deleteProductImage(imageId);

      // Remove image from profile
      if (profile) {
        setProfile({
          ...profile,
          productImages: profile.productImages.filter(img => img.id !== imageId),
        });
      }

      setSuccessMessage('Product image deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting product image:', err);
      setError(err.response?.data?.error || 'Failed to delete product image');
    } finally {
      setDeletingImageId(null);
    }
  };

  const getImageUrl = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http')) return imageUrl;
    // Otherwise, prepend the API base URL
    return `${API_BASE_URL}${imageUrl}`;
  };

  const getCategoryLabel = (category: string | null) => {
    if (category) {
      return t(`categories.${category}`, category);
    }
    switch (category) {
      default:
        return category || 'Not set';
    }
  };

  const getLogoUrl = (logoUrl: string | null) => {
    if (!logoUrl) return null;
    // If it's already a full URL, return as is
    if (logoUrl.startsWith('http')) return logoUrl;
    // Otherwise, prepend the API base URL
    return `${API_BASE_URL}${logoUrl}`;
  };

  if (loading) {
    return (
      <div className="vendor-profile-container">
        <div className="loading-spinner">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="vendor-profile-container">
      <div className="page-header">
        <h1>{t('vendor.profile', { defaultValue: 'Profil' })}</h1>
        {!isEditing && (
          <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
            Edit Profile
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {isEditing ? (
        <form onSubmit={handleSave} className="profile-form">
          <div className="form-section">
            <h3>Contact Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Business Information</h3>
            <div className="form-group">
              <label htmlFor="companyName">Company Name</label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="productCategory">Product Category</label>
              <select
                id="productCategory"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
              >
                <option value="">Select category</option>
                <option value="food_beverages">Food & Beverages</option>
                <option value="handicrafts">Handicrafts</option>
                <option value="clothing">Clothing</option>
                <option value="accessories">Accessories</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label htmlFor="businessDescription">Business Description</label>
              <textarea
                id="businessDescription"
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="Describe your business and products..."
                rows={4}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-view">
          {/* Logo Section */}
          <div className="profile-section logo-section">
            <h3>Company Logo</h3>
            <div className="logo-upload-container">
              {profile?.logoUrl ? (
                <div className="logo-preview">
                  <img src={getLogoUrl(profile.logoUrl) || ''} alt="Company Logo" />
                  <div className="logo-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleLogoUploadClick}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? 'Uploading...' : 'Replace Logo'}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={handleDeleteLogo}
                      disabled={uploadingLogo}
                    >
                      Delete Logo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="logo-placeholder">
                  <div className="placeholder-icon">📷</div>
                  <p>No logo uploaded</p>
                  <button
                    className="btn btn-primary"
                    onClick={handleLogoUploadClick}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </button>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoFileChange}
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
              />
              <p className="upload-hint">Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB</p>
            </div>
          </div>

          <div className="profile-section">
            <h3>Contact Information</h3>
            <div className="profile-grid">
              <div className="profile-item">
                <span className="profile-label">Name:</span>
                <span className="profile-value">{profile?.contactName || 'Not set'}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Email:</span>
                <span className="profile-value">{profile?.contactEmail}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Phone:</span>
                <span className="profile-value">{profile?.contactPhone || 'Not set'}</span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Business Information</h3>
            <div className="profile-grid">
              <div className="profile-item">
                <span className="profile-label">Company Name:</span>
                <span className="profile-value">{profile?.companyName || 'Not set'}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">Category:</span>
                <span className="profile-value">{getCategoryLabel(profile?.productCategory || null)}</span>
              </div>
              <div className="profile-item full-width">
                <span className="profile-label">Business Description:</span>
                <span className="profile-value description">
                  {profile?.businessDescription || 'Not set'}
                </span>
              </div>
            </div>
          </div>

          {/* Product Images Section */}
          <div className="profile-section product-images-section">
            <div className="section-header">
              <h3>Product Images</h3>
              <span className="image-count">
                {profile?.productImages?.length || 0} / {MAX_PRODUCT_IMAGES}
              </span>
            </div>

            <div className="product-images-container">
              <div className="product-images-grid">
                {profile?.productImages?.map((img) => (
                  <div key={img.id} className="product-image-item">
                    <img src={getImageUrl(img.imageUrl) || ''} alt={`Product ${img.orderIndex + 1}`} />
                    <button
                      className="delete-image-btn"
                      onClick={() => handleDeleteProductImage(img.id)}
                      disabled={deletingImageId === img.id}
                      title="Delete image"
                    >
                      {deletingImageId === img.id ? '...' : '×'}
                    </button>
                  </div>
                ))}

                {/* Upload placeholder - show if less than max images */}
                {(!profile?.productImages || profile.productImages.length < MAX_PRODUCT_IMAGES) && (
                  <div
                    className={`product-image-upload ${uploadingProductImage ? 'uploading' : ''}`}
                    onClick={uploadingProductImage ? undefined : handleProductImageUploadClick}
                  >
                    {uploadingProductImage ? (
                      <div className="upload-spinner">Uploading...</div>
                    ) : (
                      <>
                        <span className="upload-icon">+</span>
                        <span className="upload-text">Add Image</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={productImageInputRef}
                onChange={handleProductImageFileChange}
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
              />

              <p className="upload-hint">
                Upload up to {MAX_PRODUCT_IMAGES} product images. Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB each.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorProfile;
