import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../services/api';
import FoxMascot from '../components/FoxMascot';
import RevealText from '../components/RevealText';
import Reveal from '../components/Reveal';
import EventCard from '../components/EventCard';
import FairFeedbackSection from '../components/FairFeedbackSection';
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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.766 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const PinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

// Hero illustration: winter scene with snowman, city silhouette, snowflakes.
// Reveals on mount so it eases in with the rest of the page rather than
// popping in fully-formed.
const HeroArt: React.FC = () => (
  <Reveal as="div" className="hero-art" aria-hidden="true">
    <div className="sky-bg" />
    <svg className="snowflakes" viewBox="0 0 600 380" preserveAspectRatio="none">
      <g stroke="#161513" strokeWidth="1" fill="none">
        <g transform="translate(60 50)"><line x1="-8" y1="0" x2="8" y2="0" /><line x1="0" y1="-8" x2="0" y2="8" /><line x1="-6" y1="-6" x2="6" y2="6" /><line x1="-6" y1="6" x2="6" y2="-6" /></g>
        <g transform="translate(160 110)"><line x1="-6" y1="0" x2="6" y2="0" /><line x1="0" y1="-6" x2="0" y2="6" /><line x1="-4" y1="-4" x2="4" y2="4" /><line x1="-4" y1="4" x2="4" y2="-4" /></g>
        <g transform="translate(260 70)"><line x1="-7" y1="0" x2="7" y2="0" /><line x1="0" y1="-7" x2="0" y2="7" /></g>
        <g transform="translate(410 40)"><line x1="-8" y1="0" x2="8" y2="0" /><line x1="0" y1="-8" x2="0" y2="8" /><line x1="-6" y1="-6" x2="6" y2="6" /><line x1="-6" y1="6" x2="6" y2="-6" /></g>
        <g transform="translate(510 100)"><line x1="-5" y1="0" x2="5" y2="0" /><line x1="0" y1="-5" x2="0" y2="5" /></g>
        <g transform="translate(110 180)"><line x1="-7" y1="0" x2="7" y2="0" /><line x1="0" y1="-7" x2="0" y2="7" /></g>
        <g transform="translate(350 170)"><line x1="-6" y1="0" x2="6" y2="0" /><line x1="0" y1="-6" x2="0" y2="6" /></g>
      </g>
    </svg>
    <svg className="city" viewBox="0 0 600 200" preserveAspectRatio="none">
      <g fill="#161513">
        <rect x="40" y="80" width="40" height="100" />
        <polygon points="40,80 60,60 80,80" />
        <rect x="100" y="40" width="50" height="140" />
        <polygon points="100,40 125,10 150,40" />
        <rect x="170" y="70" width="40" height="110" />
        <rect x="230" y="20" width="60" height="160" />
        <polygon points="230,20 260,-10 290,20" />
        <rect x="310" y="60" width="40" height="120" />
        <rect x="370" y="30" width="50" height="150" />
        <polygon points="370,30 395,0 420,30" />
        <rect x="440" y="70" width="40" height="110" />
        <rect x="500" y="40" width="60" height="140" />
        <polygon points="500,40 530,10 560,40" />
      </g>
    </svg>
    <div className="ground" />
    <svg className="snowman" viewBox="0 0 240 260">
      <g stroke="#161513" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="120" cy="248" rx="90" ry="7" fill="#161513" opacity="0.14" stroke="none" />
        <circle cx="120" cy="200" r="58" fill="#fffaf0" />
        <circle cx="120" cy="178" r="3.5" fill="#161513" stroke="none" />
        <circle cx="120" cy="200" r="3.5" fill="#161513" stroke="none" />
        <circle cx="120" cy="222" r="3.5" fill="#161513" stroke="none" />
        <circle cx="120" cy="138" r="44" fill="#fffaf0" />
        <path d="M76 138 C 56 132, 42 116, 38 96 M 38 96 L 32 92 M 38 96 L 38 88 M 50 108 L 44 102" fill="none" />
        <path d="M164 138 C 184 132, 198 116, 202 96 M 202 96 L 208 92 M 202 96 L 202 88 M 190 108 L 196 102" fill="none" />
        <path d="M82 96 C 100 108, 140 108, 158 96 L 158 112 C 140 122, 100 122, 82 112 Z" fill="#c4423a" />
        <path d="M152 116 L 174 124 L 168 144 L 148 132 Z" fill="#c4423a" />
        <circle cx="120" cy="74" r="34" fill="#fffaf0" />
        <path d="M120 76 L 152 82 L 120 84 Z" fill="#e8702a" />
        <path d="M104 64 C 108 60, 114 60, 116 64" fill="none" />
        <path d="M124 64 C 126 60, 132 60, 136 64" fill="none" />
        <circle cx="108" cy="92" r="2" fill="#161513" stroke="none" />
        <circle cx="116" cy="94" r="2" fill="#161513" stroke="none" />
        <circle cx="124" cy="94" r="2" fill="#161513" stroke="none" />
        <circle cx="132" cy="92" r="2" fill="#161513" stroke="none" />
        <path d="M86 46 L 154 46 L 154 50 L 86 50 Z" fill="#1f4f44" />
        <path d="M96 14 L 144 14 L 148 46 L 92 46 Z" fill="#1f4f44" />
        <path d="M93 38 L 147 38" stroke="#caa14b" strokeWidth="4" />
        <circle cx="138" cy="36" r="3" fill="#c4423a" stroke="none" />
        <circle cx="143" cy="34" r="3" fill="#c4423a" stroke="none" />
      </g>
    </svg>
  </Reveal>
);

// Hardcoded design content (no API source yet — see TODO in CSS file)
const TIMELINE = [
  { yr: '2020', color: '', titleKey: 'about.timeline.t1.title', bodyKey: 'about.timeline.t1.body' },
  { yr: '2022', color: 'gold', titleKey: 'about.timeline.t2.title', bodyKey: 'about.timeline.t2.body' },
  { yr: '2023', color: 'green', titleKey: 'about.timeline.t3.title', bodyKey: 'about.timeline.t3.body' },
  { yr: '2024', color: '', titleKey: 'about.timeline.t4.title', bodyKey: 'about.timeline.t4.body' },
  { yr: '2026', color: 'ink', titleKey: 'about.timeline.t5.title', bodyKey: 'about.timeline.t5.body' },
];

const ROSTER = [
  { initial: 'A', color: '', nameKey: 'about.roster.r1.name', roleKey: 'about.roster.r1.role', city: 'Baku', since: '2020' },
  { initial: 'N', color: 'green', nameKey: 'about.roster.r2.name', roleKey: 'about.roster.r2.role', city: 'Baku', since: '2021' },
  { initial: 'R', color: 'gold', nameKey: 'about.roster.r3.name', roleKey: 'about.roster.r3.role', city: 'Ganja', since: '2022' },
  { initial: 'İ', color: 'sky', nameKey: 'about.roster.r4.name', roleKey: 'about.roster.r4.role', city: 'Şəki', since: '2024' },
  { initial: 'L', color: '', nameKey: 'about.roster.r5.name', roleKey: 'about.roster.r5.role', city: 'Baku', since: '2023' },
];

const MISSION_TAGS = ['about.tags.hospitality', 'about.tags.craft', 'about.tags.small', 'about.tags.seasonal'];

const AboutPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [content, setContent] = useState<ContentMap>({});
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [upcomingFairs, setUpcomingFairs] = useState<UpcomingFair[]>([]);
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

  const getDescription = (fair: UpcomingFair | PastEvent) => {
    return i18n.language === 'en' ? fair.descriptionEn : fair.descriptionAz;
  };

  // "Dec 19 '24" — short month + day + apostrophe-2-digit year, to match the editorial design.
  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    const md = date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'az-AZ', {
      month: 'short',
      day: 'numeric',
    });
    const yr = date.getFullYear().toString().slice(-2);
    return `${md} '${yr}`;
  };

  // For upcoming-fair status pills: "Live · ends in 7d" or "Upcoming · Apr 4".
  const getStatusPillText = (fair: UpcomingFair) => {
    const now = new Date();
    if (fair.status === 'active') {
      const end = new Date(fair.endDate);
      const days = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      return `${t('about.status.live', 'Live')} · ${t('about.status.endsIn', 'ends in')} ${days}${t('about.status.daysShort', 'd')}`;
    }
    const start = new Date(fair.startDate);
    const startStr = start.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'az-AZ', {
      month: 'short',
      day: 'numeric',
    });
    return `${t('about.status.upcoming', 'Upcoming')} · ${startStr}`;
  };

  const getLocalizedContent = (section: AboutContent | undefined): string => {
    if (!section) return '';
    return i18n.language === 'en' ? (section.contentEn || '') : (section.contentAz || '');
  };

  const isFairLive = upcomingFairs.some((f) => f.status === 'active');
  const missionText = getLocalizedContent(content.mission);
  const historyText = getLocalizedContent(content.history);
  const teamText = getLocalizedContent(content.team);
  const contactText = getLocalizedContent(content.contact);

  const missionParagraphs = missionText.split('\n').map((p) => p.trim()).filter(Boolean);
  const historyParagraphs = historyText.split('\n').map((p) => p.trim()).filter(Boolean);
  const teamParagraphs = teamText.split('\n').map((p) => p.trim()).filter(Boolean);

  return (
    <div className="about-page">
      {/* ============== HERO ============== */}
      <section className="about-hero-section">
        <div className="about-wrap">
          <div className="hero-stamp">
            <div>{t('about.hero.stampTop', 'About · FestivKids')}</div>
            <div><b>{t('about.hero.stampSince', 'EST. 2020')}</b> · {t('about.hero.stampCity', 'Baku, AZ')}</div>
            <div>{t('about.hero.stampBilingual', 'Bilingual · EN · AZ')}</div>
          </div>
          <h1 className="about-page-title">
            <span className="about-page-title-rule" aria-hidden="true" />
            <em>{t('about.title', 'About Us')}</em>
            <span className="about-page-title-rule" aria-hidden="true" />
          </h1>
          <div className="hero-in">
            <div>
              <div className="eyebrow-row">
                <span className={`pill ${isFairLive ? 'live' : ''}`}>
                  <span className="dot" />
                  {isFairLive
                    ? t('about.hero.fairLive', 'Fair · live now')
                    : t('about.hero.fairUpcoming', 'Next fair · coming soon')}
                </span>
              </div>
              <RevealText as="p" className="hero-h1">
                {t('about.hero.headlineA', 'A marketplace')}<br />
                {t('about.hero.headlineB', 'that ')}<em>{t('about.hero.headlineEm', 'travels')}</em><br />
                {t('about.hero.headlineC', 'with the seasons.')}
              </RevealText>
              <p className="hero-deck">
                {t('about.hero.deck', "Family-friendly fairs across Azerbaijan — temporary villages of wooden houses, vendor stands, kids' workshops and warm food. We've been doing this since 2020.")}
              </p>
              <div className="hero-meta">
                <span className="since">{t('about.hero.metaSince', 'Since 2020')}</span>
                <span className="metadot" />
                <span className="since">{t('about.hero.metaCities', '3 cities · Baku · Ganja · Şəki')}</span>
              </div>
            </div>
            <HeroArt />
          </div>
        </div>
      </section>

      {/* ============== TICKER ============== */}
      <div className="breadcrumb-bar">
        <div className="about-wrap">
          <div className="breadcrumb-in">
            <span>FestivKids <b>/ {t('about.title', 'About Us')}</b></span>
            <span className="sep" />
            <span><b>4</b> {t('about.ticker.seasons', 'seasons')}</span>
            <span className="sep" />
            <span><b>5</b> {t('about.ticker.winters', 'winters')}</span>
            <span className="sep" />
            <span><b>38,000+</b> {t('about.ticker.visitors', 'visitors')}</span>
            <span className="sep" />
            <span><b>218</b> {t('about.ticker.vendors', 'vendors')}</span>
            <span className="sep" />
            <span><b>3</b> {t('about.ticker.cities', 'cities')}</span>
          </div>
        </div>
      </div>

      {/* ============== 01 · MISSION ============== */}
      <section className="mission-section">
        <div className="about-wrap">
          <div className="mission-grid">
            <div>
              <div className="marker"><span className="marker-n">01</span>{t('about.mission', 'Our Mission')}</div>
              <RevealText as="h2" className="mission-h2">
                {t('about.missionDesign.headlineA', 'Bring sellers')}<br />
                {t('about.missionDesign.headlineB', 'and visitors')}<br />
                {t('about.missionDesign.headlineC', 'into one ')}<em>{t('about.missionDesign.headlineEm', 'lively')}</em><br />
                {t('about.missionDesign.headlineD', 'room.')}
              </RevealText>
              <div className="mission-tags">
                {MISSION_TAGS.map((k) => (
                  <span className="tag" key={k}>{t(k, k.split('.').pop()!)}</span>
                ))}
              </div>
            </div>
            <div className="mission-body">
              {loading ? (
                <p className="loading-text">{t('common.loading')}</p>
              ) : missionParagraphs.length > 0 ? (
                missionParagraphs.map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <p className="placeholder-text">{t('about.noContent', 'Content coming soon. Please check back later!')}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============== 02 · HISTORY ============== */}
      <section className="history-section">
        <div className="about-wrap">
          <div className="history-head">
            <div>
              <div className="marker"><span className="marker-n">02</span>{t('about.history', 'Our History')}</div>
              <RevealText as="h2" className="history-h2">
                {t('about.historyDesign.headlineA', 'Five winters in.')}<br />
                {t('about.historyDesign.headlineB', "And we're ")}<em>{t('about.historyDesign.headlineEm', 'just')}</em>{t('about.historyDesign.headlineC', ' getting')}<br />
                {t('about.historyDesign.headlineD', 'started.')}
              </RevealText>
            </div>
            <div className="history-aside">
              {loading ? (
                <p className="loading-text">{t('common.loading')}</p>
              ) : historyParagraphs.length > 0 ? (
                historyParagraphs.slice(0, 2).map((p, i) => <p className="lede" key={i}>{p}</p>)
              ) : (
                <p className="lede">{t('about.historyDesign.lede', 'FestivKids started in 2020 with one fair in Baku and twelve vendors. Here is how we got here.')}</p>
              )}
            </div>
          </div>

          <div className="timeline">
            <div className="timeline-row">
              {TIMELINE.map((tl, idx) => (
                <Reveal as="div" className={`tl ${tl.color}`} key={tl.yr} delay={idx * 90}>
                  <span className="tl-node" />
                  <div className="tl-yr">{tl.yr}</div>
                  <div className="tl-title">{t(tl.titleKey, tl.titleKey)}</div>
                  <div className="tl-body">{t(tl.bodyKey, tl.bodyKey)}</div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============== 03 · TEAM ============== */}
      <section className="team-section">
        <div className="about-wrap">
          <div className="team-grid">
            <div>
              <div className="marker"><span className="marker-n">03</span>{t('about.team', 'Our Team')}</div>
              <RevealText as="h2" className="team-h2">
                {t('about.teamDesign.headlineA', 'A small team,')}<br />
                {t('about.teamDesign.headlineB', 'a ')}<em>{t('about.teamDesign.headlineEm', 'big')}</em>{t('about.teamDesign.headlineC', ' rolodex of')}<br />
                {t('about.teamDesign.headlineD', 'makers.')}
              </RevealText>
              <div className="team-body">
                {loading ? (
                  <p className="loading-text">{t('common.loading')}</p>
                ) : teamParagraphs.length > 0 ? (
                  teamParagraphs.map((p, i) => <p key={i}>{p}</p>)
                ) : (
                  <p className="placeholder-text">{t('about.teamDesign.fallback', 'A small full-time team year-round; hundreds of vendors, workshop leaders and volunteers build each season.')}</p>
                )}
              </div>
              <div className="team-stats">
                <Reveal as="div" className="team-stat" delay={0}>
                  <div className="team-stat-v">8</div>
                  <div className="team-stat-l">{t('about.teamDesign.statFull', 'Full-time')}</div>
                </Reveal>
                <Reveal as="div" className="team-stat" delay={100}>
                  <div className="team-stat-v">42</div>
                  <div className="team-stat-l">{t('about.teamDesign.statSeasonal', 'Seasonal')}</div>
                </Reveal>
                <Reveal as="div" className="team-stat" delay={200}>
                  <div className="team-stat-v">160+</div>
                  <div className="team-stat-l">{t('about.teamDesign.statVolunteers', 'Volunteers')}</div>
                </Reveal>
              </div>
            </div>
            <div className="roster">
              {ROSTER.map((r, idx) => (
                <Reveal
                  as="div"
                  className={`roster-row ${r.color}`}
                  key={r.nameKey}
                  delay={idx * 80}
                >
                  <div className="roster-av">{r.initial}</div>
                  <div className="roster-info">
                    <b>{t(r.nameKey, r.nameKey)}</b>
                    <span>{t(r.roleKey, r.roleKey)}</span>
                  </div>
                  <div className="roster-meta">{r.city}<br />{r.since} →</div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============== 04 · CONTACT (dark, with Donatello) ============== */}
      <section className="contact-section">
        <div className="about-wrap">
          <div className="contact-in">
            <div>
              <div className="marker marker-on-dark">
                <span className="marker-n marker-n-light">04</span>
                {t('about.contact', 'Contact Us')}
              </div>
              <RevealText as="h2" className="contact-h2">
                {t('about.contactDesign.headlineA', 'Say ')}<em>{t('about.contactDesign.headlineEm', 'hello')}</em>.<br />
                {t('about.contactDesign.headlineB', 'We read every line.')}
              </RevealText>
              {contactText ? (
                <p className="contact-lede">{contactText}</p>
              ) : (
                <p className="contact-lede">
                  {t('about.contactDesign.lede', 'Vendors, partners, parents with workshop ideas, journalists — all welcome. We answer in Azerbaijani or English, usually within two working days.')}
                </p>
              )}

              {(contactInfo?.phone || contactInfo?.email) && (
                <div className="contact-rows">
                  {contactInfo?.phone && (
                    <Reveal as="a" className="contact-row" href={`tel:${contactInfo.phone}`} delay={0}>
                      <span className="icob"><PhoneIcon /></span>
                      <div>
                        <span className="contact-row-l">{t('about.contactDesign.phone', 'Phone')}</span>
                        <span className="contact-row-v">{contactInfo.phone}</span>
                      </div>
                      <span className="arrow">↗</span>
                    </Reveal>
                  )}
                  {contactInfo?.email && (
                    <Reveal as="a" className="contact-row" href={`mailto:${contactInfo.email}`} delay={120}>
                      <span className="icob"><EmailIcon /></span>
                      <div>
                        <span className="contact-row-l">{t('about.contactDesign.email', 'Email')}</span>
                        <span className="contact-row-v">{contactInfo.email}</span>
                      </div>
                      <span className="arrow">↗</span>
                    </Reveal>
                  )}
                </div>
              )}

              {(contactInfo?.facebookUrl || contactInfo?.instagramUrl) && (
                <div className="social-row">
                  <span className="social-l">{t('about.socialMedia', 'Social media')}</span>
                  {contactInfo?.facebookUrl && (
                    <a href={contactInfo.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                      <FacebookIcon />
                    </a>
                  )}
                  {contactInfo?.instagramUrl && (
                    <a href={contactInfo.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                      <InstagramIcon />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Donatello plate */}
            <Reveal as="div" className="donatello-plate" aria-hidden="true" delay={200}>
              <span className="donatello-tag">
                {t('about.contactDesign.mascotLabel', 'Mascot')} · <b>Donatello</b>
              </span>
              <div className="donatello-img">
                <img
                  src="/tmnt-donatello.gif"
                  alt=""
                  width={400}
                  height={400}
                  decoding="async"
                  loading="lazy"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============== 05 · UPCOMING ============== */}
      {!upcomingLoading && upcomingFairs.length > 0 && (
        <section className="upcoming-section">
          <div className="about-wrap">
            <div className="sec-head">
              <div>
                <div className="marker"><span className="marker-n">05</span>{t('about.upcomingEvents', 'Upcoming Events')}</div>
                <RevealText as="h2" className="sec-h2">
                  {t('about.upcomingDesign.headlineA', "What's ")}<em>{t('about.upcomingDesign.headlineEm', 'next')}</em>{t('about.upcomingDesign.headlineB', ' on the calendar.')}
                </RevealText>
              </div>
              <div className="sec-right">
                {upcomingFairs.length} {upcomingFairs.length === 1 ? t('about.fair', 'fair') : t('about.fairs', 'fairs')}
                {(() => {
                  const minYr = upcomingFairs.reduce<number | null>((acc, f) => {
                    const y = new Date(f.startDate).getFullYear();
                    return acc === null || y < acc ? y : acc;
                  }, null);
                  return minYr ? <> · {minYr} →</> : null;
                })()}
              </div>
            </div>

            <div className="fairs-grid">
              {upcomingFairs.map((fair, idx) => (
                <Reveal as="article" className="fair-card" key={fair.id} delay={idx * 80}>
                  <div
                    className="fair-cover"
                    style={fair.bannerImageUrl ? { backgroundImage: `url(${fair.bannerImageUrl})` } : undefined}
                  >
                    <span className={`pill ${fair.status === 'active' ? 'live' : 'warn'} fair-badge`}>
                      <span className="dot" />
                      {getStatusPillText(fair)}
                    </span>
                    {fair.locationAddress && (
                      <div className="fair-city">{fair.locationAddress}</div>
                    )}
                  </div>
                  <div className="fair-body">
                    <h3 className="fair-h3">{fair.name}</h3>
                    <div className="fair-when">
                      {formatShortDate(fair.startDate)} → {formatShortDate(fair.endDate)}
                    </div>
                    {getDescription(fair) && (
                      <p className="fair-desc">{getDescription(fair)}</p>
                    )}
                    <div className="fair-foot">
                      {fair.locationAddress ? (
                        <span className="fair-where">
                          <PinIcon /> {fair.locationAddress}
                        </span>
                      ) : <span />}
                      <Link to={`/map?fairId=${fair.id}`} className="fair-cta">
                        {t('about.upcomingDesign.viewMap', 'View on map')} →
                      </Link>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============== 06 · PAST ============== */}
      {!eventsLoading && pastEvents.length > 0 && (
        <section className="past-section">
          <div className="about-wrap">
            <div className="sec-head">
              <div>
                <div className="marker"><span className="marker-n">06</span>{t('about.pastDesign.label', 'Archive')}</div>
                <RevealText as="h2" className="sec-h2">
                  {t('about.pastDesign.headlineA', 'Past ')}<em>{t('about.pastDesign.headlineEm', 'fairs')}</em>{t('about.pastDesign.headlineB', '. And the makers who showed up.')}
                </RevealText>
              </div>
              <div className="sec-right">
                {(() => {
                  const years = pastEvents.map((e) => new Date(e.startDate).getFullYear());
                  const minYr = Math.min(...years);
                  const maxYr = Math.max(...years);
                  const range = minYr === maxYr ? `${minYr}` : `${minYr} → ${maxYr}`;
                  return <>{pastEvents.length} {t('about.pastDesign.archived', 'archived')} · {range}</>;
                })()}
              </div>
            </div>

            <div className="past-cards-grid">
              {pastEvents.map((event) => (
                <EventCard key={event.id} fair={event} variant="archive" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============== 07 · FEEDBACK ============== */}
      <FairFeedbackSection />

      <FoxMascot isFairActive={isFairLive} />
    </div>
  );
};

export default AboutPage;
