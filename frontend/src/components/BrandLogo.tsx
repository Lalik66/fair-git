import React from 'react';
import './BrandLogo.css';

export const BRAND_LOGO_SRC = '/Remove_child_8.svg';

export type BrandLogoSize = 'sm' | 'md' | 'lg';

interface BrandLogoProps {
  size?: BrandLogoSize;
  glow?: boolean;
  className?: string;
  alt?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'sm',
  glow = false,
  className = '',
  alt = 'Fair Marketplace',
}) => {
  const classes = ['brand-logo', `brand-logo--${size}`, glow ? 'brand-logo--glow' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {glow && (
        <>
          <span className="brand-logo-halo brand-logo-halo--pale" aria-hidden="true" />
          <span className="brand-logo-halo brand-logo-halo--bright" aria-hidden="true" />
          <span className="brand-logo-glow brand-logo-glow--pale" aria-hidden="true" />
          <span className="brand-logo-glow brand-logo-glow--bright" aria-hidden="true" />
        </>
      )}
      <img src={BRAND_LOGO_SRC} alt={alt} className="brand-logo-img" decoding="async" />
    </span>
  );
};

export default BrandLogo;
