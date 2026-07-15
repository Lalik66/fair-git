import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import BrandLogo from './BrandLogo';
import './Footer.css';

// Public-site footer. Mirrors the top Navigation (App.tsx) — same destinations,
// same i18n keys, same burgundy (--fk-accent) hover/active treatment — so the
// two navs stay in sync. Rendered by AppContent, which excludes it on /map and
// the auth/portal shells (see App.tsx), the same way Navigation is gated.
const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  // Role-aware vendor/dashboard target, mirroring the nav dropdown's
  // getDashboardUrl(): admins/vendors land in their portal, everyone else on
  // the login flow that leads into the vendor application.
  const vendorPortalUrl =
    user?.role === 'admin' ? '/admin' : user?.role === 'vendor' ? '/vendor' : '/login';

  // Same public destinations as the top nav, in the same order.
  const links: { to: string; label: string }[] = [
    { to: '/', label: t('nav.home') },
    { to: '/map', label: t('nav.browseMap') },
    { to: '/schedule', label: t('nav.schedule', 'Schedule') },
    { to: '/about', label: t('nav.aboutUs') },
    { to: vendorPortalUrl, label: t('footer.vendorPortal') },
  ];

  // A link is active when it points at the current route. '/' only matches the
  // home page exactly so it isn't lit up on every sub-route.
  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link to="/" className="site-footer-brand-link" aria-label="FestivKids">
            <BrandLogo size="sm" glow alt="" />
            <span className="site-footer-brand-text">FestivKids</span>
          </Link>
          <p className="site-footer-tagline">{t('footer.tagline')}</p>
        </div>

        <nav className="site-footer-nav" aria-label={t('footer.nav')}>
          {links.map((link) => (
            <Link
              key={`${link.to}-${link.label}`}
              to={link.to}
              className={`site-footer-link${isActive(link.to) ? ' is-active' : ''}`}
              aria-current={isActive(link.to) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="site-footer-bottom">
        <p className="site-footer-copy">
          © {year} FestivKids. {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
