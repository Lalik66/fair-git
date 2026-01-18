import React, { useState, useEffect, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../services/api';
import './UserManagement.css';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers();
      setUsers(data.users);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const data = await adminApi.createAdmin({
        email,
        firstName,
        lastName,
        currentPassword,
      });

      setTemporaryPassword(data.temporaryPassword);
      setSuccessMessage(`Admin account created for ${email}`);
      setShowCreateModal(false);
      setEmail('');
      setFirstName('');
      setLastName('');
      setCurrentPassword('');
      loadUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create admin');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, !currentStatus);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user status');
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setFormError(null);
    setEmail('');
    setFirstName('');
    setLastName('');
    setCurrentPassword('');
  };

  const closeSuccessModal = () => {
    setSuccessMessage(null);
    setTemporaryPassword(null);
  };

  if (loading) {
    return (
      <div className="user-management">
        <div className="loading-spinner">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <header className="user-management-header">
        <h1>{t('admin.userManagement')}</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          {t('Create Admin', { defaultValue: 'Create Admin' })}
        </button>
      </header>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>{t('applications.form.email')}</th>
              <th>{t('Name', { defaultValue: 'Name' })}</th>
              <th>{t('Role', { defaultValue: 'Role' })}</th>
              <th>{t('Status', { defaultValue: 'Status' })}</th>
              <th>{t('Created', { defaultValue: 'Created' })}</th>
              <th>{t('Last Login', { defaultValue: 'Last Login' })}</th>
              <th>{t('Actions', { defaultValue: 'Actions' })}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={!user.isActive ? 'inactive' : ''}>
                <td>{user.email}</td>
                <td>
                  {user.firstName} {user.lastName}
                </td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? t('Active', { defaultValue: 'Active' }) : t('Inactive', { defaultValue: 'Inactive' })}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString()
                    : '-'}
                </td>
                <td>
                  <button
                    className={`btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => handleToggleStatus(user.id, user.isActive)}
                  >
                    {user.isActive
                      ? t('Deactivate', { defaultValue: 'Deactivate' })
                      : t('Activate', { defaultValue: 'Activate' })}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('Create Admin', { defaultValue: 'Create Admin' })}</h2>
              <button className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateAdmin} className="modal-form">
              {formError && <div className="form-error-message">{formError}</div>}

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  {t('applications.form.email')} *
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={formLoading}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName" className="form-label">
                    {t('First Name', { defaultValue: 'First Name' })} *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    className="form-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={formLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName" className="form-label">
                    {t('Last Name', { defaultValue: 'Last Name' })} *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    className="form-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="currentPassword" className="form-label">
                  {t('Your Password', { defaultValue: 'Your Password' })} *
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={formLoading}
                  placeholder={t('Enter your password to confirm', { defaultValue: 'Enter your password to confirm' })}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={formLoading}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? t('common.loading') : t('Create', { defaultValue: 'Create' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal with Temporary Password */}
      {successMessage && temporaryPassword && (
        <div className="modal-overlay" onClick={closeSuccessModal}>
          <div className="modal success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('Success', { defaultValue: 'Success' })}</h2>
              <button className="modal-close" onClick={closeSuccessModal}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p className="success-text">{successMessage}</p>
              <div className="temporary-password-box">
                <label>{t('Temporary Password', { defaultValue: 'Temporary Password' })}:</label>
                <code className="temp-password">{temporaryPassword}</code>
                <p className="password-note">
                  {t('Please share this password securely with the new admin. They will be required to change it on first login.', {
                    defaultValue: 'Please share this password securely with the new admin. They will be required to change it on first login.'
                  })}
                </p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={closeSuccessModal}>
                {t('Done', { defaultValue: 'Done' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
