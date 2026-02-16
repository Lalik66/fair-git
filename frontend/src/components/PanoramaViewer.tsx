import React, { useEffect, useRef, useState } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';
import './PanoramaViewer.css';
import { DEMO_PANORAMA_URL } from '../types/map';

interface PanoramaViewerProps {
  panoramaUrl?: string | null;
  onClose: () => void;
  houseNumber: string;
}

const PanoramaViewer: React.FC<PanoramaViewerProps> = ({ panoramaUrl, onClose, houseNumber }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const initializedUrlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(!panoramaUrl);

  // Stabilize the URL to prevent re-runs when undefined becomes null or vice versa
  const stableUrl = panoramaUrl ?? DEMO_PANORAMA_URL;

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    const initViewer = () => {
      if (cancelled || !containerRef.current) return;

      const urlToLoad = stableUrl;

      // Prevent re-initialization if we've already initialized for this URL
      if (initializedUrlRef.current === urlToLoad && viewerRef.current) {
        console.log('[PanoramaViewer] Already initialized for this URL, skipping');
        return;
      }

      // Debug logging
      console.log('[PanoramaViewer] Initializing with URL:', urlToLoad);
      console.log('[PanoramaViewer] Container dimensions:', {
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });

      // Track the URL we're initializing with
      initializedUrlRef.current = urlToLoad;

      // Initialize the Photo Sphere Viewer
      try {
        viewerRef.current = new Viewer({
          container: containerRef.current,
          panorama: urlToLoad,
          navbar: [
            'zoom',
            'move',
            'fullscreen',
          ],
          defaultZoomLvl: 50,
          loadingTxt: 'Loading 360° panorama...',
          touchmoveTwoFingers: true,
          mousewheelCtrlKey: false,
        });

        // Handle ready event
        viewerRef.current.addEventListener('ready', () => {
          if (cancelled) return;
          console.log('[PanoramaViewer] Viewer ready!');
          setLoading(false);
        });

        // Handle error event - try demo fallback if original URL fails
        // Type assertion needed as 'load-error' is a valid event but not in TypeScript types
        (viewerRef.current as any).addEventListener('load-error', (e: unknown) => {
          if (cancelled) return;
          console.error('[PanoramaViewer] Load error:', e);

          // If we were trying to load a custom URL and it failed, try the demo
          if (urlToLoad !== DEMO_PANORAMA_URL && viewerRef.current) {
            if (cancelled) return;
            console.log('[PanoramaViewer] Falling back to demo panorama...');
            setUsingDemo(true);
            viewerRef.current.setPanorama(DEMO_PANORAMA_URL).catch((fallbackErr) => {
              if (cancelled) return;
              console.error('[PanoramaViewer] Fallback also failed:', fallbackErr);
              setError('Failed to load 360° panorama. The image may not be available.');
              setLoading(false);
            });
          } else {
            if (cancelled) return;
            setError('Failed to load 360° panorama. The image may not be available.');
            setLoading(false);
          }
        });
      } catch (err) {
        if (cancelled) return;
        console.error('[PanoramaViewer] Error initializing viewer:', err);
        setError('Failed to initialize 360° viewer.');
        setLoading(false);
      }
    };

    // Defer init to next tick - avoids creating a viewer that gets immediately
    // destroyed by React Strict Mode's double-mount in development
    const timer = setTimeout(initViewer, 0);

    // Cleanup on unmount or URL change
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (viewerRef.current) {
        console.log('[PanoramaViewer] Destroying viewer');
        viewerRef.current.destroy();
        viewerRef.current = null;
        initializedUrlRef.current = null;
      }
    };
  }, [stableUrl]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="panorama-overlay" onClick={onClose}>
      <div className="panorama-modal" onClick={(e) => e.stopPropagation()}>
        <div className="panorama-header">
          <h2>360° Tour - House {houseNumber}{usingDemo ? ' (Demo)' : ''}</h2>
          <button className="panorama-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="panorama-container" ref={containerRef}>
          {loading && (
            <div className="panorama-loading">
              <div className="panorama-spinner"></div>
              <p>Loading 360° panorama...</p>
            </div>
          )}
          {error && (
            <div className="panorama-error">
              <p>{error}</p>
              <button onClick={onClose}>Close</button>
            </div>
          )}
        </div>

        <div className="panorama-instructions">
          <p>Drag to look around • Scroll to zoom • Press ESC to close</p>
        </div>
      </div>
    </div>
  );
};

export default PanoramaViewer;
