import React from 'react';
import { useTranslation } from 'react-i18next';
import type { RouteStep } from '../../types/route';
import './RouteInstructionsPanel.css';

interface RouteInstructionsPanelProps {
  friendName: string;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  steps: RouteStep[];
  onClearRoute: () => void;
  formatDistance: (meters: number) => string;
  formatDuration: (seconds: number) => string;
  isMobile?: boolean;
  friendLocationUpdatedAt?: string; // For staleness tracking
}

// Maneuver icon mapping
const getManeuverIcon = (type: string, modifier?: string): string => {
  if (type === 'arrive') return '🎯';
  if (type === 'depart') return '⬆️';
  if (type === 'turn') {
    if (modifier === 'left') return '⬅️';
    if (modifier === 'right') return '➡️';
    if (modifier === 'slight left') return '↖️';
    if (modifier === 'slight right') return '↗️';
    if (modifier === 'sharp left') return '↰';
    if (modifier === 'sharp right') return '↱';
  }
  if (type === 'continue') return '⬆️';
  if (type === 'roundabout') return '🔄';
  if (type === 'end of road') return '⬆️';
  return '➡️'; // default
};

const RouteInstructionsPanel: React.FC<RouteInstructionsPanelProps> = ({
  friendName,
  totalDistance,
  totalDuration,
  steps,
  onClearRoute,
  formatDistance,
  formatDuration,
  isMobile = false,
  friendLocationUpdatedAt
}) => {
  const { t } = useTranslation();

  // Check if friend location is stale (more than 30 minutes old)
  const getStaleWarning = () => {
    if (!friendLocationUpdatedAt) return null;

    const updatedAt = new Date(friendLocationUpdatedAt);
    const now = new Date();
    const minutesAgo = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60));

    if (minutesAgo > 30) {
      return (
        <div className="route-stale-warning" role="alert">
          <span aria-hidden="true">Warning</span>
          <span>{t('route.staleWarning', { minutes: minutesAgo })}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`route-instructions-panel ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* Header/Summary Section */}
      <div className="route-instructions-header">
        <h3 className="route-friend-name">
          <span>🚶</span>
          <span>{t('route.directionsTo', { name: friendName })}</span>
        </h3>
        <div className="route-summary">
          <div className="route-metric">
            <span className="route-metric-icon">📏</span>
            <span>{formatDistance(totalDistance)}</span>
          </div>
          <div className="route-metric">
            <span className="route-metric-icon">⏱️</span>
            <span>{formatDuration(totalDuration)} {t('route.walk')}</span>
          </div>
        </div>
      </div>

      {/* Staleness Warning */}
      {getStaleWarning()}

      {/* Steps List */}
      <ol className="route-instructions-steps" role="list" aria-label="Walking directions">
        {steps.map((step, index) => (
          <li key={index} className="route-step" role="listitem">
            <div
              className="route-maneuver-icon"
              role="img"
              aria-label={`${step.maneuver.type}${step.maneuver.modifier ? ` ${step.maneuver.modifier}` : ''}`}
            >
              {getManeuverIcon(step.maneuver.type, step.maneuver.modifier)}
            </div>
            <div className="route-step-content">
              <p className="route-step-instruction">{step.instruction}</p>
              <span className="route-step-distance">{formatDistance(step.distance)}</span>
            </div>
          </li>
        ))}
      </ol>

      {/* Clear Route Button */}
      <div className="route-clear-section">
        <button
          className="btn-clear-route"
          onClick={onClearRoute}
          aria-label={t('route.clearRoute')}
        >
          ✕ {t('route.clearRoute')}
        </button>
      </div>
    </div>
  );
};

export default RouteInstructionsPanel;
