import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../services/api';
import FoxMascot from '../components/FoxMascot';
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

interface ContactInfo {
  phone: string | null;
  email: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
}

// Simple inline SVG icons
const PhoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
  </svg>
);

const EmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.766 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const AboutPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [content, setContent] = useState<ContentMap>({});
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [upcomingFairs, setUpcomingFairs] = useState<UpcomingFair[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);

  useEffect(() => {
    fetchContent();
    fetchPastEvents();
    fetchUpcomingFairs();
    fetchContactInfo();
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

  const fetchContactInfo = async () => {
    try {
      const data = await publicApi.getContactInfo();
      setContactInfo(data);
    } catch (error) {
      console.error('Error fetching contact info:', error);
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
    if (!category) return t('categories.other', 'Other');
    return t(`categories.${category}`, category);
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
          <div className="loading-placeholder">{t('common.loading')}</div>
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

        {/* Contact Info & Social Media Section */}
        {(contactInfo?.phone || contactInfo?.email || contactInfo?.facebookUrl || contactInfo?.instagramUrl) && (
          <section className="about-section about-contact-social-section">
            <h2>
              <span className="section-icon">📞</span>
              {t('about.contactInfo', 'Contact information')}
            </h2>
            <div className="contact-info-rows">
              {contactInfo?.phone && (
                <a href={`tel:${contactInfo.phone}`} className="contact-info-item">
                  <span className="contact-icon-box">
                    <PhoneIcon />
                  </span>
                  <span className="contact-info-text">{contactInfo.phone}</span>
                </a>
              )}
              {contactInfo?.email && (
                <a href={`mailto:${contactInfo.email}`} className="contact-info-item">
                  <span className="contact-icon-box">
                    <EmailIcon />
                  </span>
                  <span className="contact-info-text">{contactInfo.email}</span>
                </a>
              )}
            </div>
            {(contactInfo?.facebookUrl || contactInfo?.instagramUrl) && (
              <>
                <h3 className="social-heading">{t('about.socialMedia', 'Social media')}</h3>
                <div className="social-icons-row">
                  {contactInfo?.facebookUrl && (
                    <a
                      href={contactInfo.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-icon-link"
                      aria-label="Facebook"
                    >
                      <FacebookIcon />
                    </a>
                  )}
                  {contactInfo?.instagramUrl && (
                    <a
                      href={contactInfo.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-icon-link"
                      aria-label="Instagram"
                    >
                      <InstagramIcon />
                    </a>
                  )}
                </div>
              </>
            )}
          </section>
        )}

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
                        loading="lazy"
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
                        aria-label={expandedEventId === event.id ? t('about.collapse', 'Collapse') : t('about.expand', 'Expand')}
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
                                loading="lazy"
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

      <FoxMascot isFairActive={upcomingFairs.some(f => f.status === 'active')} />
    </div>
  );
};

export default AboutPage;
