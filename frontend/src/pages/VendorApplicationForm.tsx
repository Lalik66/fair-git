import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { applicationApi, ApplicationFormData } from '../services/api';
import MapSelectionModal from '../components/map/MapSelectionModal';
import { CATEGORY_META } from '../types/map';
import './VendorApplicationForm.css';

// Minimal static country/city dataset — the codebase has no geo source and
// the form only needs a sensible regional list for this fair.
const COUNTRIES: Record<string, string[]> = {
  Azərbaycan: ['Bakı', 'Gəncə', 'Sumqayıt', 'Mingəçevir', 'Şəki', 'Lənkəran', 'Şirvan'],
  Türkiyə: ['İstanbul', 'Ankara', 'İzmir', 'Bursa'],
  Gürcüstan: ['Tbilisi', 'Batumi', 'Rustavi'],
  Rusiya: ['Moskva', 'Sankt-Peterburq'],
};
const PHONE_CODES = ['+994', '+90', '+995', '+7'];

type Field = keyof Omit<ApplicationFormData, 'rulesAccepted' | 'paymentAccepted'>;

const TEXT_FIELDS: Field[] = [
  'firstName',
  'lastName',
  'patronymic',
  'email',
  'code',
  'codeConfirmation',
  'idSeries',
  'idNumber',
  'financialId',
  'dateOfBirth',
  'houseNumber',
  'country',
  'city',
  'companyName',
  'productCategory',
];

const CATEGORY_KEYS = Object.keys(CATEGORY_META);

const VendorApplicationForm: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState<ApplicationFormData>({
    firstName: '',
    lastName: '',
    patronymic: '',
    email: user?.email || '',
    code: '',
    codeConfirmation: '',
    phone: '',
    idSeries: '',
    idNumber: '',
    financialId: '',
    dateOfBirth: '',
    houseNumber: '',
    country: '',
    city: '',
    companyName: '',
    productCategory: '',
    rulesAccepted: false,
    paymentAccepted: false,
  });
  const [phoneCode, setPhoneCode] = useState('+994');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showMap, setShowMap] = useState(false);
  const [houseFromMap, setHouseFromMap] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (field: Field, value: string) =>
    setValues((v) => ({ ...v, [field]: value }));

  const errors = useMemo(() => {
    const e: Partial<Record<string, string>> = {};
    for (const f of TEXT_FIELDS) {
      if (!String(values[f]).trim()) {
        e[f] = t('vendor.form.required', 'This field is required');
      }
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      e.email = t('vendor.form.invalidEmail', 'Invalid email format');
    }
    if (
      values.code &&
      values.codeConfirmation &&
      values.code !== values.codeConfirmation
    ) {
      e.codeConfirmation = t('vendor.form.codeMismatch', 'Codes do not match');
    }
    if (!phoneNumber.trim()) {
      e.phone = t('vendor.form.required', 'This field is required');
    }
    return e;
  }, [values, phoneNumber, t]);

  const isValid =
    Object.keys(errors).length === 0 &&
    values.rulesAccepted &&
    values.paymentAccepted;

  const blur = (field: string) => setTouched((s) => ({ ...s, [field]: true }));

  const showError = (field: string) =>
    touched[field] && errors[field] ? (
      <span className="field-error">{errors[field]}</span>
    ) : null;

  const handleMapSelect = (houseNumber: string) => {
    set('houseNumber', houseNumber);
    setHouseFromMap(true);
    setTouched((s) => ({ ...s, houseNumber: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(
      [...TEXT_FIELDS, 'phone'].reduce(
        (acc, f) => ({ ...acc, [f]: true }),
        {} as Record<string, boolean>
      )
    );
    if (!isValid || submitting) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await applicationApi.submit({
        ...values,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        patronymic: values.patronymic.trim(),
        email: values.email.trim(),
        phone: `${phoneCode}${phoneNumber.trim()}`,
        idSeries: values.idSeries.trim(),
        idNumber: values.idNumber.trim(),
        financialId: values.financialId.trim(),
        houseNumber: values.houseNumber.trim(),
        country: values.country.trim(),
        city: values.city.trim(),
        companyName: values.companyName.trim(),
      });
      navigate('/applications', {
        state: { justSubmitted: true },
      });
    } catch (err: any) {
      setServerError(
        err.response?.data?.error ||
          t('vendor.form.submitError', 'Failed to submit application')
      );
      setSubmitting(false);
    }
  };

  const cities = values.country ? COUNTRIES[values.country] || [] : [];

  return (
    <div className="vendor-application-form-page">
      <div className="vaf-card">
        <h1>{t('vendor.newApplication', 'New Application')}</h1>

        {serverError && <div className="vaf-server-error">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="vaf-grid">
            <div className="vaf-field">
              <label>{t('vendor.form.firstName', 'First name')}</label>
              <input
                type="text"
                value={values.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                onBlur={() => blur('firstName')}
              />
              {showError('firstName')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.lastName', 'Last name')}</label>
              <input
                type="text"
                value={values.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                onBlur={() => blur('lastName')}
              />
              {showError('lastName')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.patronymic', 'Patronymic')}</label>
              <input
                type="text"
                value={values.patronymic}
                onChange={(e) => set('patronymic', e.target.value)}
                onBlur={() => blur('patronymic')}
              />
              {showError('patronymic')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.email', 'Email')}</label>
              <input
                type="email"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
                onBlur={() => blur('email')}
              />
              {showError('email')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.code', 'Code')}</label>
              <input
                type="text"
                value={values.code}
                onChange={(e) => set('code', e.target.value)}
                onBlur={() => blur('code')}
              />
              {showError('code')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.codeConfirm', 'Confirm code')}</label>
              <input
                type="text"
                value={values.codeConfirmation}
                onChange={(e) => set('codeConfirmation', e.target.value)}
                onBlur={() => blur('codeConfirmation')}
              />
              {showError('codeConfirmation')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.phone', 'Phone')}</label>
              <div className="vaf-phone">
                <select
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                >
                  {PHONE_CODES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onBlur={() => blur('phone')}
                />
              </div>
              {showError('phone')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.idSeries', 'ID series')}</label>
              <input
                type="text"
                value={values.idSeries}
                onChange={(e) => set('idSeries', e.target.value)}
                onBlur={() => blur('idSeries')}
              />
              {showError('idSeries')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.idNumber', 'ID number')}</label>
              <input
                type="text"
                value={values.idNumber}
                onChange={(e) => set('idNumber', e.target.value)}
                onBlur={() => blur('idNumber')}
              />
              {showError('idNumber')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.financialId', 'Financial ID')}</label>
              <input
                type="text"
                value={values.financialId}
                onChange={(e) => set('financialId', e.target.value)}
                onBlur={() => blur('financialId')}
              />
              {showError('financialId')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.dateOfBirth', 'Date of birth')}</label>
              <input
                type="date"
                value={values.dateOfBirth}
                onChange={(e) => set('dateOfBirth', e.target.value)}
                onBlur={() => blur('dateOfBirth')}
              />
              {showError('dateOfBirth')}
            </div>

            <div className="vaf-field vaf-field-house">
              <label>{t('vendor.form.houseNumber', 'House number')}</label>
              {houseFromMap ? (
                <div className="vaf-house-selected">
                  <span>{values.houseNumber}</span>
                  <button
                    type="button"
                    className="vaf-link"
                    onClick={() => setShowMap(true)}
                  >
                    {t('vendor.form.changeHouse', 'Change')}
                  </button>
                </div>
              ) : (
                <div className="vaf-house-row">
                  <input
                    type="text"
                    value={values.houseNumber}
                    onChange={(e) => set('houseNumber', e.target.value)}
                    onBlur={() => blur('houseNumber')}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowMap(true)}
                  >
                    {t('vendor.form.chooseFromMap', 'Choose from map')}
                  </button>
                </div>
              )}
              {showError('houseNumber')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.country', 'Country')}</label>
              <select
                value={values.country}
                onChange={(e) => {
                  set('country', e.target.value);
                  set('city', '');
                }}
                onBlur={() => blur('country')}
              >
                <option value="">—</option>
                {Object.keys(COUNTRIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {showError('country')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.city', 'City')}</label>
              <select
                value={values.city}
                onChange={(e) => set('city', e.target.value)}
                onBlur={() => blur('city')}
                disabled={!values.country}
              >
                <option value="">—</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {showError('city')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.companyName', 'Company name')}</label>
              <input
                type="text"
                value={values.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                onBlur={() => blur('companyName')}
              />
              {showError('companyName')}
            </div>

            <div className="vaf-field">
              <label>{t('vendor.form.productCategory', 'Category')}</label>
              <select
                value={values.productCategory}
                onChange={(e) => set('productCategory', e.target.value)}
                onBlur={() => blur('productCategory')}
              >
                <option value="">—</option>
                {CATEGORY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {i18n.language === 'en'
                      ? CATEGORY_META[key].labelEn
                      : CATEGORY_META[key].labelAz}
                  </option>
                ))}
              </select>
              {showError('productCategory')}
            </div>
          </div>

          <div className="vaf-checkboxes">
            <label className="vaf-checkbox">
              <input
                type="checkbox"
                checked={values.rulesAccepted}
                onChange={(e) =>
                  setValues((v) => ({ ...v, rulesAccepted: e.target.checked }))
                }
              />
              <span>
                <a href="/about" target="_blank" rel="noopener noreferrer">
                  {t('vendor.form.rulesLink', 'qaydalar')}
                </a>{' '}
                {t('vendor.form.rulesAccepted', 'I have read the rules')}
              </span>
            </label>
            <label className="vaf-checkbox">
              <input
                type="checkbox"
                checked={values.paymentAccepted}
                onChange={(e) =>
                  setValues((v) => ({ ...v, paymentAccepted: e.target.checked }))
                }
              />
              <span>{t('vendor.form.paymentAccepted', 'I agree to payment terms')}</span>
            </label>
          </div>

          <div className="vaf-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/applications')}
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isValid || submitting}
            >
              {submitting
                ? t('vendor.form.submitting', 'Submitting...')
                : t('vendor.form.confirm', 'Confirm')}
            </button>
          </div>
        </form>
      </div>

      {showMap && (
        <MapSelectionModal
          onClose={() => setShowMap(false)}
          onSelect={handleMapSelect}
        />
      )}
    </div>
  );
};

export default VendorApplicationForm;
