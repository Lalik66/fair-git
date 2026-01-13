import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../services/api';
import './ApplicationReview.css';

interface Application {
  id: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  companyName: string | null;
  productCategory: string | null;
  businessDescription: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  fairId: string;
  fairName: string;
  fairStatus: string;
  vendorHouseId: string;
  houseNumber: string;
  reviewedBy: string | null;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

type SortField = 'submittedAt' | 'status' | 'companyName' | 'fairName' | 'houseNumber';
type SortOrder = 'asc' | 'desc';

const ApplicationReview: React.FC = () => {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('submittedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [appsResponse, statsResponse] = await Promise.all([
        adminApi.getApplications(),
        adminApi.getApplicationStats(),
      ]);
      setApplications(appsResponse.applications);
      setStats(statsResponse);
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      setError(err.response?.data?.error || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort applications
  const filteredAndSortedApplications = useMemo(() => {
    let result = [...applications];

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(app => app.status === filterStatus);
    }

    // Filter by category
    if (filterCategory !== 'all') {
      result = result.filter(app => app.productCategory === filterCategory);
    }

    // Sort
    result.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'submittedAt':
          aValue = new Date(a.submittedAt).getTime();
          bValue = new Date(b.submittedAt).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'companyName':
          aValue = (a.companyName || '').toLowerCase();
          bValue = (b.companyName || '').toLowerCase();
          break;
        case 'fairName':
          aValue = a.fairName.toLowerCase();
          bValue = b.fairName.toLowerCase();
          break;
        case 'houseNumber':
          aValue = a.houseNumber;
          bValue = b.houseNumber;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [applications, filterStatus, filterCategory, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge badge-warning';
      case 'approved':
        return 'badge badge-success';
      case 'rejected':
        return 'badge badge-danger';
      default:
        return 'badge badge-secondary';
    }
  };

  const getCategoryLabel = (category: string | null) => {
    if (!category) return '-';
    const labels: Record<string, string> = {
      food_beverages: 'Food & Beverages',
      handicrafts: 'Handicrafts',
      clothing: 'Clothing',
      accessories: 'Accessories',
      other: 'Other',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="application-review-container">
        <div className="loading-spinner">Loading applications...</div>
      </div>
    );
  }

  return (
    <div className="application-review-container">
      <div className="page-header">
        <h1>{t('admin.applicationReview', { defaultValue: 'Application Review' })}</h1>
        <button className="btn btn-secondary" onClick={fetchData}>
          Refresh
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Statistics Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card stat-pending">
          <span className="stat-value">{stats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card stat-approved">
          <span className="stat-value">{stats.approved}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="stat-card stat-rejected">
          <span className="stat-value">{stats.rejected}</span>
          <span className="stat-label">Rejected</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="filter-controls">
        <div className="filter-group">
          <label htmlFor="status-filter">Filter by Status:</label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="category-filter">Filter by Category:</label>
          <select
            id="category-filter"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="food_beverages">Food & Beverages</option>
            <option value="handicrafts">Handicrafts</option>
            <option value="clothing">Clothing</option>
            <option value="accessories">Accessories</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="results-count">
          Showing {filteredAndSortedApplications.length} of {applications.length} applications
        </div>
      </div>

      {/* Applications Table */}
      {filteredAndSortedApplications.length === 0 ? (
        <div className="no-applications">
          <p>No applications found.</p>
          {(filterStatus !== 'all' || filterCategory !== 'all') && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStatus('all'); setFilterCategory('all'); }}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="applications-table-container">
          <table className="applications-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('submittedAt')}>
                  Date {getSortIcon('submittedAt')}
                </th>
                <th className="sortable" onClick={() => handleSort('companyName')}>
                  Company {getSortIcon('companyName')}
                </th>
                <th>Contact</th>
                <th>Category</th>
                <th className="sortable" onClick={() => handleSort('fairName')}>
                  Fair {getSortIcon('fairName')}
                </th>
                <th className="sortable" onClick={() => handleSort('houseNumber')}>
                  House {getSortIcon('houseNumber')}
                </th>
                <th className="sortable" onClick={() => handleSort('status')}>
                  Status {getSortIcon('status')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedApplications.map((app) => (
                <tr key={app.id} className={`status-${app.status}`}>
                  <td className="date-cell">
                    {formatDate(app.submittedAt)}
                  </td>
                  <td className="company-cell">
                    <strong>{app.companyName || 'N/A'}</strong>
                    {app.businessDescription && (
                      <span className="description-preview">
                        {app.businessDescription.substring(0, 50)}
                        {app.businessDescription.length > 50 ? '...' : ''}
                      </span>
                    )}
                  </td>
                  <td className="contact-cell">
                    <span className="contact-name">{app.contactName || 'N/A'}</span>
                    <span className="contact-email">{app.contactEmail}</span>
                    {app.contactPhone && (
                      <span className="contact-phone">{app.contactPhone}</span>
                    )}
                  </td>
                  <td>{getCategoryLabel(app.productCategory)}</td>
                  <td>{app.fairName}</td>
                  <td className="house-cell">{app.houseNumber}</td>
                  <td>
                    <span className={getStatusBadgeClass(app.status)}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                    {app.reviewedBy && app.reviewedAt && (
                      <span className="reviewed-info">
                        by {app.reviewedBy}
                      </span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-secondary btn-sm" title="View Details">
                      View
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

export default ApplicationReview;
