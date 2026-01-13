import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getLogs();
      setLogs(data.logs);
      setError(null);
    } catch (err) {
      setError('Failed to load admin logs');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

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
      'approve_application': 'Approve Application',
      'reject_application': 'Reject Application',
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

  if (loading) {
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

      {logs.length === 0 ? (
        <div className="no-logs">
          <p>{t('No activity logs found', { defaultValue: 'No activity logs found' })}</p>
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
