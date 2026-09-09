import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BrandLogo, { BRAND_LOGO_SRC } from './BrandLogo';

describe('BrandLogo', () => {
  it('renders the logo image with the default alt text', () => {
    render(<BrandLogo />);
    const img = screen.getByAltText('Fair Marketplace') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toBe(BRAND_LOGO_SRC);
  });

  it('applies the size modifier class', () => {
    const { container } = render(<BrandLogo size="lg" />);
    expect(container.querySelector('.brand-logo--lg')).not.toBeNull();
  });

  it('renders glow decoration elements only when glow is enabled', () => {
    const { container: without } = render(<BrandLogo />);
    expect(without.querySelector('.brand-logo-glow')).toBeNull();

    const { container: withGlow } = render(<BrandLogo glow />);
    expect(withGlow.querySelector('.brand-logo--glow')).not.toBeNull();
    expect(withGlow.querySelector('.brand-logo-glow')).not.toBeNull();
  });

  it('honours a custom alt label', () => {
    render(<BrandLogo alt="Custom Label" />);
    expect(screen.getByAltText('Custom Label')).toBeInTheDocument();
  });
});
