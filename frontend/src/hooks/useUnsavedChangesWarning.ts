import { useEffect, useCallback, useState } from 'react';

interface UseUnsavedChangesWarningOptions {
  isDirty: boolean;
  message?: string;
}

/**
 * Hook to warn users about unsaved changes when navigating away
 * Handles both browser navigation (back button, close tab) and in-app navigation
 */
export const useUnsavedChangesWarning = ({
  isDirty,
  message = 'You have unsaved changes. Are you sure you want to leave?'
}: UseUnsavedChangesWarningOptions) => {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Handle browser navigation (back button, close tab, refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);

  // Function to check if navigation should be blocked
  const confirmNavigation = useCallback((callback: () => void): boolean => {
    if (isDirty) {
      setPendingNavigation(() => callback);
      setShowWarningModal(true);
      return false; // Block navigation
    }
    return true; // Allow navigation
  }, [isDirty]);

  // Function to handle "Stay" action
  const handleStay = useCallback(() => {
    setShowWarningModal(false);
    setPendingNavigation(null);
  }, []);

  // Function to handle "Leave" action
  const handleLeave = useCallback(() => {
    setShowWarningModal(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  return {
    showWarningModal,
    confirmNavigation,
    handleStay,
    handleLeave,
    warningMessage: message,
  };
};

export default useUnsavedChangesWarning;
