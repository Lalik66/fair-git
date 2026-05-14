import React, { useState, useEffect, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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

  // Get filtered users
  const filteredUsers = users.filter(user => {
    if (filterRole === 'all') return true;
    return user.role === filterRole;
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
          <h2>Users</h2>
          <div className="lede">{stats.total} registered · {stats.admins} admins</div>
        </div>
        <div className="actions">
          <button className="btn-fk ghost" onClick={loadUsers}>
            {'\u21BB'} Refresh
          </button>
          <button className="btn-fk primary" onClick={() => setShowCreateModal(true)}>
            + Create Admin
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
          <div className="k">Total Users</div>
          <div className="v">{stats.total}</div>
          <div className="d"><span className="up">{stats.active}</span> active</div>
        </div>
        <div className="stat-fk">
          <div className="k">Admins</div>
          <div className="v">{stats.admins}</div>
          <div className="d">System access</div>
        </div>
        <div className="stat-fk">
          <div className="k">Vendors</div>
          <div className="v">{stats.vendors}</div>
          <div className="d">Registered sellers</div>
        </div>
        <div className="stat-fk">
          <div className="k">Visitors</div>
          <div className="v">{stats.visitors}</div>
          <div className="d">Regular users</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar-fk">
        <div className="seg">
          <button
            className={filterRole === 'all' ? 'on' : ''}
            onClick={() => setFilterRole('all')}
          >
            All
          </button>
          <button
            className={filterRole === 'admin' ? 'on' : ''}
            onClick={() => setFilterRole('admin')}
          >
            Admins
          </button>
          <button
            className={filterRole === 'vendor' ? 'on' : ''}
            onClick={() => setFilterRole('vendor')}
          >
            Vendors
          </button>
          <button
            className={filterRole === 'user' ? 'on' : ''}
            onClick={() => setFilterRole('user')}
          >
            Visitors
          </button>
        </div>
        <div className="spacer"></div>
        {selectedUsers.size > 0 && (
          <span className="chip">
            {selectedUsers.size} selected
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
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Last Login</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
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
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`pill ${user.isActive ? 'ok' : 'warn'}`}>
                    <span className="dot"></span>
                    {user.isActive ? 'Active' : 'Inactive'}
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
                      <span className="pill muted" title="You cannot deactivate your own account">
                        You
                      </span>
                    ) : (
                      <button
                        className={`btn-fk sm ${user.isActive ? '' : 'accent'}`}
                        onClick={() => handleToggleStatus(user.id, user.isActive)}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pager">
          <span>Showing {filteredUsers.length} of {users.length} users</span>
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
              <h3>Create Admin</h3>
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
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={formLoading}
                  />
                </div>

                <div className="field-fk">
                  <label>Last Name *</label>
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
                <label>Your Password *</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={formLoading}
                  placeholder="Enter your password to confirm"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-fk ghost"
                  onClick={closeModal}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-fk primary"
                  disabled={formLoading}
                >
                  {formLoading ? 'Creating...' : 'Create Admin'}
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
              <h3>Admin Created</h3>
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
                <label>Temporary Password</label>
                <code>{temporaryPassword}</code>
                <p>Please share this password securely with the new admin. They will be required to change it on first login.</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-fk primary" onClick={closeSuccessModal}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;
