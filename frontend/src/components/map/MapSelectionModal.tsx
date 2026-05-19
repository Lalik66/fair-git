import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MapPanel from './MapPanel';
import { applicationApi, AvailableHouse } from '../../services/api';
import {
  MapObject,
  DEFAULT_MAP_CENTER,
  getColorForType,
  getEmojiForType,
} from '../../types/map';
import './MapSelectionModal.css';

interface MapSelectionModalProps {
  onClose: () => void;
  onSelect: (houseNumber: string) => void;
}

// Large overlay that reuses the existing MapPanel (selection mode) so the
// applicant can pick a free vendor house without leaving the form.
const MapSelectionModal: React.FC<MapSelectionModalProps> = ({ onClose, onSelect }) => {
  const { t } = useTranslation();
  const [houses, setHouses] = useState<AvailableHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await applicationApi.getAvailableHouses();
        if (!cancelled) setHouses(res.houses);
      } catch (err) {
        console.error('Failed to load available houses:', err);
        if (!cancelled) setError(t('vendor.error.houseNotFound', 'Could not load houses'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const objects: MapObject[] = useMemo(
    () =>
      houses.map((h) => ({
        id: h.id,
        type: 'vendor_house',
        label: h.houseNumber,
        description: h.description,
        latitude: h.latitude,
        longitude: h.longitude,
        color: getColorForType('vendor_house'),
        emoji: getEmojiForType('vendor_house'),
        // Drives marker color (green free / red occupied) and the Seç button.
        isAvailable: h.availability === 'free',
        houseNumber: h.houseNumber,
        areaSqm: h.areaSqm,
        price: h.price,
        panorama360Url: h.panorama360Url,
        visitorStory: h.visitorStory,
        vendor: null,
      })),
    [houses]
  );

  const mapCenter: [number, number] = useMemo(() => {
    const first = houses[0];
    return first ? [first.longitude, first.latitude] : DEFAULT_MAP_CENTER;
  }, [houses]);

  const handleObjectDirections = (lat: number, lng: number) => {
    // Reuse the previous-feature intent (scout the walk before deciding)
    // without re-implementing the in-app routing engine inside a modal.
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
      '_blank',
      'noopener'
    );
  };

  return (
    <div className="map-select-overlay" role="dialog" aria-modal="true">
      <div className="map-select-dialog">
        <div className="map-select-header">
          <h2>{t('vendor.form.chooseFromMap', 'Choose from map')}</h2>
          <button
            type="button"
            className="map-select-close"
            onClick={onClose}
            aria-label={t('common.cancel', 'Cancel')}
          >
            &times;
          </button>
        </div>
        <div className="map-select-body">
          {loading && (
            <div className="map-select-status">{t('common.loading', 'Loading...')}</div>
          )}
          {error && <div className="map-select-status error">{error}</div>}
          {!loading && !error && (
            <MapPanel
              objects={objects}
              selectedObjectId={selectedId}
              onObjectSelect={setSelectedId}
              mapCenter={mapCenter}
              isPrivileged
              selectionMode
              onHouseSelect={(_houseId, houseNumber) => {
                onSelect(houseNumber);
                onClose();
              }}
              onObjectDirections={handleObjectDirections}
            />
          )}
        </div>
        <div className="map-select-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapSelectionModal;
