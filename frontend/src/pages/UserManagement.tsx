import React, { useState, useEffect, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useAdminSearchQuery, matchesQuery } from '../hooks/useAdminSearch';
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
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

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
      setError(err.response?.data?.error || t('userAdmin.loadFailed'));
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
      setSuccessMessage(t('userAdmin.createdFor', { email }));
      setShowCreateModal(false);
      setEmail('');
      setFirstName('');
      setLastName('');
      setCurrentPassword('');
      loadUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.error || t('userAdmin.createFailed'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, !currentStatus);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || t('userAdmin.statusUpdateFailed'));
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

  const searchQuery = useAdminSearchQuery();

  // Get filtered users
  const filteredUsers = users.filter(user => {
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    if (!searchQuery) return true;
    return (
      matchesQuery(user.firstName, searchQuery) ||
      matchesQuery(user.lastName, searchQuery) ||
      matchesQuery(user.email, searchQuery) ||
      matchesQuery(
        [user.firstName, user.lastName].filter(Boolean).join(' '),
        searchQuery
      )
    );
  });

  // Count stats
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    vendors: users.filter(u => u.role === 'vendor').length,
    visitors: users.filter(u => u.role === 'user').length,
    active: users.filter(u => u.isActive).length,
  };

  // Get user initials
  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  };

  // Get user display name
  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return user.email.split('@')[0];
  };

  // Get avatar color class based on role
  const getAvatarColorClass = (role: string) => {
    switch (role) {
      case 'admin': return '';
      case 'vendor': return 'green';
      case 'user': return 'sky';
      default: return 'gold';
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  if (loading) {
    return (
      <div className="um-loading">
        <div className="spinner"></div>
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <div className="hdr">
        <div>
          <h2>{t('userAdmin.title')}</h2>
          <div className="lede">{t('userAdmin.subtitle', { total: stats.total, admins: stats.admins })}</div>
        </div>
        <div className="actions">
          <button className="btn-fk ghost" onClick={loadUsers}>
            {'\u21BB'} {t('common.refresh')}
          </button>
          <button className="btn-fk primary" onClick={() => setShowCreateModal(true)}>
            + {t('userAdmin.createAdmin')}
          </button>
        </div>
      </div>

      {error && (
        <div className="um-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>{'\u2715'}</button>
        </div>
      )}

      {/* Stats row */}
      <div className="stats-fk">
        <div className="stat-fk">
          <div className="k">{t('userAdmin.statTotal')}</div>
          <div className="v">{stats.total}</div>
          <div className="d"><span className="up">{stats.active}</span> {t('userAdmin.statActiveSuffix')}</div>
        </div>
        <div className="stat-fk">
          <div className="k">{t('userAdmin.statAdmins')}</div>
          <div className="v">{stats.admins}</div>
          <div className="d">{t('userAdmin.statSystemAccess')}</div>
        </div>
        <div className="stat-fk">
          <div className="k">{t('userAdmin.statVendors')}</div>
          <div className="v">{stats.vendors}</div>
          <div className="d">{t('userAdmin.statRegisteredSellers')}</div>
        </div>
        <div className="stat-fk">
          <div className="k">{t('userAdmin.statVisitors')}</div>
          <div className="v">{stats.visitors}</div>
          <div className="d">{t('userAdmin.statRegularUsers')}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar-fk">
        <div className="seg">
          <button
            className={filterRole === 'all' ? 'on' : ''}
            onClick={() => setFilterRole('all')}
          >
            {t('userAdmin.filterAll')}
          </button>
          <button
            className={filterRole === 'admin' ? 'on' : ''}
            onClick={() => setFilterRole('admin')}
          >
            {t('userAdmin.filterAdmins')}
          </button>
          <button
            className={filterRole === 'vendor' ? 'on' : ''}
            onClick={() => setFilterRole('vendor')}
          >
            {t('userAdmin.filterVendors')}
          </button>
          <button
            className={filterRole === 'user' ? 'on' : ''}
            onClick={() => setFilterRole('user')}
          >
            {t('userAdmin.filterVisitors')}
          </button>
        </div>
        <div className="spacer"></div>
        {selectedUsers.size > 0 && (
          <span className="chip">
            {t('userAdmin.selected', { count: selectedUsers.size })}
            <span className="x" onClick={() => setSelectedUsers(new Set())}>{'\u2715'}</span>
          </span>
        )}
      </div>

      {/* Table */}
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th className="checkcell">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>{t('userAdmin.thUser')}</th>
              <th>{t('userAdmin.thRole')}</th>
              <th>{t('userAdmin.thStatus')}</th>
              <th>{t('userAdmin.thRegistered')}</th>
              <th>{t('userAdmin.thLastLogin')}</th>
              <th style={{ textAlign: 'right' }}>{t('userAdmin.thActions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className={!user.isActive ? 'inactive' : ''}>
                <td className="checkcell">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                  />
                </td>
                <td>
                  <div className={`who ${getAvatarColorClass(user.role)}`}>
                    <div className="av">{getUserInitials(user)}</div>
                    <div>
                      <b>{getUserDisplayName(user)}</b>
                      <span>{user.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`pill ${user.role === 'admin' ? 'live' : user.role === 'vendor' ? 'ok' : 'muted'}`}>
                    <span className="dot"></span>
                    {t(`userAdmin.roles.${user.role}`, user.role)}
                  </span>
                </td>
                <td>
                  <span className={`pill ${user.isActive ? 'ok' : 'warn'}`}>
                    <span className="dot"></span>
                    {user.isActive ? t('userAdmin.active') : t('userAdmin.inactive')}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--fk-font-mono)', fontSize: '11px', color: 'var(--fk-soft)' }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td style={{ fontFamily: 'var(--fk-font-mono)', fontSize: '11px', color: 'var(--fk-soft)' }}>
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleDateString()
                    : '—'}
                </td>
                <td>
                  <div className="actions">
                    {user.id === currentUser?.id && user.isActive ? (
                      <span className="pill muted" title={t('userAdmin.youTooltip')}>
                        {t('userAdmin.you')}
                      </span>
                    ) : (
                      <button
                        className={`btn-fk sm ${user.isActive ? '' : 'accent'}`}
                        onClick={() => handleToggleStatus(user.id, user.isActive)}
                      >
                        {user.isActive ? t('userAdmin.deactivate') : t('userAdmin.activate')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pager">
          <span>{t('userAdmin.showing', { count: filteredUsers.length, total: users.length })}</span>
          <div className="pages">
            <button className="on">1</button>
          </div>
        </div>
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-fk" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('userAdmin.createAdmin')}</h3>
              <button className="btn-fk icon" onClick={closeModal}>
                {'\u2715'}
              </button>
            </div>
            <form onSubmit={handleCreateAdmin}>
              {formError && <div className="um-form-error">{formError}</div>}

              <div className="field-fk">
                <label>{t('applications.form.email')} *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={formLoading}
                  placeholder="admin@example.com"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field-fk">
                  <label>{t('userAdmin.firstName')} *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={formLoading}
                  />
                </div>

                <div className="field-fk">
                  <label>{t('userAdmin.lastName')} *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div className="field-fk">
                <label>{t('userAdmin.yourPassword')} *</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={formLoading}
                  placeholder={t('userAdmin.passwordConfirmPlaceholder')}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-fk ghost"
                  onClick={closeModal}
                  disabled={formLoading}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-fk primary"
                  disabled={formLoading}
                >
                  {formLoading ? t('common.creating') : t('userAdmin.createAdmin')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal with Temporary Password */}
      {successMessage && temporaryPassword && (
        <div className="modal-overlay" onClick={closeSuccessModal}>
          <div className="modal-fk" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('userAdmin.createdTitle')}</h3>
              <button className="btn-fk icon" onClick={closeSuccessModal}>
                {'\u2715'}
              </button>
            </div>
            <div className="modal-body">
              <div className="pill ok" style={{ marginBottom: '16px' }}>
                <span className="dot"></span>
                {successMessage}
              </div>
              <div className="um-temp-password">
                <label>{t('userAdmin.tempPassword')}</label>
                <code>{temporaryPassword}</code>
                <p>{t('userAdmin.tempPasswordNote')}</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-fk primary" onClick={closeSuccessModal}>
                {t('common.done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;
