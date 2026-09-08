import React from 'react';
import useMarketingPopupTriggers from '../hooks/useMarketingPopupTriggers';
import MarketingSignupModal from './MarketingSignupModal';

/**
 * Connects the trigger hook to the modal. Mounted once in App on public
 * visitor routes only (same gate as SosButton). Keeping the hook here — rather
 * than in App — means the listeners unmount cleanly when the visitor navigates
 * into a gated portal route.
 */
const MarketingSignupGate: React.FC = () => {
  const { shouldShow, markSubmitted, markDismissed } = useMarketingPopupTriggers();

  if (!shouldShow) return null;

  return (
    <MarketingSignupModal
      onClose={markDismissed}
      onDismiss={markDismissed}
      onSubmitted={markSubmitted}
    />
  );
};

export default MarketingSignupGate;
