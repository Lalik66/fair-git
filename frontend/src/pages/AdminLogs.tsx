import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../services/api';
import './AdminLogs.css';

interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  details: string | null;
  ipAddress: string | null;
  timestamp: string;
  admin: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

const AdminLogs: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params: { action?: string; fromDate?: string; toDate?: string } = {};

      if (actionFilter && actionFilter !== 'all') {
        params.action = actionFilter;
      }
      if (fromDate) {
        params.fromDate = fromDate;
      }
      if (toDate) {
        params.toDate = toDate;
      }

      const data = await adminApi.getLogs(params);
      setLogs(data.logs);
      if (data.actionTypes) {
        setActionTypes(data.actionTypes);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load admin logs');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + ', ' + date.toLocaleTimeString('az-AZ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAction = (action: string): string => {
    const actionMap: Record<string, string> = {
      'create_admin': 'Create Admin',
      'activate_user': 'Activate User',
      'deactivate_user': 'Deactivate User',
      'login': 'Login',
      'logout': 'Logout',
      'create_fair': 'Create Fair',
      'update_fair': 'Update Fair',
      'delete_fair': 'Delete Fair',
      'archive_fair': 'Archive Fair',
      'approve_application': 'Approve Application',
      'reject_application': 'Reject Application',
      'update_about_us': 'Update About Us',
    };
    return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActionBadgeClass = (action: string): string => {
    if (action.includes('create') || action.includes('approve') || action.includes('activate')) {
      return 'badge-success';
    }
    if (action.includes('delete') || action.includes('reject') || action.includes('deactivate')) {
      return 'badge-danger';
    }
    return 'badge-info';
  };

  const handleClearFilters = () => {
    setActionFilter('all');
    setFromDate('');
    setToDate('');
  };

  const hasFilters = actionFilter !== 'all' || fromDate || toDate;

  if (loading && logs.length === 0) {
    return (
      <div className="admin-logs-container">
        <div className="loading-spinner">
          {t('Loading...', { defaultValue: 'Loading...' })}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-logs-container">
        <div className="error-message">
          {error}
          <button onClick={fetchLogs} className="btn btn-primary btn-sm" style={{ marginLeft: '10px' }}>
            {t('Retry', { defaultValue: 'Retry' })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-logs-container">
      <div className="logs-header">
        <h1>{t('admin.activityLogs', { defaultValue: 'Admin Activity Logs' })}</h1>
        <button onClick={fetchLogs} className="btn btn-secondary btn-sm">
          {t('Refresh', { defaultValue: 'Refresh' })}
        </button>
      </div>

      {/* Filter Controls */}
      <div className="logs-filters">
        <div className="filter-group">
          <label htmlFor="actionFilter">{t('Filter by Action:', { defaultValue: 'Filter by Action:' })}</label>
          <select
            id="actionFilter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t('All Actions', { defaultValue: 'All Actions' })}</option>
            {actionTypes.map((action) => (
              <option key={action} value={action}>
                {formatAction(action)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="fromDate">{t('From:', { defaultValue: 'From:' })}</label>
          <input
            type="date"
            id="fromDate"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="filter-date"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="toDate">{t('To:', { defaultValue: 'To:' })}</label>
          <input
            type="date"
            id="toDate"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="filter-date"
          />
        </div>

        {hasFilters && (
          <button onClick={handleClearFilters} className="btn btn-outline btn-sm clear-filters-btn">
            {t('Clear Filters', { defaultValue: 'Clear Filters' })}
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="logs-count">
        {t('Showing {{count}} log entries', { defaultValue: `Showing ${logs.length} log entries`, count: logs.length })}
        {loading && <span className="loading-indicator"> ({t('Loading...', { defaultValue: 'Loading...' })})</span>}
      </div>

      {logs.length === 0 ? (
        <div className="no-logs">
          <p>{t('No activity logs found', { defaultValue: 'No activity logs found' })}</p>
          {hasFilters && (
            <p className="no-logs-hint">
              {t('Try adjusting your filters', { defaultValue: 'Try adjusting your filters' })}
            </p>
          )}
        </div>
      ) : (
        <div className="logs-table-container">
          <table className="logs-table">
            <thead>
              <tr>
                <th>{t('Timestamp', { defaultValue: 'Timestamp' })}</th>
                <th>{t('Admin', { defaultValue: 'Admin' })}</th>
                <th>{t('Action', { defaultValue: 'Action' })}</th>
                <th>{t('Details', { defaultValue: 'Details' })}</th>
                <th>{t('IP Address', { defaultValue: 'IP Address' })}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="timestamp-cell">{formatTimestamp(log.timestamp)}</td>
                  <td className="admin-cell">
                    <div className="admin-info">
                      <span className="admin-name">
                        {log.admin.firstName} {log.admin.lastName}
                      </span>
                      <span className="admin-email">{log.admin.email}</span>
                    </div>
                  </td>
                  <td className="action-cell">
                    <span className={`badge ${getActionBadgeClass(log.action)}`}>
                      {formatAction(log.action)}
                    </span>
                  </td>
                  <td className="details-cell">{log.details || '-'}</td>
                  <td className="ip-cell">{log.ipAddress || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminLogs;
