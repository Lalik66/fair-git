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

interface ProductImage {
  id: string;
  imageUrl: string;
  orderIndex: number;
}

interface ApplicationDetails {
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
  fairStartDate: string;
  fairEndDate: string;
  vendorHouseId: string;
  houseNumber: string;
  houseAreaSqm: number | null;
  housePrice: number | null;
  houseDescription: string | null;
  reviewedBy: string | null;
  logoUrl: string | null;
  productImages: ProductImage[];
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
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterHouse, setFilterHouse] = useState<string>('all');
  const [filterFair, setFilterFair] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('submittedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [applicationDetails, setApplicationDetails] = useState<ApplicationDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveApplicationId, setApproveApplicationId] = useState<string | null>(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectApplicationId, setRejectApplicationId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

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

  const fetchApplicationDetails = async (applicationId: string) => {
    try {
      setLoadingDetails(true);
      const details = await adminApi.getApplicationDetails(applicationId);
      setApplicationDetails(details);
      setShowDetailsModal(true);
    } catch (err: any) {
      console.error('Error fetching application details:', err);
      setError(err.response?.data?.error || 'Failed to load application details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setApplicationDetails(null);
  };

  const openApproveModal = (applicationId: string) => {
    setApproveApplicationId(applicationId);
    setApproveNotes('');
    setShowApproveModal(true);
  };

  const closeApproveModal = () => {
    setShowApproveModal(false);
    setApproveApplicationId(null);
    setApproveNotes('');
  };

  const handleApprove = async () => {
    if (!approveApplicationId) return;

    try {
      setApproving(true);
      setError(null);
      await adminApi.approveApplication(approveApplicationId, approveNotes || undefined);
      setSuccessMessage('Application approved successfully! Booking has been created.');
      closeApproveModal();
      // Refresh data
      await fetchData();
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error approving application:', err);
      setError(err.response?.data?.error || 'Failed to approve application');
      closeApproveModal();
    } finally {
      setApproving(false);
    }
  };

  const openRejectModal = (applicationId: string) => {
    setRejectApplicationId(applicationId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectApplicationId(null);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectApplicationId || !rejectReason.trim()) return;

    try {
      setRejecting(true);
      setError(null);
      await adminApi.rejectApplication(rejectApplicationId, rejectReason);
      setSuccessMessage('Application rejected successfully.');
      closeRejectModal();
      // Refresh data
      await fetchData();
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error rejecting application:', err);
      setError(err.response?.data?.error || 'Failed to reject application');
      closeRejectModal();
    } finally {
      setRejecting(false);
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

    // Filter by date range
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(app => new Date(app.submittedAt) >= fromDate);
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(app => new Date(app.submittedAt) <= toDate);
    }

    // Filter by house
    if (filterHouse !== 'all') {
      result = result.filter(app => app.houseNumber === filterHouse);
    }

    // Filter by fair
    if (filterFair !== 'all') {
      result = result.filter(app => app.fairName === filterFair);
    }

    // Search filter (real-time search by vendor name, business name, or email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(app =>
        (app.companyName && app.companyName.toLowerCase().includes(query)) ||
        (app.contactName && app.contactName.toLowerCase().includes(query)) ||
        (app.contactEmail && app.contactEmail.toLowerCase().includes(query)) ||
        (app.businessDescription && app.businessDescription.toLowerCase().includes(query))
      );
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
  }, [applications, filterStatus, filterCategory, filterDateFrom, filterDateTo, filterHouse, filterFair, searchQuery, sortField, sortOrder]);

  // Get unique house numbers for filter dropdown
  const uniqueHouses = useMemo(() => {
    const houses = new Set(applications.map(app => app.houseNumber));
    return Array.from(houses).sort();
  }, [applications]);

  // Get unique fair names for filter dropdown
  const uniqueFairs = useMemo(() => {
    const fairs = new Set(applications.map(app => app.fairName));
    return Array.from(fairs).sort();
  }, [applications]);

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
      {successMessage && <div className="success-message">{successMessage}</div>}

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

      {/* Search Box */}
      <div className="search-box">
        <label htmlFor="search-input">Search:</label>
        <input
          type="text"
          id="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by vendor name, business name, or email..."
          className="search-input"
        />
        {searchQuery && (
          <button
            className="clear-search-btn"
            onClick={() => setSearchQuery('')}
            title="Clear search"
          >
            ×
          </button>
        )}
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
        <div className="filter-group">
          <label htmlFor="date-from">From:</label>
          <input
            type="date"
            id="date-from"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="filter-date"
          />
        </div>
        <div className="filter-group">
          <label htmlFor="date-to">To:</label>
          <input
            type="date"
            id="date-to"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="filter-date"
          />
        </div>
        <div className="filter-group">
          <label htmlFor="house-filter">Filter by House:</label>
          <select
            id="house-filter"
            value={filterHouse}
            onChange={(e) => setFilterHouse(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Houses</option>
            {uniqueHouses.map((house) => (
              <option key={house} value={house}>
                {house}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="fair-filter">Filter by Fair:</label>
          <select
            id="fair-filter"
            value={filterFair}
            onChange={(e) => setFilterFair(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Fairs</option>
            {uniqueFairs.map((fair) => (
              <option key={fair} value={fair}>
                {fair}
              </option>
            ))}
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
          {(filterStatus !== 'all' || filterCategory !== 'all' || filterDateFrom || filterDateTo || filterHouse !== 'all' || filterFair !== 'all' || searchQuery) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStatus('all'); setFilterCategory('all'); setFilterDateFrom(''); setFilterDateTo(''); setFilterHouse('all'); setFilterFair('all'); setSearchQuery(''); }}>
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
                    <button
                      className="btn btn-secondary btn-sm"
                      title="View Details"
                      onClick={() => fetchApplicationDetails(app.id)}
                      disabled={loadingDetails}
                    >
                      {loadingDetails ? '...' : 'View'}
                    </button>
                    {app.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          title="Approve Application"
                          onClick={() => openApproveModal(app.id)}
                          disabled={approving || rejecting}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          title="Reject Application"
                          onClick={() => openRejectModal(app.id)}
                          disabled={approving || rejecting}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Application Details Modal */}
      {showDetailsModal && applicationDetails && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Application Details</h2>
              <button className="modal-close" onClick={closeDetailsModal}>&times;</button>
            </div>
            <div className="modal-body application-details-content">
              {/* Status Badge */}
              <div className="detail-section">
                <span className={getStatusBadgeClass(applicationDetails.status)}>
                  {applicationDetails.status.charAt(0).toUpperCase() + applicationDetails.status.slice(1)}
                </span>
                <span className="submission-date">
                  Submitted: {formatDate(applicationDetails.submittedAt)}
                </span>
              </div>

              {/* Vendor Information */}
              <div className="detail-section">
                <h3>Vendor Information</h3>
                <div className="detail-grid">
                  {applicationDetails.logoUrl && (
                    <div className="logo-section">
                      <label>Company Logo</label>
                      <img
                        src={applicationDetails.logoUrl}
                        alt="Company Logo"
                        className="vendor-logo"
                      />
                    </div>
                  )}
                  <div className="detail-item">
                    <label>Company Name</label>
                    <span>{applicationDetails.companyName || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Category</label>
                    <span>{getCategoryLabel(applicationDetails.productCategory)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Contact Name</label>
                    <span>{applicationDetails.contactName || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <span>{applicationDetails.contactEmail}</span>
                  </div>
                  {applicationDetails.contactPhone && (
                    <div className="detail-item">
                      <label>Phone</label>
                      <span>{applicationDetails.contactPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Description */}
              <div className="detail-section">
                <h3>Business Description</h3>
                <p className="business-description">
                  {applicationDetails.businessDescription || 'No description provided.'}
                </p>
              </div>

              {/* Product Images */}
              {applicationDetails.productImages && applicationDetails.productImages.length > 0 && (
                <div className="detail-section">
                  <h3>Product Images</h3>
                  <div className="product-images-grid">
                    {applicationDetails.productImages.map((img) => (
                      <img
                        key={img.id}
                        src={img.imageUrl}
                        alt={`Product ${img.orderIndex + 1}`}
                        className="product-image"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Fair & House Information */}
              <div className="detail-section">
                <h3>Fair & House Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Fair</label>
                    <span>{applicationDetails.fairName}</span>
                  </div>
                  <div className="detail-item">
                    <label>Fair Dates</label>
                    <span>
                      {new Date(applicationDetails.fairStartDate).toLocaleDateString()} - {new Date(applicationDetails.fairEndDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>House Number</label>
                    <span className="house-number">{applicationDetails.houseNumber}</span>
                  </div>
                  {applicationDetails.houseAreaSqm && (
                    <div className="detail-item">
                      <label>House Area</label>
                      <span>{applicationDetails.houseAreaSqm} m²</span>
                    </div>
                  )}
                  {applicationDetails.housePrice && (
                    <div className="detail-item">
                      <label>House Price</label>
                      <span>{applicationDetails.housePrice.toLocaleString()} AZN</span>
                    </div>
                  )}
                  {applicationDetails.houseDescription && (
                    <div className="detail-item full-width">
                      <label>House Description</label>
                      <span>{applicationDetails.houseDescription}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Information */}
              {(applicationDetails.reviewedAt || applicationDetails.adminNotes || applicationDetails.rejectionReason) && (
                <div className="detail-section">
                  <h3>Review Information</h3>
                  <div className="detail-grid">
                    {applicationDetails.reviewedAt && (
                      <div className="detail-item">
                        <label>Reviewed At</label>
                        <span>{formatDate(applicationDetails.reviewedAt)}</span>
                      </div>
                    )}
                    {applicationDetails.reviewedBy && (
                      <div className="detail-item">
                        <label>Reviewed By</label>
                        <span>{applicationDetails.reviewedBy}</span>
                      </div>
                    )}
                    {applicationDetails.adminNotes && (
                      <div className="detail-item full-width">
                        <label>Admin Notes</label>
                        <span>{applicationDetails.adminNotes}</span>
                      </div>
                    )}
                    {applicationDetails.rejectionReason && (
                      <div className="detail-item full-width">
                        <label>Rejection Reason</label>
                        <span className="rejection-reason">{applicationDetails.rejectionReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="modal-overlay" onClick={closeApproveModal}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Approve Application</h2>
              <button className="modal-close" onClick={closeApproveModal}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="approve-confirmation-text">
                Are you sure you want to approve this application?
                This will automatically create a booking for the vendor.
              </p>
              <div className="form-group">
                <label htmlFor="admin-notes">Admin Notes (Optional)</label>
                <textarea
                  id="admin-notes"
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="Add any notes for this approval..."
                  rows={3}
                  className="form-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={closeApproveModal}
                disabled={approving}
              >
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleApprove}
                disabled={approving}
              >
                {approving ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={closeRejectModal}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reject Application</h2>
              <button className="modal-close" onClick={closeRejectModal}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="reject-confirmation-text">
                Are you sure you want to reject this application?
                The vendor will be notified with the reason provided.
              </p>
              <div className="form-group">
                <label htmlFor="rejection-reason">Rejection Reason (Required)</label>
                <textarea
                  id="rejection-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={3}
                  className="form-textarea"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={closeRejectModal}
                disabled={rejecting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationReview;
