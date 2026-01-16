import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../services/api';
import './AboutPage.css';

interface AboutContent {
  contentAz: string | null;
  contentEn: string | null;
  updatedAt: string;
}

interface ContentMap {
  mission?: AboutContent;
  history?: AboutContent;
  team?: AboutContent;
  contact?: AboutContent;
  [key: string]: AboutContent | undefined;
}

interface Vendor {
  id: string;
  companyName: string | null;
  productCategory: string | null;
  logoUrl: string | null;
  ownerName: string | null;
}

interface PastEvent {
  id: string;
  name: string;
  descriptionAz: string | null;
  descriptionEn: string | null;
  startDate: string;
  endDate: string;
  locationAddress: string | null;
  bannerImageUrl: string | null;
  status: string;
  vendorCount: number;
  vendors: Vendor[];
}

interface UpcomingFair {
  id: string;
  name: string;
  descriptionAz: string | null;
  descriptionEn: string | null;
  startDate: string;
  endDate: string;
  locationAddress: string | null;
  bannerImageUrl: string | null;
  status: string;
}

const AboutPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [content, setContent] = useState<ContentMap>({});
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [upcomingFairs, setUpcomingFairs] = useState<UpcomingFair[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  useEffect(() => {
    fetchContent();
    fetchPastEvents();
    fetchUpcomingFairs();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await publicApi.getAboutUs();
      setContent(response.content || {});
    } catch (error) {
      console.error('Error fetching about us content:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPastEvents = async () => {
    try {
      setEventsLoading(true);
      const response = await publicApi.getPastEvents();
      setPastEvents(response.events || []);
    } catch (error) {
      console.error('Error fetching past events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchUpcomingFairs = async () => {
    try {
      setUpcomingLoading(true);
      const response = await publicApi.getFairs();
      setUpcomingFairs(response.fairs || []);
    } catch (error) {
      console.error('Error fetching upcoming fairs:', error);
    } finally {
      setUpcomingLoading(false);
    }
  };

  const getDescription = (fair: UpcomingFair) => {
    return i18n.language === 'en' ? fair.descriptionEn : fair.descriptionAz;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'az-AZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  const getCategoryLabel = (category: string | null) => {
    if (!category) return t('vendor.categories.other', 'Other');
    const categoryMap: Record<string, string> = {
      food_beverages: t('vendor.categories.foodBeverages', 'Food & Beverages'),
      handicrafts: t('vendor.categories.handicrafts', 'Handicrafts'),
      clothing: t('vendor.categories.clothing', 'Clothing'),
      accessories: t('vendor.categories.accessories', 'Accessories'),
      other: t('vendor.categories.other', 'Other'),
    };
    return categoryMap[category] || category;
  };

  const getLocalizedContent = (section: AboutContent | undefined): string => {
    if (!section) return '';
    return i18n.language === 'en' ? (section.contentEn || '') : (section.contentAz || '');
  };

  const renderSection = (sectionKey: string, title: string, icon: string) => {
    const sectionContent = getLocalizedContent(content[sectionKey]);
    if (!sectionContent && !loading) return null;

    return (
      <section className="about-section" key={sectionKey}>
        <h2>
          <span className="section-icon">{icon}</span>
          {title}
        </h2>
        {loading ? (
          <div className="loading-placeholder">Loading...</div>
        ) : (
          <div className="section-content">
            {sectionContent.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="about-page">
      <div className="about-hero">
        <h1>{t('about.title', 'About Us')}</h1>
        <p className="about-subtitle">{t('about.subtitle', 'Learn more about Fair Marketplace')}</p>
      </div>

      <div className="about-content">
        {renderSection('mission', t('about.mission', 'Our Mission'), '🎯')}
        {renderSection('history', t('about.history', 'Our History'), '📜')}
        {renderSection('team', t('about.team', 'Our Team'), '👥')}
        {renderSection('contact', t('about.contact', 'Contact Us'), '📧')}

        {!loading && Object.keys(content).length === 0 && (
          <div className="about-placeholder">
            <p>{t('about.noContent', 'Content coming soon. Please check back later!')}</p>
          </div>
        )}

        {/* Upcoming Events Section */}
        {!upcomingLoading && upcomingFairs.length > 0 && (
          <section className="about-section upcoming-events-section">
            <h2>
              <span className="section-icon">🎪</span>
              {t('about.upcomingEvents', 'Upcoming Events')}
            </h2>
            <div className="upcoming-events-list">
              {upcomingFairs.map((fair) => (
                <div key={fair.id} className="upcoming-event-card">
                  {fair.bannerImageUrl && (
                    <div className="upcoming-event-banner">
                      <img
                        src={fair.bannerImageUrl}
                        alt={fair.name}
                        className="banner-image"
                      />
                    </div>
                  )}
                  <div className="upcoming-event-content">
                    <div className="upcoming-event-status">
                      <span className={`status-badge ${fair.status}`}>
                        {fair.status === 'active'
                          ? t('about.status.live', 'Live Now')
                          : t('about.status.upcoming', 'Coming Soon')}
                      </span>
                    </div>
                    <h3 className="upcoming-event-name">{fair.name}</h3>
                    <div className="upcoming-event-dates">
                      <span className="date-icon">📅</span>
                      {formatDate(fair.startDate)} - {formatDate(fair.endDate)}
                    </div>
                    {fair.locationAddress && (
                      <div className="upcoming-event-location">
                        <span className="location-icon">📍</span> {fair.locationAddress}
                      </div>
                    )}
                    {getDescription(fair) && (
                      <p className="upcoming-event-description">{getDescription(fair)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Past Events Section */}
        {!eventsLoading && pastEvents.length > 0 && (
          <section className="about-section past-events-section">
            <h2>
              <span className="section-icon">📅</span>
              {t('about.pastEvents', 'Past Events')}
            </h2>
            <div className="past-events-list">
              {pastEvents.map((event) => (
                <div key={event.id} className="past-event-card">
                  <div
                    className="past-event-header"
                    onClick={() => toggleEventExpansion(event.id)}
                  >
                    <div className="past-event-info">
                      <h3 className="past-event-name">{event.name}</h3>
                      <div className="past-event-dates">
                        {formatDate(event.startDate)} - {formatDate(event.endDate)}
                      </div>
                      {event.locationAddress && (
                        <div className="past-event-location">
                          <span className="location-icon">📍</span> {event.locationAddress}
                        </div>
                      )}
                    </div>
                    <div className="past-event-stats">
                      <span className="vendor-count">
                        <span className="vendor-icon">🏪</span>
                        {event.vendorCount} {event.vendorCount === 1
                          ? t('about.vendor', 'vendor')
                          : t('about.vendors', 'vendors')}
                      </span>
                      <button
                        className={`expand-btn ${expandedEventId === event.id ? 'expanded' : ''}`}
                        aria-label={expandedEventId === event.id ? 'Collapse' : 'Expand'}
                      >
                        {expandedEventId === event.id ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {expandedEventId === event.id && event.vendors.length > 0 && (
                    <div className="past-event-vendors">
                      <h4>{t('about.participatingVendors', 'Participating Vendors')}</h4>
                      <div className="vendors-grid">
                        {event.vendors.map((vendor) => (
                          <div key={vendor.id} className="vendor-card">
                            {vendor.logoUrl ? (
                              <img
                                src={vendor.logoUrl}
                                alt={vendor.companyName || 'Vendor'}
                                className="vendor-logo"
                              />
                            ) : (
                              <div className="vendor-logo-placeholder">🏪</div>
                            )}
                            <div className="vendor-info">
                              <span className="vendor-name">
                                {vendor.companyName || vendor.ownerName || t('about.anonymousVendor', 'Vendor')}
                              </span>
                              <span className="vendor-category">
                                {getCategoryLabel(vendor.productCategory)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {expandedEventId === event.id && event.vendors.length === 0 && (
                    <div className="past-event-vendors">
                      <p className="no-vendors">{t('about.noVendorsRecorded', 'No vendor records available for this event.')}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AboutPage;
