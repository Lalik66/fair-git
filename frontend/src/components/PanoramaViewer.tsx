import React, { useEffect, useRef, useState } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';
import './PanoramaViewer.css';

interface PanoramaViewerProps {
  panoramaUrl: string;
  onClose: () => void;
  houseNumber: string;
}

const PanoramaViewer: React.FC<PanoramaViewerProps> = ({ panoramaUrl, onClose, houseNumber }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize the Photo Sphere Viewer
    try {
      viewerRef.current = new Viewer({
        container: containerRef.current,
        panorama: panoramaUrl,
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
        setLoading(false);
      });

      // Handle error event
      viewerRef.current.addEventListener('load-error', (e: any) => {
        console.error('Panorama load error:', e);
        setError('Failed to load 360° panorama. The image may not be available.');
        setLoading(false);
      });
    } catch (err) {
      console.error('Error initializing viewer:', err);
      setError('Failed to initialize 360° viewer.');
      setLoading(false);
    }

    // Cleanup on unmount
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [panoramaUrl]);

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
          <h2>360° Tour - House {houseNumber}</h2>
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
