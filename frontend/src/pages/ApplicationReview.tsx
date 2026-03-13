import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize filters from URL params or use defaults
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || 'all');
  const [filterCategory, setFilterCategory] = useState<string>(searchParams.get('category') || 'all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>(searchParams.get('dateFrom') || '');
  const [filterDateTo, setFilterDateTo] = useState<string>(searchParams.get('dateTo') || '');
  const [filterHouse, setFilterHouse] = useState<string>(searchParams.get('house') || 'all');
  const [filterFair, setFilterFair] = useState<string>(searchParams.get('fair') || 'all');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [sortField, setSortField] = useState<SortField>((searchParams.get('sortField') as SortField) || 'submittedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>((searchParams.get('sortOrder') as SortOrder) || 'desc');
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
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination state - also from URL
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [itemsPerPage, setItemsPerPage] = useState(parseInt(searchParams.get('perPage') || '10', 10));

  // Sync filter state to URL
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();

    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterCategory !== 'all') params.set('category', filterCategory);
    if (filterDateFrom) params.set('dateFrom', filterDateFrom);
    if (filterDateTo) params.set('dateTo', filterDateTo);
    if (filterHouse !== 'all') params.set('house', filterHouse);
    if (filterFair !== 'all') params.set('fair', filterFair);
    if (searchQuery) params.set('search', searchQuery);
    if (sortField !== 'submittedAt') params.set('sortField', sortField);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    if (currentPage !== 1) params.set('page', currentPage.toString());
    if (itemsPerPage !== 10) params.set('perPage', itemsPerPage.toString());

    setSearchParams(params, { replace: true });
  }, [filterStatus, filterCategory, filterDateFrom, filterDateTo, filterHouse, filterFair, searchQuery, sortField, sortOrder, currentPage, itemsPerPage, setSearchParams]);

  // Update URL when filters change
  useEffect(() => {
    updateUrlParams();
  }, [updateUrlParams]);

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
      setError(err.response?.data?.error || t('applicationReview.error.loadApplications'));
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
      setError(err.response?.data?.error || t('applicationReview.error.loadDetails'));
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setApplicationDetails(null);
    setEditingNotes(false);
    setNotesText('');
  };

  const startEditingNotes = () => {
    setNotesText(applicationDetails?.adminNotes || '');
    setEditingNotes(true);
  };

  const cancelEditingNotes = () => {
    setEditingNotes(false);
    setNotesText('');
  };

  const handleSaveNotes = async () => {
    if (!applicationDetails) return;

    try {
      setSavingNotes(true);
      setError(null);
      await adminApi.updateApplicationNotes(applicationDetails.id, notesText);
      // Update the local state
      setApplicationDetails({
        ...applicationDetails,
        adminNotes: notesText || null,
      });
      setEditingNotes(false);
      setSuccessMessage(t('applicationReview.success.notesUpdated'));
      // Refresh data to update table
      await fetchData();
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error saving admin notes:', err);
      setError(err.response?.data?.error || t('applicationReview.error.saveNotes'));
    } finally {
      setSavingNotes(false);
    }
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
      setSuccessMessage(t('applicationReview.success.approved'));
      closeApproveModal();
      // Refresh data
      await fetchData();
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error approving application:', err);
      setError(err.response?.data?.error || t('applicationReview.error.approve'));
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
      setSuccessMessage(t('applicationReview.success.rejected'));
      closeRejectModal();
      // Refresh data
      await fetchData();
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error rejecting application:', err);
      setError(err.response?.data?.error || t('applicationReview.error.reject'));
      closeRejectModal();
    } finally {
      setRejecting(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!applicationToDelete) return;
    try {
      setDeleting(true);
      setError(null);
      await adminApi.deleteApplication(applicationToDelete);
      setSuccessMessage(t('applicationReview.success.deleted'));
      setDeleteModalOpen(false);
      setApplicationToDelete(null);
      // Refresh data to update table and stats
      await fetchData();
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to delete application:', err);
      setError(err.response?.data?.error || t('applicationReview.error.delete'));
    } finally {
      setDeleting(false);
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedApplications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedApplications = filteredAndSortedApplications.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterCategory, filterDateFrom, filterDateTo, filterHouse, filterFair, searchQuery]);

  // Quick date filter helpers
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const setTodayFilter = () => {
    const today = new Date();
    const dateString = formatDateForInput(today);
    setFilterDateFrom(dateString);
    setFilterDateTo(dateString);
  };

  const setThisWeekFilter = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Calculate start of week (Monday)
    const startOfWeek = new Date(today);
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysFromMonday);
    // End of week is Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    setFilterDateFrom(formatDateForInput(startOfWeek));
    setFilterDateTo(formatDateForInput(endOfWeek));
  };

  const clearDateFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
  };

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
    return t(`categories.${category}`, category);
  };

  const exportToCSV = () => {
    if (filteredAndSortedApplications.length === 0) {
      setError(t('applicationReview.error.noToExport'));
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Define CSV headers
    const headers = [
      'ID',
      'Submitted At',
      'Status',
      'Company Name',
      'Product Category',
      'Business Description',
      'Contact Name',
      'Contact Email',
      'Contact Phone',
      'Fair Name',
      'Fair Status',
      'House Number',
      'Reviewed By',
      'Reviewed At',
      'Rejection Reason',
      'Admin Notes',
    ];

    // Helper function to escape CSV values
    const escapeCSVValue = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // If value contains comma, newline, or double quote, wrap in quotes and escape quotes
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Convert applications to CSV rows
    const rows = filteredAndSortedApplications.map(app => [
      escapeCSVValue(app.id),
      escapeCSVValue(formatDate(app.submittedAt)),
      escapeCSVValue(app.status),
      escapeCSVValue(app.companyName),
      escapeCSVValue(getCategoryLabel(app.productCategory)),
      escapeCSVValue(app.businessDescription),
      escapeCSVValue(app.contactName),
      escapeCSVValue(app.contactEmail),
      escapeCSVValue(app.contactPhone),
      escapeCSVValue(app.fairName),
      escapeCSVValue(app.fairStatus),
      escapeCSVValue(app.houseNumber),
      escapeCSVValue(app.reviewedBy),
      escapeCSVValue(app.reviewedAt ? formatDate(app.reviewedAt) : ''),
      escapeCSVValue(app.rejectionReason),
      escapeCSVValue(app.adminNotes),
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    // Generate filename with current date and filter info
    const dateStr = new Date().toISOString().split('T')[0];
    let filename = `applications_${dateStr}`;
    if (filterStatus !== 'all') filename += `_${filterStatus}`;
    if (filterFair !== 'all') filename += `_${filterFair.replace(/\s+/g, '_')}`;
    filename += '.csv';

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccessMessage(t('applicationReview.success.exportedCSV', { count: filteredAndSortedApplications.length }));
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const exportToPDF = () => {
    if (filteredAndSortedApplications.length === 0) {
      setError(t('applicationReview.error.noToExport'));
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Create PDF document in landscape mode for better table fit
    const doc = new jsPDF('landscape');

    // Add title
    const dateStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    doc.setFontSize(18);
    doc.text('Application Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${dateStr}`, 14, 22);

    // Add filter info
    let filterInfo = '';
    if (filterStatus !== 'all') filterInfo += `Status: ${filterStatus}  `;
    if (filterFair !== 'all') filterInfo += `Fair: ${filterFair}  `;
    if (filterCategory !== 'all') filterInfo += `Category: ${getCategoryLabel(filterCategory)}  `;
    if (filterInfo) {
      doc.text(`Filters: ${filterInfo}`, 14, 28);
    }
    doc.text(`Total Applications: ${filteredAndSortedApplications.length}`, 14, filterInfo ? 34 : 28);

    // Define table columns
    const tableColumns = [
      { header: 'Company', dataKey: 'company' },
      { header: 'Contact', dataKey: 'contact' },
      { header: 'Category', dataKey: 'category' },
      { header: 'Fair', dataKey: 'fair' },
      { header: 'House', dataKey: 'house' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Submitted', dataKey: 'submitted' },
      { header: 'Reviewed By', dataKey: 'reviewedBy' },
    ];

    // Prepare table data
    const tableData = filteredAndSortedApplications.map(app => ({
      company: app.companyName || 'N/A',
      contact: `${app.contactName}\n${app.contactEmail}`,
      category: getCategoryLabel(app.productCategory),
      fair: app.fairName,
      house: app.houseNumber,
      status: app.status.charAt(0).toUpperCase() + app.status.slice(1),
      submitted: formatDate(app.submittedAt).split(',')[0],
      reviewedBy: app.reviewedBy || '-',
    }));

    // Generate table
    autoTable(doc, {
      columns: tableColumns,
      body: tableData,
      startY: filterInfo ? 40 : 34,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        company: { cellWidth: 35 },
        contact: { cellWidth: 45 },
        category: { cellWidth: 30 },
        fair: { cellWidth: 35 },
        house: { cellWidth: 20 },
        status: { cellWidth: 20 },
        submitted: { cellWidth: 25 },
        reviewedBy: { cellWidth: 30 },
      },
    });

    // Generate filename
    const fileDateStr = new Date().toISOString().split('T')[0];
    let filename = `applications_${fileDateStr}`;
    if (filterStatus !== 'all') filename += `_${filterStatus}`;
    if (filterFair !== 'all') filename += `_${filterFair.replace(/\s+/g, '_')}`;
    filename += '.pdf';

    // Save PDF
    doc.save(filename);

    setSuccessMessage(t('applicationReview.success.exportedPDF', { count: filteredAndSortedApplications.length }));
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="application-review-container">
        <div className="loading-spinner">{t('applicationReview.loadingApplications')}</div>
      </div>
    );
  }

  return (
    <div className="application-review-container">
      <div className="page-header">
        <h1>{t('admin.applicationReview', { defaultValue: 'Application Review' })}</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={exportToCSV}>
            {t('admin.export.csv')}
          </button>
          <button className="btn btn-primary" onClick={exportToPDF}>
            {t('admin.export.pdf')}
          </button>
          <button className="btn btn-secondary" onClick={fetchData}>
            {t('applicationReview.refresh')}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {/* Statistics Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">{t('applicationReview.total')}</span>
        </div>
        <div className="stat-card stat-pending">
          <span className="stat-value">{stats.pending}</span>
          <span className="stat-label">{t('applicationReview.pending')}</span>
        </div>
        <div className="stat-card stat-approved">
          <span className="stat-value">{stats.approved}</span>
          <span className="stat-label">{t('applicationReview.approved')}</span>
        </div>
        <div className="stat-card stat-rejected">
          <span className="stat-value">{stats.rejected}</span>
          <span className="stat-label">{t('applicationReview.rejected')}</span>
        </div>
      </div>

      {/* Search Box */}
      <div className="search-box">
        <label htmlFor="search-input">{t('applicationReview.search')}</label>
        <input
          type="text"
          id="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('applicationReview.searchPlaceholder')}
          className="search-input"
        />
        {searchQuery && (
          <button
            className="clear-search-btn"
            onClick={() => setSearchQuery('')}
            title={t('applicationReview.clearSearch')}
          >
            ×
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="filter-controls">
        <div className="filter-group">
          <label htmlFor="status-filter">{t('applicationReview.filterByStatus')}</label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t('applicationReview.allStatuses')}</option>
            <option value="pending">{t('applications.status.pending')}</option>
            <option value="approved">{t('applications.status.approved')}</option>
            <option value="rejected">{t('applications.status.rejected')}</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="category-filter">{t('applicationReview.filterByCategory')}</label>
          <select
            id="category-filter"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t('applicationReview.allCategories')}</option>
            <option value="food_beverages">{t('categories.food_beverages')}</option>
            <option value="handicrafts">{t('categories.handicrafts')}</option>
            <option value="clothing">{t('categories.clothing')}</option>
            <option value="accessories">{t('categories.accessories')}</option>
            <option value="other">{t('categories.other')}</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="date-from">{t('applicationReview.from')}</label>
          <input
            type="date"
            id="date-from"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="filter-date"
          />
        </div>
        <div className="filter-group">
          <label htmlFor="date-to">{t('applicationReview.to')}</label>
          <input
            type="date"
            id="date-to"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="filter-date"
          />
        </div>
        <div className="filter-group quick-date-filters">
          <label>{t('applicationReview.quick')}</label>
          <div className="quick-date-buttons">
            <button
              type="button"
              className={`btn btn-outline btn-xs ${filterDateFrom === formatDateForInput(new Date()) && filterDateTo === formatDateForInput(new Date()) ? 'active' : ''}`}
              onClick={setTodayFilter}
            >
              {t('applicationReview.today')}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={setThisWeekFilter}
            >
              {t('applicationReview.thisWeek')}
            </button>
            {(filterDateFrom || filterDateTo) && (
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={clearDateFilters}
              >
                {t('applicationReview.clear')}
              </button>
            )}
          </div>
        </div>
        <div className="filter-group">
          <label htmlFor="house-filter">{t('applicationReview.filterByHouse')}</label>
          <select
            id="house-filter"
            value={filterHouse}
            onChange={(e) => setFilterHouse(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t('applicationReview.allHouses')}</option>
            {uniqueHouses.map((house) => (
              <option key={house} value={house}>
                {house}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="fair-filter">{t('applicationReview.filterByFair')}</label>
          <select
            id="fair-filter"
            value={filterFair}
            onChange={(e) => setFilterFair(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t('applicationReview.allFairs')}</option>
            {uniqueFairs.map((fair) => (
              <option key={fair} value={fair}>
                {fair}
              </option>
            ))}
          </select>
        </div>
        <div className="results-count">
          {t('applicationReview.showingCount', { count: filteredAndSortedApplications.length, total: applications.length })}
        </div>
      </div>

      {/* Applications Table */}
      {filteredAndSortedApplications.length === 0 ? (
        <div className="no-applications">
          <p>{t('applicationReview.noApplicationsFound')}</p>
          {(filterStatus !== 'all' || filterCategory !== 'all' || filterDateFrom || filterDateTo || filterHouse !== 'all' || filterFair !== 'all' || searchQuery) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStatus('all'); setFilterCategory('all'); setFilterDateFrom(''); setFilterDateTo(''); setFilterHouse('all'); setFilterFair('all'); setSearchQuery(''); }}>
              {t('common.clearFilters')}
            </button>
          )}
        </div>
      ) : (
        <div className="applications-table-container">
          <table className="applications-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('submittedAt')}>
                  {t('applicationReview.date')} {getSortIcon('submittedAt')}
                </th>
                <th className="sortable" onClick={() => handleSort('companyName')}>
                  {t('applicationReview.company')} {getSortIcon('companyName')}
                </th>
                <th>{t('applicationReview.contact')}</th>
                <th>{t('applicationReview.category')}</th>
                <th className="sortable" onClick={() => handleSort('fairName')}>
                  {t('applicationReview.fair')} {getSortIcon('fairName')}
                </th>
                <th className="sortable" onClick={() => handleSort('houseNumber')}>
                  {t('applicationReview.house')} {getSortIcon('houseNumber')}
                </th>
                <th className="sortable" onClick={() => handleSort('status')}>
                  {t('applicationReview.status')} {getSortIcon('status')}
                </th>
                <th>{t('applicationReview.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedApplications.map((app) => (
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
                      {t(`applications.status.${app.status}`)}
                    </span>
                    {app.reviewedBy && app.reviewedAt && (
                      <span className="reviewed-info">
                        {t('applicationReview.reviewedByPrefix')} {app.reviewedBy}
                      </span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-secondary btn-sm"
                      title={t('applicationReview.viewDetails')}
                      onClick={() => fetchApplicationDetails(app.id)}
                      disabled={loadingDetails}
                    >
                      {loadingDetails ? '...' : t('applicationReview.view')}
                    </button>
                    {app.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          title={t('applicationReview.approveApplication')}
                          onClick={() => openApproveModal(app.id)}
                          disabled={approving || rejecting}
                        >
                          {t('applicationReview.approve')}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          title={t('applicationReview.rejectApplication')}
                          onClick={() => openRejectModal(app.id)}
                          disabled={approving || rejecting}
                        >
                          {t('applicationReview.reject')}
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      title={t('common.delete')}
                      onClick={() => { setApplicationToDelete(app.id); setDeleteModalOpen(true); }}
                      disabled={deleting || approving || rejecting}
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {filteredAndSortedApplications.length > 0 && (
        <div className="pagination-controls">
          <div className="pagination-info">
            {t('applicationReview.showingRange', { start: startIndex + 1, end: Math.min(endIndex, filteredAndSortedApplications.length), total: filteredAndSortedApplications.length })}
          </div>
          <div className="pagination-buttons">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              {t('applicationReview.first')}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              {t('applicationReview.previous')}
            </button>
            <span className="page-indicator">
              {t('applicationReview.pageOf', { current: currentPage, total: totalPages })}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              {t('applicationReview.next')}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              {t('applicationReview.last')}
            </button>
          </div>
          <div className="items-per-page">
            <label htmlFor="items-per-page">{t('applicationReview.perPage')}</label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {/* Application Details Modal */}
      {showDetailsModal && applicationDetails && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('applicationReview.applicationDetails')}</h2>
              <button className="modal-close" onClick={closeDetailsModal}>&times;</button>
            </div>
            <div className="modal-body application-details-content">
              {/* Status Badge */}
              <div className="detail-section">
                <span className={getStatusBadgeClass(applicationDetails.status)}>
                  {t(`applications.status.${applicationDetails.status}`)}
                </span>
                <span className="submission-date">
                  {t('applicationReview.submitted')} {formatDate(applicationDetails.submittedAt)}
                </span>
              </div>

              {/* Vendor Information */}
              <div className="detail-section">
                <h3>{t('applicationReview.vendorInformation')}</h3>
                <div className="detail-grid">
                  {applicationDetails.logoUrl && (
                    <div className="logo-section">
                      <label>{t('applicationReview.companyLogo')}</label>
                      <img
                        src={applicationDetails.logoUrl}
                        alt="Company Logo"
                        className="vendor-logo"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="detail-item">
                    <label>{t('applicationReview.companyName')}</label>
                    <span>{applicationDetails.companyName || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>{t('applicationReview.category')}</label>
                    <span>{getCategoryLabel(applicationDetails.productCategory)}</span>
                  </div>
                  <div className="detail-item">
                    <label>{t('applicationReview.contactName')}</label>
                    <span>{applicationDetails.contactName || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>{t('applications.form.email')}</label>
                    <span>{applicationDetails.contactEmail}</span>
                  </div>
                  {applicationDetails.contactPhone && (
                    <div className="detail-item">
                      <label>{t('applicationReview.phone')}</label>
                      <span>{applicationDetails.contactPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Description */}
              <div className="detail-section">
                <h3>{t('applicationReview.businessDescription')}</h3>
                <p className="business-description">
                  {applicationDetails.businessDescription || t('applicationReview.noDescriptionProvided')}
                </p>
              </div>

              {/* Product Images */}
              {applicationDetails.productImages && applicationDetails.productImages.length > 0 && (
                <div className="detail-section">
                  <h3>{t('applicationReview.productImages')}</h3>
                  <div className="product-images-grid">
                    {applicationDetails.productImages.map((img) => (
                      <img
                        key={img.id}
                        src={img.imageUrl}
                        alt={`Product ${img.orderIndex + 1}`}
                        className="product-image"
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Fair & House Information */}
              <div className="detail-section">
                <h3>{t('applicationReview.fairHouseDetails')}</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>{t('applicationReview.fair')}</label>
                    <span>{applicationDetails.fairName}</span>
                  </div>
                  <div className="detail-item">
                    <label>{t('applicationReview.fairDates')}</label>
                    <span>
                      {new Date(applicationDetails.fairStartDate).toLocaleDateString()} - {new Date(applicationDetails.fairEndDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>{t('applicationReview.houseNumber')}</label>
                    <span className="house-number">{applicationDetails.houseNumber}</span>
                  </div>
                  {applicationDetails.houseAreaSqm && (
                    <div className="detail-item">
                      <label>{t('applicationReview.houseArea')}</label>
                      <span>{applicationDetails.houseAreaSqm} m²</span>
                    </div>
                  )}
                  {applicationDetails.housePrice && (
                    <div className="detail-item">
                      <label>{t('applicationReview.housePrice')}</label>
                      <span>{applicationDetails.housePrice.toLocaleString()} AZN</span>
                    </div>
                  )}
                  {applicationDetails.houseDescription && (
                    <div className="detail-item full-width">
                      <label>{t('applicationReview.houseDescription')}</label>
                      <span>{applicationDetails.houseDescription}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Information */}
              {(applicationDetails.reviewedAt || applicationDetails.rejectionReason) && (
                <div className="detail-section">
                  <h3>{t('applicationReview.reviewInformation')}</h3>
                  <div className="detail-grid">
                    {applicationDetails.reviewedAt && (
                      <div className="detail-item">
                        <label>{t('applicationReview.reviewedAt')}</label>
                        <span>{formatDate(applicationDetails.reviewedAt)}</span>
                      </div>
                    )}
                    {applicationDetails.reviewedBy && (
                      <div className="detail-item">
                        <label>{t('applicationReview.reviewedBy')}</label>
                        <span>{applicationDetails.reviewedBy}</span>
                      </div>
                    )}
                    {applicationDetails.rejectionReason && (
                      <div className="detail-item full-width">
                        <label>{t('applicationReview.rejectionReason')}</label>
                        <span className="rejection-reason">{applicationDetails.rejectionReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Notes Section - Editable */}
              <div className="detail-section admin-notes-section">
                <h3>
                  {t('applicationReview.internalAdminNotes')}
                  <span className="admin-only-label">{t('applicationReview.adminOnly')}</span>
                </h3>
                {editingNotes ? (
                  <div className="notes-edit-container">
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder={t('applicationReview.addNotesPlaceholder')}
                      rows={4}
                      className="form-textarea notes-textarea"
                      disabled={savingNotes}
                    />
                    <div className="notes-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={cancelEditingNotes}
                        disabled={savingNotes}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                      >
                        {savingNotes ? t('applicationReview.saving') : t('applicationReview.saveNotes')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="notes-display-container">
                    {applicationDetails.adminNotes ? (
                      <p className="admin-notes-text">{applicationDetails.adminNotes}</p>
                    ) : (
                      <p className="no-notes-text">{t('applicationReview.noAdminNotesYet')}</p>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={startEditingNotes}
                    >
                      {applicationDetails.adminNotes ? t('applicationReview.editNotes') : t('applicationReview.addNotes')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="modal-overlay" onClick={closeApproveModal}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('applicationReview.approveApproveTitle')}</h2>
              <button className="modal-close" onClick={closeApproveModal}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="approve-confirmation-text">
                {t('applicationReview.approveConfirmText')}
              </p>
              <div className="form-group">
                <label htmlFor="admin-notes">{t('applicationReview.adminNotesOptional')}</label>
                <textarea
                  id="admin-notes"
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder={t('applicationReview.addApprovalNotesPlaceholder')}
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
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-success"
                onClick={handleApprove}
                disabled={approving}
              >
                {approving ? t('applicationReview.approving') : t('applicationReview.confirmApproval')}
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
              <h2>{t('applicationReview.rejectRejectTitle')}</h2>
              <button className="modal-close" onClick={closeRejectModal}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="reject-confirmation-text">
                {t('applicationReview.rejectConfirmText')}
              </p>
              <div className="form-group">
                <label htmlFor="rejection-reason">{t('applicationReview.rejectionReasonRequired')}</label>
                <textarea
                  id="rejection-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('applicationReview.rejectionReasonPlaceholder')}
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
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-danger"
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
              >
                {rejecting ? t('applicationReview.rejecting') : t('applicationReview.confirmRejection')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="modal-overlay" onClick={() => setDeleteModalOpen(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('applicationReview.confirmDelete')}</h2>
              <button className="modal-close" onClick={() => setDeleteModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>{t('applicationReview.deleteWarning')}</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteApplication}
                disabled={deleting}
              >
                {deleting ? t('applicationReview.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationReview;
