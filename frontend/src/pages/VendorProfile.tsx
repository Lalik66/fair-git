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

interface FieldErrors {
  companyName?: string;
  email?: string;
  phone?: string;
  productCategory?: string;
  businessDescription?: string;
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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
      setError(err.response?.data?.error || t('vendorProfile.loadFailed'));
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

  // Validate form fields and return true if valid
  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    // Company name is required
    if (!companyName.trim()) {
      errors.companyName = t('validation.companyNameRequired', 'Company name is required');
    }

    // Email is required and must be valid
    if (!email.trim()) {
      errors.email = t('validation.emailRequired', 'Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t('validation.emailInvalid', 'Please enter a valid email address');
    }

    // Product category is required
    if (!productCategory) {
      errors.productCategory = t('validation.categoryRequired', 'Product category is required');
    }

    // Business description is required
    if (!businessDescription.trim()) {
      errors.businessDescription = t('validation.descriptionRequired', 'Business description is required');
    }

    // Phone number validation (optional but must be valid format if provided)
    if (phone.trim()) {
      // Allow formats like: +994501234567, 994501234567, 0501234567, 050-123-45-67, (050) 123 45 67
      const phoneRegex = /^[+]?[\d\s\-()]{7,20}$/;
      if (!phoneRegex.test(phone.trim())) {
        errors.phone = t('validation.invalidPhone', 'Please enter a valid phone number');
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Clear field error when user starts typing
  const clearFieldError = (field: keyof FieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submitting
    if (!validateForm()) {
      setError(t('validation.fixErrors', 'Please fix the errors below before submitting'));
      return;
    }

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
      setSuccessMessage(t('vendorProfile.profileUpdated'));
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.response?.data?.error || t('vendorProfile.saveFailed'));
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
    setFieldErrors({});
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
      setError(t('vendorProfile.invalidFileType'));
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('vendorProfile.fileTooLarge'));
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

      setSuccessMessage(t('vendorProfile.logoUploaded'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      setError(err.response?.data?.error || t('vendorProfile.logoUploadFailed'));
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm(t('vendorProfile.deleteLogoConfirm'))) return;

    try {
      setUploadingLogo(true);
      setError(null);
      setSuccessMessage(null);

      await vendorApi.deleteLogo();

      // Update profile to remove logo URL
      if (profile) {
        setProfile({ ...profile, logoUrl: null });
      }

      setSuccessMessage(t('vendorProfile.logoDeleted'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting logo:', err);
      setError(err.response?.data?.error || t('vendorProfile.logoDeleteFailed'));
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
      setError(t('vendorProfile.maxImages', { max: MAX_PRODUCT_IMAGES }));
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError(t('vendorProfile.invalidFileType'));
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('vendorProfile.fileTooLarge'));
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

      setSuccessMessage(t('vendorProfile.imageUploaded'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error uploading product image:', err);
      setError(err.response?.data?.error || t('vendorProfile.imageUploadFailed'));
    } finally {
      setUploadingProductImage(false);
      // Reset file input
      if (productImageInputRef.current) {
        productImageInputRef.current.value = '';
      }
    }
  };

  const handleDeleteProductImage = async (imageId: string) => {
    if (!confirm(t('vendorProfile.deleteImageConfirm'))) return;

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

      setSuccessMessage(t('vendorProfile.imageDeleted'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting product image:', err);
      setError(err.response?.data?.error || t('vendorProfile.imageDeleteFailed'));
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
        return category || t('common.notSet');
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
        <div className="loading-spinner">{t('vendorProfile.loadingProfile')}</div>
      </div>
    );
  }

  return (
    <div className="vendor-profile-container">
      <div className="page-header">
        <h1>{t('vendor.profile', { defaultValue: 'Profil' })}</h1>
        {!isEditing && (
          <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
            {t('vendorProfile.editProfile')}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {isEditing ? (
        <form onSubmit={handleSave} className="profile-form" noValidate>
          <div className="form-section">
            <h3>{t('vendorProfile.contactInfo')}</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">{t('vendorProfile.firstName')}</label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('vendorProfile.firstNamePlaceholder')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">{t('vendorProfile.lastName')}</label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('vendorProfile.lastNamePlaceholder')}
                />
              </div>
            </div>
            <div className="form-row">
              <div className={`form-group ${fieldErrors.email ? 'has-error' : ''}`}>
                <label htmlFor="email">{t('vendorProfile.email')} <span className="required">*</span></label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError('email');
                  }}
                  placeholder={t('vendorProfile.emailPlaceholder')}
                  className={fieldErrors.email ? 'input-error' : ''}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
                {fieldErrors.email && (
                  <span className="field-error" id="email-error" role="alert">
                    {fieldErrors.email}
                  </span>
                )}
              </div>
              <div className={`form-group ${fieldErrors.phone ? 'has-error' : ''}`}>
                <label htmlFor="phone">{t('vendorProfile.phone')}</label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) {
                      setFieldErrors(prev => ({ ...prev, phone: undefined }));
                    }
                  }}
                  placeholder={t('vendorProfile.phonePlaceholder')}
                  className={fieldErrors.phone ? 'input-error' : ''}
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                />
                {fieldErrors.phone && (
                  <span className="field-error" id="phone-error" role="alert">
                    {fieldErrors.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>{t('vendorProfile.businessInfo')}</h3>
            <div className={`form-group ${fieldErrors.companyName ? 'has-error' : ''}`}>
              <label htmlFor="companyName">{t('vendorProfile.companyName')} <span className="required">*</span></label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  clearFieldError('companyName');
                }}
                placeholder={t('vendorProfile.companyNamePlaceholder')}
                className={fieldErrors.companyName ? 'input-error' : ''}
                aria-invalid={!!fieldErrors.companyName}
                aria-describedby={fieldErrors.companyName ? 'companyName-error' : undefined}
              />
              {fieldErrors.companyName && (
                <span className="field-error" id="companyName-error" role="alert">
                  {fieldErrors.companyName}
                </span>
              )}
            </div>
            <div className={`form-group ${fieldErrors.productCategory ? 'has-error' : ''}`}>
              <label htmlFor="productCategory">{t('vendorProfile.productCategory')} <span className="required">*</span></label>
              <select
                id="productCategory"
                value={productCategory}
                onChange={(e) => {
                  setProductCategory(e.target.value);
                  clearFieldError('productCategory');
                }}
                className={fieldErrors.productCategory ? 'input-error' : ''}
                aria-invalid={!!fieldErrors.productCategory}
                aria-describedby={fieldErrors.productCategory ? 'productCategory-error' : undefined}
              >
                <option value="">{t('vendorProfile.selectCategory')}</option>
                <option value="food_beverages">{t('categories.food_beverages')}</option>
                <option value="handicrafts">{t('categories.handicrafts')}</option>
                <option value="clothing">{t('categories.clothing')}</option>
                <option value="accessories">{t('categories.accessories')}</option>
                <option value="other">{t('categories.other')}</option>
              </select>
              {fieldErrors.productCategory && (
                <span className="field-error" id="productCategory-error" role="alert">
                  {fieldErrors.productCategory}
                </span>
              )}
            </div>
            <div className={`form-group full-width ${fieldErrors.businessDescription ? 'has-error' : ''}`}>
              <label htmlFor="businessDescription">{t('vendorProfile.businessDescription')} <span className="required">*</span></label>
              <textarea
                id="businessDescription"
                value={businessDescription}
                onChange={(e) => {
                  setBusinessDescription(e.target.value);
                  clearFieldError('businessDescription');
                }}
                placeholder={t('vendorProfile.descriptionPlaceholder')}
                rows={4}
                className={fieldErrors.businessDescription ? 'input-error' : ''}
                aria-invalid={!!fieldErrors.businessDescription}
                aria-describedby={fieldErrors.businessDescription ? 'businessDescription-error' : undefined}
              />
              {fieldErrors.businessDescription && (
                <span className="field-error" id="businessDescription-error" role="alert">
                  {fieldErrors.businessDescription}
                </span>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t('common.saving') : t('vendorProfile.saveChanges')}
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-view">
          {/* Logo Section */}
          <div className="profile-section logo-section">
            <h3>{t('vendorProfile.companyLogo')}</h3>
            <div className="logo-upload-container">
              {profile?.logoUrl ? (
                <div className="logo-preview">
                  <img src={getLogoUrl(profile.logoUrl) || ''} alt={t('vendorProfile.companyLogo')} loading="lazy" />
                  <div className="logo-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleLogoUploadClick}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? t('mapManagement.uploading') : t('vendorProfile.replaceLogo')}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={handleDeleteLogo}
                      disabled={uploadingLogo}
                    >
                      {t('vendorProfile.deleteLogo')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="logo-placeholder">
                  <div className="placeholder-icon">📷</div>
                  <p>{t('vendorProfile.noLogo')}</p>
                  <button
                    className="btn btn-primary"
                    onClick={handleLogoUploadClick}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? t('mapManagement.uploading') : t('vendorProfile.uploadLogo')}
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
              <p className="upload-hint">{t('vendorProfile.uploadHint')}</p>
            </div>
          </div>

          <div className="profile-section">
            <h3>{t('vendorProfile.contactInfo')}</h3>
            <div className="profile-grid">
              <div className="profile-item">
                <span className="profile-label">{t('vendorProfile.viewName')}</span>
                <span className="profile-value">{profile?.contactName || t('common.notSet')}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">{t('vendorProfile.viewEmail')}</span>
                <span className="profile-value">{profile?.contactEmail}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">{t('vendorProfile.viewPhone')}</span>
                <span className="profile-value">{profile?.contactPhone || t('common.notSet')}</span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>{t('vendorProfile.businessInfo')}</h3>
            <div className="profile-grid">
              <div className="profile-item">
                <span className="profile-label">{t('vendorProfile.viewCompany')}</span>
                <span className="profile-value">{profile?.companyName || t('common.notSet')}</span>
              </div>
              <div className="profile-item">
                <span className="profile-label">{t('vendorProfile.viewCategory')}</span>
                <span className="profile-value">{getCategoryLabel(profile?.productCategory || null)}</span>
              </div>
              <div className="profile-item full-width">
                <span className="profile-label">{t('vendorProfile.viewDescription')}</span>
                <span className="profile-value description">
                  {profile?.businessDescription || t('common.notSet')}
                </span>
              </div>
            </div>
          </div>

          {/* Product Images Section */}
          <div className="profile-section product-images-section">
            <div className="section-header">
              <h3>{t('vendorProfile.productImages')}</h3>
              <span className="image-count">
                {profile?.productImages?.length || 0} / {MAX_PRODUCT_IMAGES}
              </span>
            </div>

            <div className="product-images-container">
              <div className="product-images-grid">
                {profile?.productImages?.map((img) => (
                  <div key={img.id} className="product-image-item">
                    <img src={getImageUrl(img.imageUrl) || ''} alt={t('vendorProfile.productAlt', { index: img.orderIndex + 1 })} loading="lazy" />
                    <button
                      className="delete-image-btn"
                      onClick={() => handleDeleteProductImage(img.id)}
                      disabled={deletingImageId === img.id}
                      title={t('vendorProfile.deleteImage')}
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
                      <div className="upload-spinner">{t('mapManagement.uploading')}</div>
                    ) : (
                      <>
                        <span className="upload-icon">+</span>
                        <span className="upload-text">{t('vendorProfile.addImage')}</span>
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
                {t('vendorProfile.productUploadHint', { max: MAX_PRODUCT_IMAGES })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorProfile;
