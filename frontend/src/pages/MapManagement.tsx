import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { adminApi } from '../services/api';
import './MapManagement.css';

// Set Mapbox access token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
mapboxgl.accessToken = (import.meta as any).env.VITE_MAPBOX_TOKEN || '';

interface VendorHouse {
  id: string;
  houseNumber: string;
  areaSqm: number | null;
  price: number | null;
  description: string | null;
  panorama360Url: string | null;
  isEnabled: boolean;
  latitude?: number;
  longitude?: number;
}

interface Facility {
  id: string;
  name: string;
  type: string;
  description: string | null;
  latitude: number;
  longitude: number;
  photoUrl: string | null;
  icon: string | null;
  color: string | null;
}

const FACILITY_TYPES = [
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️', color: '#F59E0B' },
  { value: 'cafe', label: 'Cafe', icon: '☕', color: '#8B5CF6' },
  { value: 'kids_zone', label: 'Kids Zone', icon: '🎠', color: '#EC4899' },
  { value: 'restroom', label: 'Restroom', icon: '🚻', color: '#6366F1' },
  { value: 'taxi', label: 'Taxi', icon: '🚕', color: '#FBBF24' },
  { value: 'bus_stop', label: 'Bus Stop', icon: '🚌', color: '#3B82F6' },
  { value: 'parking', label: 'Parking', icon: '🅿️', color: '#6B7280' },
  { value: 'info', label: 'Info Point', icon: 'ℹ️', color: '#10B981' },
  { value: 'first_aid', label: 'First Aid', icon: '🏥', color: '#EF4444' },
  { value: 'atm', label: 'ATM', icon: '🏧', color: '#059669' },
];

interface CreateHouseFormData {
  houseNumber: string;
  areaSqm: string;
  price: string;
  description: string;
  latitude: string;
  longitude: string;
}

interface EditFormData {
  houseNumber: string;
  areaSqm: string;
  price: string;
  description: string;
  isEnabled: boolean;
}

interface FacilityFormData {
  name: string;
  type: string;
  description: string;
  latitude: string;
  longitude: string;
}

const MapManagement: React.FC = () => {
  const { t } = useTranslation();
  const [houses, setHouses] = useState<VendorHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingHouse, setEditingHouse] = useState<VendorHouse | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    houseNumber: '',
    areaSqm: '',
    price: '',
    description: '',
    isEnabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deletingHouse, setDeletingHouse] = useState<VendorHouse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPanoramaId, setUploadingPanoramaId] = useState<string | null>(null);
  const panoramaInputRef = React.useRef<HTMLInputElement>(null);

  // Facility state
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [facilityFormData, setFacilityFormData] = useState<FacilityFormData>({
    name: '',
    type: 'restaurant',
    description: '',
    latitude: '40.37094989291927',
    longitude: '49.83690275228737',
  });
  const [savingFacility, setSavingFacility] = useState(false);
  const [facilityFormErrors, setFacilityFormErrors] = useState<Record<string, string>>({});
  const [deletingFacility, setDeletingFacility] = useState<Facility | null>(null);
  const [deletingFacilityInProgress, setDeletingFacilityInProgress] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [editFacilityFormData, setEditFacilityFormData] = useState<FacilityFormData>({
    name: '',
    type: 'restaurant',
    description: '',
    latitude: '',
    longitude: '',
  });
  const [editFacilityFormErrors, setEditFacilityFormErrors] = useState<Record<string, string>>({});
  const [savingEditFacility, setSavingEditFacility] = useState(false);

  // Add house state
  const [showCreateHouseForm, setShowCreateHouseForm] = useState(false);
  const [createHouseFormData, setCreateHouseFormData] = useState<CreateHouseFormData>({
    houseNumber: '',
    areaSqm: '',
    price: '',
    description: '',
    latitude: '40.4093',
    longitude: '49.8671',
  });
  const [createHouseFormErrors, setCreateHouseFormErrors] = useState<Record<string, string>>({});
  const [creatingHouse, setCreatingHouse] = useState(false);
  const [addHouseMode, setAddHouseMode] = useState(false);

  // Map state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const tempMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [addFacilityMode, setAddFacilityMode] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const fetchHouses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getVendorHouses();
      setHouses(data.houses || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('mapManagement.error.loadHouses');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFacilities = useCallback(async () => {
    try {
      const data = await adminApi.getFacilities();
      setFacilities(data.facilities || []);
    } catch (err: unknown) {
      console.error('Failed to load facilities:', err);
    }
  }, []);

  useEffect(() => {
    fetchHouses();
    fetchFacilities();
  }, [fetchHouses, fetchFacilities]);

  // Initialize map (re-run when loading changes since the container isn't rendered while loading)
  useEffect(() => {
    if (loading) return;
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [49.83690275228737, 40.37094989291927], // Baku, Azerbaijan
      zoom: 18,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Ensure zoom is applied after the map style loads and container has dimensions
    map.once('load', () => {
      map.setZoom(18);
      map.resize();
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      // Cleanup markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [loading]);

  // Update facility markers on map
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add facility markers
    facilities.forEach(facility => {
      const typeInfo = FACILITY_TYPES.find(ft => ft.value === facility.type);
      const color = typeInfo?.color || '#6B7280';
      const icon = typeInfo?.icon || '📍';

      const el = document.createElement('div');
      el.className = 'map-facility-marker';
      el.style.cssText = `
        width: 36px;
        height: 36px;
        background-color: ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
      `;
      el.textContent = icon;
      el.title = `${facility.name} (${typeInfo?.label || facility.type})`;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([facility.longitude, facility.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 4px;">
              <strong>${icon} ${facility.name}</strong><br/>
              <span style="color: #6b7280; font-size: 0.85em;">${typeInfo?.label || facility.type}</span>
              ${facility.description ? `<br/><span style="font-size: 0.85em;">${facility.description}</span>` : ''}
            </div>
          `)
        )
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    // Add vendor house markers
    houses.forEach(house => {
      if (house.latitude && house.longitude) {
        const el = document.createElement('div');
        el.className = 'map-house-marker';
        el.style.cssText = `
          width: 32px;
          height: 32px;
          background-color: #3B82F6;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: white;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        `;
        el.textContent = '🏠';
        el.title = `House ${house.houseNumber}`;

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([house.longitude, house.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div style="padding: 4px;">
                <strong>🏠 ${house.houseNumber}</strong>
                ${house.description ? `<br/><span style="font-size: 0.85em;">${house.description}</span>` : ''}
              </div>
            `)
          )
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      }
    });
  }, [facilities, houses, mapLoaded]);

  // Handle map click for facility or house placement
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (!addFacilityMode && !addHouseMode) return;

      const { lng, lat } = e.lngLat;

      // Remove previous temp marker
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }

      // Create temp marker at click location
      const el = document.createElement('div');
      el.className = 'map-temp-marker';
      el.style.cssText = `
        width: 40px;
        height: 40px;
        background-color: ${addHouseMode ? '#3B82F6' : '#EF4444'};
        border-radius: ${addHouseMode ? '8px' : '50%'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        border: 3px solid white;
        box-shadow: 0 2px 8px ${addHouseMode ? 'rgba(59,130,246,0.5)' : 'rgba(239,68,68,0.5)'};
        cursor: pointer;
        animation: pulse-marker 1.5s infinite;
      `;
      el.textContent = addHouseMode ? '🏠' : '📍';

      const tempMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      tempMarkerRef.current = tempMarker;

      if (addHouseMode) {
        // Pre-fill lat/lng in house form and show the form
        setCreateHouseFormData(prev => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }));
        setShowCreateHouseForm(true);
        setCreateHouseFormErrors({});
      } else {
        // Pre-fill lat/lng in facility form and show the form
        setFacilityFormData(prev => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }));
        setShowFacilityForm(true);
        setFacilityFormErrors({});
      }
    };

    map.on('click', handleMapClick);

    // Update cursor when in add mode
    if (addFacilityMode || addHouseMode) {
      map.getCanvas().style.cursor = 'crosshair';
    } else {
      map.getCanvas().style.cursor = '';
    }

    return () => {
      map.off('click', handleMapClick);
      try {
        const canvas = map.getCanvas();
        if (canvas) canvas.style.cursor = '';
      } catch {
        // Map may have been removed already
      }
    };
  }, [addFacilityMode, addHouseMode, mapLoaded]);

  const handleEdit = (house: VendorHouse) => {
    setEditingHouse(house);
    setEditFormData({
      houseNumber: house.houseNumber,
      areaSqm: house.areaSqm !== null ? String(house.areaSqm) : '',
      price: house.price !== null ? String(house.price) : '',
      description: house.description || '',
      isEnabled: house.isEnabled,
    });
    setFormErrors({});
    setSuccessMessage('');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingHouse(null);
    setEditFormData({
      houseNumber: '',
      areaSqm: '',
      price: '',
      description: '',
      isEnabled: true,
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editFormData.houseNumber.trim()) {
      errors.houseNumber = t('mapManagement.houseNumberRequired');
    }

    if (editFormData.areaSqm && isNaN(parseFloat(editFormData.areaSqm))) {
      errors.areaSqm = t('mapManagement.areaRequired');
    }

    if (editFormData.areaSqm && parseFloat(editFormData.areaSqm) < 0) {
      errors.areaSqm = t('mapManagement.areaNonNegative');
    }

    if (editFormData.price && isNaN(parseFloat(editFormData.price))) {
      errors.price = t('mapManagement.priceRequired');
    }

    if (editFormData.price && parseFloat(editFormData.price) < 0) {
      errors.price = t('mapManagement.priceNonNegative');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!editingHouse || !validateForm()) return;

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const updateData: {
        houseNumber?: string;
        areaSqm?: number | null;
        price?: number | null;
        description?: string | null;
        isEnabled?: boolean;
      } = {};

      // Only send changed fields
      if (editFormData.houseNumber !== editingHouse.houseNumber) {
        updateData.houseNumber = editFormData.houseNumber.trim();
      }

      const newAreaSqm = editFormData.areaSqm ? parseFloat(editFormData.areaSqm) : null;
      if (newAreaSqm !== editingHouse.areaSqm) {
        updateData.areaSqm = newAreaSqm;
      }

      const newPrice = editFormData.price ? parseFloat(editFormData.price) : null;
      if (newPrice !== editingHouse.price) {
        updateData.price = newPrice;
      }

      const newDescription = editFormData.description.trim() || null;
      if (newDescription !== editingHouse.description) {
        updateData.description = newDescription;
      }

      if (editFormData.isEnabled !== editingHouse.isEnabled) {
        updateData.isEnabled = editFormData.isEnabled;
      }

      // Check if anything changed
      if (Object.keys(updateData).length === 0) {
        setSuccessMessage(t('mapManagement.noChangesToSave'));
        setEditingHouse(null);
        return;
      }

      const result = await adminApi.updateVendorHouse(editingHouse.id, updateData);

      // Update local state
      setHouses((prev) =>
        prev.map((h) =>
          h.id === editingHouse.id
            ? { ...h, ...result.vendorHouse }
            : h
        )
      );

      setSuccessMessage(t('mapManagement.success.houseUpdated', { number: result.vendorHouse.houseNumber }));
      setEditingHouse(null);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || t('mapManagement.error.updateHouse'));
      } else {
        setError(t('mapManagement.error.updateHouse'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (field: keyof EditFormData, value: string | boolean) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleDeleteClick = (house: VendorHouse) => {
    setDeletingHouse(house);
    setSuccessMessage('');
    setError('');
  };

  const handleCancelDelete = () => {
    setDeletingHouse(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingHouse) return;

    try {
      setDeleting(true);
      setError('');
      setSuccessMessage('');

      const result = await adminApi.deleteVendorHouse(deletingHouse.id);

      // Remove from local state
      setHouses((prev) => prev.filter((h) => h.id !== deletingHouse.id));
      setSuccessMessage(result.message || t('mapManagement.success.houseDeleted', { number: deletingHouse.houseNumber }));
      setDeletingHouse(null);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || t('mapManagement.error.deleteHouse'));
      } else {
        setError(t('mapManagement.error.deleteHouse'));
      }
      setDeletingHouse(null);
    } finally {
      setDeleting(false);
    }
  };

  // Facility handlers
  const handleFacilityFormChange = (field: keyof FacilityFormData, value: string) => {
    setFacilityFormData((prev) => ({ ...prev, [field]: value }));
    if (facilityFormErrors[field]) {
      setFacilityFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateFacilityForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!facilityFormData.name.trim()) errors.name = t('mapManagement.facilityNameRequired');
    if (!facilityFormData.type) errors.type = t('mapManagement.facilityTypeRequired');
    if (!facilityFormData.latitude || isNaN(parseFloat(facilityFormData.latitude))) {
      errors.latitude = t('mapManagement.latitudeRequired');
    }
    if (!facilityFormData.longitude || isNaN(parseFloat(facilityFormData.longitude))) {
      errors.longitude = t('mapManagement.longitudeRequired');
    }
    setFacilityFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateFacility = async () => {
    if (!validateFacilityForm()) return;

    try {
      setSavingFacility(true);
      setError('');
      setSuccessMessage('');

      const typeInfo = FACILITY_TYPES.find((ft) => ft.value === facilityFormData.type);

      const result = await adminApi.createFacility({
        name: facilityFormData.name.trim(),
        type: facilityFormData.type,
        description: facilityFormData.description.trim() || undefined,
        latitude: parseFloat(facilityFormData.latitude),
        longitude: parseFloat(facilityFormData.longitude),
        icon: typeInfo?.icon,
        color: typeInfo?.color,
      });

      setFacilities((prev) => [...prev, result.facility].sort((a, b) => a.name.localeCompare(b.name)));
      setSuccessMessage(result.message || t('mapManagement.success.facilityCreated'));
      setShowFacilityForm(false);
      setAddFacilityMode(false);

      // Remove temp marker
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }

      setFacilityFormData({
        name: '',
        type: 'restaurant',
        description: '',
        latitude: '40.4093',
        longitude: '49.8671',
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || t('mapManagement.error.createFacility'));
      } else {
        setError(t('mapManagement.error.createFacility'));
      }
    } finally {
      setSavingFacility(false);
    }
  };

  const handleDeleteFacility = async () => {
    if (!deletingFacility) return;
    try {
      setDeletingFacilityInProgress(true);
      setError('');
      setSuccessMessage('');
      const result = await adminApi.deleteFacility(deletingFacility.id);
      setFacilities((prev) => prev.filter((f) => f.id !== deletingFacility.id));
      setSuccessMessage(result.message || t('mapManagement.success.facilityDeleted'));
      setDeletingFacility(null);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || t('mapManagement.error.deleteFacility'));
      } else {
        setError(t('mapManagement.error.deleteFacility'));
      }
      setDeletingFacility(null);
    } finally {
      setDeletingFacilityInProgress(false);
    }
  };

  // Edit facility handlers
  const handleEditFacility = (facility: Facility) => {
    setEditingFacility(facility);
    setEditFacilityFormData({
      name: facility.name,
      type: facility.type,
      description: facility.description || '',
      latitude: String(facility.latitude),
      longitude: String(facility.longitude),
    });
    setEditFacilityFormErrors({});
    setSuccessMessage('');
    setError('');
  };

  const handleCancelEditFacility = () => {
    setEditingFacility(null);
    setEditFacilityFormData({
      name: '',
      type: 'restaurant',
      description: '',
      latitude: '',
      longitude: '',
    });
    setEditFacilityFormErrors({});
  };

  const handleEditFacilityFormChange = (field: keyof FacilityFormData, value: string) => {
    setEditFacilityFormData((prev) => ({ ...prev, [field]: value }));
    if (editFacilityFormErrors[field]) {
      setEditFacilityFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateEditFacilityForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!editFacilityFormData.name.trim()) errors.name = t('mapManagement.facilityNameRequired');
    if (!editFacilityFormData.type) errors.type = t('mapManagement.facilityTypeRequired');
    if (!editFacilityFormData.latitude || isNaN(parseFloat(editFacilityFormData.latitude))) {
      errors.latitude = t('mapManagement.latitudeRequired');
    }
    if (!editFacilityFormData.longitude || isNaN(parseFloat(editFacilityFormData.longitude))) {
      errors.longitude = t('mapManagement.longitudeRequired');
    }
    setEditFacilityFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEditFacility = async () => {
    if (!editingFacility || !validateEditFacilityForm()) return;

    try {
      setSavingEditFacility(true);
      setError('');
      setSuccessMessage('');

      const typeInfo = FACILITY_TYPES.find((ft) => ft.value === editFacilityFormData.type);

      const result = await adminApi.updateFacility(editingFacility.id, {
        name: editFacilityFormData.name.trim(),
        type: editFacilityFormData.type,
        description: editFacilityFormData.description.trim() || undefined,
        latitude: parseFloat(editFacilityFormData.latitude),
        longitude: parseFloat(editFacilityFormData.longitude),
        icon: typeInfo?.icon,
        color: typeInfo?.color,
      });

      // Update local state
      setFacilities((prev) =>
        prev
          .map((f) => (f.id === editingFacility.id ? result.facility : f))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setSuccessMessage(result.message || t('mapManagement.success.facilityUpdated'));
      setEditingFacility(null);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || t('mapManagement.error.updateFacility'));
      } else {
        setError(t('mapManagement.error.updateFacility'));
      }
    } finally {
      setSavingEditFacility(false);
    }
  };

  const handleCancelFacilityForm = () => {
    setShowFacilityForm(false);
    // Remove temp marker
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }
    setFacilityFormData({
      name: '',
      type: 'restaurant',
      description: '',
      latitude: '40.4093',
      longitude: '49.8671',
    });
    setFacilityFormErrors({});
  };

  const toggleAddFacilityMode = () => {
    if (addFacilityMode) {
      // Exiting mode
      setAddFacilityMode(false);
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
    } else {
      // Entering mode
      setAddFacilityMode(true);
      setAddHouseMode(false); // Disable house mode if active
      setShowFacilityForm(false);
      setSuccessMessage('');
      setError('');
    }
  };

  // Add House handlers
  const toggleAddHouseMode = () => {
    if (addHouseMode) {
      setAddHouseMode(false);
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
    } else {
      setAddHouseMode(true);
      setAddFacilityMode(false); // Disable facility mode if active
      setShowCreateHouseForm(false);
      setSuccessMessage('');
      setError('');
    }
  };

  const handleCreateHouseFormChange = (field: keyof CreateHouseFormData, value: string) => {
    setCreateHouseFormData(prev => ({ ...prev, [field]: value }));
    if (createHouseFormErrors[field]) {
      setCreateHouseFormErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateCreateHouseForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!createHouseFormData.houseNumber.trim()) errors.houseNumber = t('mapManagement.houseNumberRequired');
    if (!createHouseFormData.latitude || isNaN(parseFloat(createHouseFormData.latitude))) {
      errors.latitude = t('mapManagement.latitudeRequired');
    }
    if (!createHouseFormData.longitude || isNaN(parseFloat(createHouseFormData.longitude))) {
      errors.longitude = t('mapManagement.longitudeRequired');
    }
    if (createHouseFormData.areaSqm && (isNaN(parseFloat(createHouseFormData.areaSqm)) || parseFloat(createHouseFormData.areaSqm) < 0)) {
      errors.areaSqm = t('mapManagement.areaValidNonNegative');
    }
    if (createHouseFormData.price && (isNaN(parseFloat(createHouseFormData.price)) || parseFloat(createHouseFormData.price) < 0)) {
      errors.price = t('mapManagement.priceValidNonNegative');
    }
    setCreateHouseFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateHouse = async () => {
    if (!validateCreateHouseForm()) return;

    try {
      setCreatingHouse(true);
      setError('');
      setSuccessMessage('');

      const result = await adminApi.createVendorHouse({
        houseNumber: createHouseFormData.houseNumber.trim(),
        areaSqm: createHouseFormData.areaSqm ? parseFloat(createHouseFormData.areaSqm) : null,
        price: createHouseFormData.price ? parseFloat(createHouseFormData.price) : null,
        description: createHouseFormData.description.trim() || null,
        latitude: parseFloat(createHouseFormData.latitude),
        longitude: parseFloat(createHouseFormData.longitude),
      });

      setHouses(prev => [...prev, result.vendorHouse].sort((a, b) => a.houseNumber.localeCompare(b.houseNumber)));
      setSuccessMessage(result.message || t('mapManagement.success.houseCreated'));
      setShowCreateHouseForm(false);
      setAddHouseMode(false);

      // Remove temp marker
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }

      setCreateHouseFormData({
        houseNumber: '',
        areaSqm: '',
        price: '',
        description: '',
        latitude: '40.4093',
        longitude: '49.8671',
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || t('mapManagement.error.createHouse'));
      } else {
        setError(t('mapManagement.error.createHouse'));
      }
    } finally {
      setCreatingHouse(false);
    }
  };

  const handleCancelCreateHouseForm = () => {
    setShowCreateHouseForm(false);
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }
    setCreateHouseFormData({
      houseNumber: '',
      areaSqm: '',
      price: '',
      description: '',
      latitude: '40.4093',
      longitude: '49.8671',
    });
    setCreateHouseFormErrors({});
  };

  const handlePanoramaUploadClick = (houseId: string) => {
    setUploadingPanoramaId(houseId);
    setSuccessMessage('');
    setError('');
    // Trigger hidden file input
    if (panoramaInputRef.current) {
      panoramaInputRef.current.value = '';
      panoramaInputRef.current.click();
    }
  };

  const handlePanoramaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingPanoramaId) {
      setUploadingPanoramaId(null);
      return;
    }

    try {
      setError('');
      setSuccessMessage('');

      const result = await adminApi.uploadVendorHousePanorama(uploadingPanoramaId, file);

      // Update local state
      setHouses((prev) =>
        prev.map((h) =>
          h.id === uploadingPanoramaId
            ? { ...h, panorama360Url: result.vendorHouse.panorama360Url }
            : h
        )
      );

      setSuccessMessage(result.message || t('mapManagement.success.panoramaUploaded'));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || t('mapManagement.error.uploadPanorama'));
      } else {
        setError(t('mapManagement.error.uploadPanorama'));
      }
    } finally {
      setUploadingPanoramaId(null);
    }
  };

  if (loading) {
    return (
      <div className="map-management-container">
        <div className="loading-spinner">{t('mapManagement.loadingHouses')}</div>
      </div>
    );
  }

  return (
    <div className="map-management-container">
      {/* Hidden file input for panorama upload */}
      <input
        ref={panoramaInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handlePanoramaFileChange}
      />

      <div className="map-mgmt-header">
        <h2>{t('admin.mapManagement', { defaultValue: 'Map Management' })}</h2>
        <p className="map-mgmt-subtitle">
          {t('mapManagement.subtitle')}
        </p>
      </div>

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* ======================== */}
      {/* Interactive Map Section */}
      {/* ======================== */}
      <div className="map-section">
        <div className="map-section-header">
          <h3>{t('mapManagement.interactiveMap')}</h3>
          <div className="map-section-actions">
            <button
              className={`btn ${addHouseMode ? 'btn-active-mode' : 'btn-secondary'}`}
              onClick={toggleAddHouseMode}
              data-testid="add-house-mode-btn"
            >
              {addHouseMode ? t('mapManagement.cancelPlacement') : t('mapManagement.addHouse')}
            </button>
            <button
              className={`btn ${addFacilityMode ? 'btn-active-mode' : 'btn-primary'}`}
              onClick={toggleAddFacilityMode}
              data-testid="add-facility-mode-btn"
            >
              {addFacilityMode ? t('mapManagement.cancelPlacement') : t('mapManagement.addFacility')}
            </button>
          </div>
        </div>
        {addHouseMode && (
          <div className="map-instruction-banner" style={{ borderLeftColor: '#3B82F6' }}>
            <span className="instruction-icon">👆</span>
            <span>{t('mapManagement.clickToPlaceHouse')}</span>
          </div>
        )}
        {addFacilityMode && (
          <div className="map-instruction-banner">
            <span className="instruction-icon">👆</span>
            <span>{t('mapManagement.clickToPlaceFacility')}</span>
          </div>
        )}
        <div
          ref={mapContainerRef}
          className={`map-container ${addFacilityMode || addHouseMode ? 'map-placement-mode' : ''}`}
          style={{ height: '450px', borderRadius: '8px', overflow: 'hidden' }}
        />
        <div className="map-legend">
          <span className="legend-item">
            <span className="legend-icon" style={{ backgroundColor: '#3B82F6', borderRadius: '4px' }}>🏠</span>
            {t('mapManagement.vendorHouses')}
          </span>
          {FACILITY_TYPES.slice(0, 5).map(ft => (
            <span key={ft.value} className="legend-item">
              <span className="legend-icon" style={{ backgroundColor: ft.color }}>{ft.icon}</span>
              {t(`facilities.${ft.value}`)}
            </span>
          ))}
          <span className="legend-item legend-more">{t('mapManagement.more')}</span>
        </div>
      </div>

      {/* Edit Modal */}
      {editingHouse && (
        <div className="edit-modal-overlay" onClick={handleCancelEdit}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>{t('mapManagement.editHouse', { number: editingHouse.houseNumber })}</h3>
              <button
                className="btn-close"
                onClick={handleCancelEdit}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="edit-modal-body">
              <div className={`form-group ${formErrors.houseNumber ? 'has-error' : ''}`}>
                <label htmlFor="houseNumber">{t('mapManagement.houseNumberLabel')}</label>
                <input
                  id="houseNumber"
                  type="text"
                  value={editFormData.houseNumber}
                  onChange={(e) => handleFormChange('houseNumber', e.target.value)}
                  className={formErrors.houseNumber ? 'input-error' : ''}
                  placeholder="e.g. H-01"
                />
                {formErrors.houseNumber && (
                  <span className="field-error">{formErrors.houseNumber}</span>
                )}
              </div>

              <div className={`form-group ${formErrors.areaSqm ? 'has-error' : ''}`}>
                <label htmlFor="areaSqm">{t('mapManagement.areaLabel')}</label>
                <input
                  id="areaSqm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={editFormData.areaSqm}
                  onChange={(e) => handleFormChange('areaSqm', e.target.value)}
                  className={formErrors.areaSqm ? 'input-error' : ''}
                  placeholder="e.g. 130"
                />
                {formErrors.areaSqm && (
                  <span className="field-error">{formErrors.areaSqm}</span>
                )}
              </div>

              <div className={`form-group ${formErrors.price ? 'has-error' : ''}`}>
                <label htmlFor="price">{t('mapManagement.priceLabel')}</label>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.price}
                  onChange={(e) => handleFormChange('price', e.target.value)}
                  className={formErrors.price ? 'input-error' : ''}
                  placeholder="e.g. 500"
                />
                {formErrors.price && (
                  <span className="field-error">{formErrors.price}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="description">{t('mapManagement.description')}</label>
                <textarea
                  id="description"
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder={t('mapManagement.descriptionPlaceholder')}
                />
              </div>

              <div className="form-group form-group-checkbox">
                <label htmlFor="isEnabled" className="checkbox-label">
                  <input
                    id="isEnabled"
                    type="checkbox"
                    checked={editFormData.isEnabled}
                    onChange={(e) => handleFormChange('isEnabled', e.target.checked)}
                  />
                  <span>{t('mapManagement.enabledOnMap')}</span>
                </label>
              </div>
            </div>

            <div className="edit-modal-footer">
              <button
                className="btn btn-secondary"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t('common.loading') : t('mapManagement.saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingHouse && (
        <div className="edit-modal-overlay" onClick={handleCancelDelete}>
          <div className="edit-modal delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>{t('mapManagement.deleteHouse')}</h3>
              <button
                className="btn-close"
                onClick={handleCancelDelete}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="edit-modal-body">
              <p className="delete-warning">
                {t('mapManagement.deleteHouseConfirm', { number: deletingHouse.houseNumber })}
              </p>
              <p className="delete-note">
                {t('mapManagement.deleteHouseNote')}
              </p>
            </div>
            <div className="edit-modal-footer">
              <button
                className="btn btn-secondary"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? t('common.loading') : t('mapManagement.deleteHouseBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create House Modal */}
      {showCreateHouseForm && (
        <div className="edit-modal-overlay" onClick={handleCancelCreateHouseForm}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>{t('mapManagement.addNewHouse')}</h3>
              <button
                className="btn-close"
                onClick={handleCancelCreateHouseForm}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="edit-modal-body">
              <div className={`form-group ${createHouseFormErrors.houseNumber ? 'has-error' : ''}`}>
                <label htmlFor="newHouseNumber">{t('mapManagement.houseNumberLabel')}</label>
                <input
                  id="newHouseNumber"
                  type="text"
                  value={createHouseFormData.houseNumber}
                  onChange={(e) => handleCreateHouseFormChange('houseNumber', e.target.value)}
                  className={createHouseFormErrors.houseNumber ? 'input-error' : ''}
                  placeholder="e.g. H-201"
                />
                {createHouseFormErrors.houseNumber && (
                  <span className="field-error">{createHouseFormErrors.houseNumber}</span>
                )}
              </div>

              <div className={`form-group ${createHouseFormErrors.areaSqm ? 'has-error' : ''}`}>
                <label htmlFor="newHouseArea">{t('mapManagement.areaLabel')}</label>
                <input
                  id="newHouseArea"
                  type="number"
                  step="0.1"
                  min="0"
                  value={createHouseFormData.areaSqm}
                  onChange={(e) => handleCreateHouseFormChange('areaSqm', e.target.value)}
                  className={createHouseFormErrors.areaSqm ? 'input-error' : ''}
                  placeholder="e.g. 45"
                />
                {createHouseFormErrors.areaSqm && (
                  <span className="field-error">{createHouseFormErrors.areaSqm}</span>
                )}
              </div>

              <div className={`form-group ${createHouseFormErrors.price ? 'has-error' : ''}`}>
                <label htmlFor="newHousePrice">{t('mapManagement.priceLabel')}</label>
                <input
                  id="newHousePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={createHouseFormData.price}
                  onChange={(e) => handleCreateHouseFormChange('price', e.target.value)}
                  className={createHouseFormErrors.price ? 'input-error' : ''}
                  placeholder="e.g. 500"
                />
                {createHouseFormErrors.price && (
                  <span className="field-error">{createHouseFormErrors.price}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="newHouseDescription">{t('mapManagement.description')}</label>
                <textarea
                  id="newHouseDescription"
                  rows={2}
                  value={createHouseFormData.description}
                  onChange={(e) => handleCreateHouseFormChange('description', e.target.value)}
                  placeholder={t('mapManagement.descriptionPlaceholder')}
                />
              </div>

              <div className="form-row">
                <div className={`form-group ${createHouseFormErrors.latitude ? 'has-error' : ''}`}>
                  <label htmlFor="newHouseLatitude">Latitude *</label>
                  <input
                    id="newHouseLatitude"
                    type="number"
                    step="0.0001"
                    value={createHouseFormData.latitude}
                    onChange={(e) => handleCreateHouseFormChange('latitude', e.target.value)}
                    className={createHouseFormErrors.latitude ? 'input-error' : ''}
                    placeholder="40.4093"
                  />
                  {createHouseFormErrors.latitude && (
                    <span className="field-error">{createHouseFormErrors.latitude}</span>
                  )}
                </div>
                <div className={`form-group ${createHouseFormErrors.longitude ? 'has-error' : ''}`}>
                  <label htmlFor="newHouseLongitude">Longitude *</label>
                  <input
                    id="newHouseLongitude"
                    type="number"
                    step="0.0001"
                    value={createHouseFormData.longitude}
                    onChange={(e) => handleCreateHouseFormChange('longitude', e.target.value)}
                    className={createHouseFormErrors.longitude ? 'input-error' : ''}
                    placeholder="49.8671"
                  />
                  {createHouseFormErrors.longitude && (
                    <span className="field-error">{createHouseFormErrors.longitude}</span>
                  )}
                </div>
              </div>

              {addHouseMode && (
                <div className="location-hint">
                  <span>📍</span> {t('mapManagement.locationFromMap')}
                </div>
              )}
            </div>

            <div className="edit-modal-footer">
              <button
                className="btn btn-secondary"
                onClick={handleCancelCreateHouseForm}
                disabled={creatingHouse}
              >
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateHouse}
                disabled={creatingHouse}
              >
                {creatingHouse ? t('common.loading') : t('mapManagement.createHouse')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Houses Table */}
      {houses.length === 0 ? (
        <div className="no-houses">
          <p>{t('mapManagement.noHousesFound')}</p>
          <p>{t('mapManagement.addHouseHint')}</p>
        </div>
      ) : (
        <div className="houses-table-container">
          <table className="houses-table">
            <thead>
              <tr>
                <th>{t('bookings.houseNumber')}</th>
                <th>{t('mapManagement.areaLabel')}</th>
                <th>{t('mapManagement.priceLabel')}</th>
                <th>{t('mapManagement.description')}</th>
                <th>Panorama</th>
                <th>{t('applicationReview.status')}</th>
                <th>{t('applicationReview.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {houses.map((house) => (
                <tr key={house.id} className={!house.isEnabled ? 'house-disabled' : ''}>
                  <td className="house-number-cell">
                    <strong>{house.houseNumber}</strong>
                  </td>
                  <td>{house.areaSqm !== null ? `${house.areaSqm} m²` : '—'}</td>
                  <td>{house.price !== null ? `${house.price} AZN` : '—'}</td>
                  <td className="description-cell">
                    {house.description || '—'}
                  </td>
                  <td>
                    {house.panorama360Url ? (
                      <span className="badge badge-success">{t('mapManagement.yes')}</span>
                    ) : (
                      <span className="badge badge-muted">{t('mapManagement.no')}</span>
                    )}
                  </td>
                  <td>
                    {house.isEnabled ? (
                      <span className="badge badge-active">{t('mapManagement.active')}</span>
                    ) : (
                      <span className="badge badge-inactive">{t('mapManagement.disabled')}</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleEdit(house)}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      className="btn btn-sm btn-panorama"
                      onClick={() => handlePanoramaUploadClick(house.id)}
                      disabled={uploadingPanoramaId === house.id}
                    >
                      {uploadingPanoramaId === house.id ? t('mapManagement.uploading') : t('mapManagement.uploadPanorama')}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteClick(house)}
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================== */}
      {/* Facilities Section */}
      {/* ======================== */}
      <div className="facilities-section">
        <div className="facilities-header">
          <h2>{t('mapManagement.facilities')}</h2>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowFacilityForm(true);
              setSuccessMessage('');
              setError('');
            }}
          >
            {t('mapManagement.addFacilityBtn')}
          </button>
        </div>

        {/* Create Facility Modal */}
        {showFacilityForm && (
          <div className="edit-modal-overlay" onClick={handleCancelFacilityForm}>
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="edit-modal-header">
                <h3>Add New Facility</h3>
                <button
                  className="btn-close"
                  onClick={handleCancelFacilityForm}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              <div className="edit-modal-body">
                <div className={`form-group ${facilityFormErrors.name ? 'has-error' : ''}`}>
                  <label htmlFor="facilityName">Facility Name *</label>
                  <input
                    id="facilityName"
                    type="text"
                    value={facilityFormData.name}
                    onChange={(e) => handleFacilityFormChange('name', e.target.value)}
                    className={facilityFormErrors.name ? 'input-error' : ''}
                    placeholder="e.g. Main Restaurant"
                  />
                  {facilityFormErrors.name && (
                    <span className="field-error">{facilityFormErrors.name}</span>
                  )}
                </div>

                <div className={`form-group ${facilityFormErrors.type ? 'has-error' : ''}`}>
                  <label htmlFor="facilityType">Type *</label>
                  <select
                    id="facilityType"
                    value={facilityFormData.type}
                    onChange={(e) => handleFacilityFormChange('type', e.target.value)}
                    className="facility-type-select"
                  >
                    {FACILITY_TYPES.map((ft) => (
                      <option key={ft.value} value={ft.value}>
                        {ft.icon} {ft.label}
                      </option>
                    ))}
                  </select>
                  {facilityFormErrors.type && (
                    <span className="field-error">{facilityFormErrors.type}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="facilityDescription">Description</label>
                  <textarea
                    id="facilityDescription"
                    rows={2}
                    value={facilityFormData.description}
                    onChange={(e) => handleFacilityFormChange('description', e.target.value)}
                    placeholder="Optional description"
                  />
                </div>

                <div className="form-row">
                  <div className={`form-group ${facilityFormErrors.latitude ? 'has-error' : ''}`}>
                    <label htmlFor="facilityLatitude">Latitude *</label>
                    <input
                      id="facilityLatitude"
                      type="number"
                      step="0.0001"
                      value={facilityFormData.latitude}
                      onChange={(e) => handleFacilityFormChange('latitude', e.target.value)}
                      className={facilityFormErrors.latitude ? 'input-error' : ''}
                      placeholder="40.4093"
                    />
                    {facilityFormErrors.latitude && (
                      <span className="field-error">{facilityFormErrors.latitude}</span>
                    )}
                  </div>
                  <div className={`form-group ${facilityFormErrors.longitude ? 'has-error' : ''}`}>
                    <label htmlFor="facilityLongitude">Longitude *</label>
                    <input
                      id="facilityLongitude"
                      type="number"
                      step="0.0001"
                      value={facilityFormData.longitude}
                      onChange={(e) => handleFacilityFormChange('longitude', e.target.value)}
                      className={facilityFormErrors.longitude ? 'input-error' : ''}
                      placeholder="49.8671"
                    />
                    {facilityFormErrors.longitude && (
                      <span className="field-error">{facilityFormErrors.longitude}</span>
                    )}
                  </div>
                </div>

                {addFacilityMode && (
                  <div className="location-hint">
                    <span>📍</span> Location selected from map click
                  </div>
                )}
              </div>

              <div className="edit-modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelFacilityForm}
                  disabled={savingFacility}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleCreateFacility}
                  disabled={savingFacility}
                >
                  {savingFacility ? 'Creating...' : 'Create Facility'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Facility Modal */}
        {editingFacility && (
          <div className="edit-modal-overlay" onClick={handleCancelEditFacility}>
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="edit-modal-header">
                <h3>Edit Facility: {editingFacility.name}</h3>
                <button
                  className="btn-close"
                  onClick={handleCancelEditFacility}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              <div className="edit-modal-body">
                <div className={`form-group ${editFacilityFormErrors.name ? 'has-error' : ''}`}>
                  <label htmlFor="editFacilityName">Facility Name *</label>
                  <input
                    id="editFacilityName"
                    type="text"
                    value={editFacilityFormData.name}
                    onChange={(e) => handleEditFacilityFormChange('name', e.target.value)}
                    className={editFacilityFormErrors.name ? 'input-error' : ''}
                    placeholder="e.g. Main Restaurant"
                  />
                  {editFacilityFormErrors.name && (
                    <span className="field-error">{editFacilityFormErrors.name}</span>
                  )}
                </div>

                <div className={`form-group ${editFacilityFormErrors.type ? 'has-error' : ''}`}>
                  <label htmlFor="editFacilityType">Type *</label>
                  <select
                    id="editFacilityType"
                    value={editFacilityFormData.type}
                    onChange={(e) => handleEditFacilityFormChange('type', e.target.value)}
                    className="facility-type-select"
                  >
                    {FACILITY_TYPES.map((ft) => (
                      <option key={ft.value} value={ft.value}>
                        {ft.icon} {ft.label}
                      </option>
                    ))}
                  </select>
                  {editFacilityFormErrors.type && (
                    <span className="field-error">{editFacilityFormErrors.type}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="editFacilityDescription">Description</label>
                  <textarea
                    id="editFacilityDescription"
                    rows={2}
                    value={editFacilityFormData.description}
                    onChange={(e) => handleEditFacilityFormChange('description', e.target.value)}
                    placeholder="Optional description"
                  />
                </div>

                <div className="form-row">
                  <div className={`form-group ${editFacilityFormErrors.latitude ? 'has-error' : ''}`}>
                    <label htmlFor="editFacilityLatitude">Latitude *</label>
                    <input
                      id="editFacilityLatitude"
                      type="number"
                      step="0.0001"
                      value={editFacilityFormData.latitude}
                      onChange={(e) => handleEditFacilityFormChange('latitude', e.target.value)}
                      className={editFacilityFormErrors.latitude ? 'input-error' : ''}
                      placeholder="40.4093"
                    />
                    {editFacilityFormErrors.latitude && (
                      <span className="field-error">{editFacilityFormErrors.latitude}</span>
                    )}
                  </div>
                  <div className={`form-group ${editFacilityFormErrors.longitude ? 'has-error' : ''}`}>
                    <label htmlFor="editFacilityLongitude">Longitude *</label>
                    <input
                      id="editFacilityLongitude"
                      type="number"
                      step="0.0001"
                      value={editFacilityFormData.longitude}
                      onChange={(e) => handleEditFacilityFormChange('longitude', e.target.value)}
                      className={editFacilityFormErrors.longitude ? 'input-error' : ''}
                      placeholder="49.8671"
                    />
                    {editFacilityFormErrors.longitude && (
                      <span className="field-error">{editFacilityFormErrors.longitude}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="edit-modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelEditFacility}
                  disabled={savingEditFacility}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveEditFacility}
                  disabled={savingEditFacility}
                >
                  {savingEditFacility ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Facility Confirmation */}
        {deletingFacility && (
          <div className="edit-modal-overlay" onClick={() => setDeletingFacility(null)}>
            <div className="edit-modal delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="edit-modal-header">
                <h3>Delete Facility</h3>
                <button className="btn-close" onClick={() => setDeletingFacility(null)} aria-label="Close">
                  &times;
                </button>
              </div>
              <div className="edit-modal-body">
                <p className="delete-warning">
                  Are you sure you want to delete facility <strong>{deletingFacility.name}</strong>?
                </p>
                <p className="delete-note">This action cannot be undone.</p>
              </div>
              <div className="edit-modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setDeletingFacility(null)}
                  disabled={deletingFacilityInProgress}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteFacility}
                  disabled={deletingFacilityInProgress}
                >
                  {deletingFacilityInProgress ? 'Deleting...' : 'Delete Facility'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Facilities Table */}
        {facilities.length === 0 ? (
          <div className="no-houses">
            <p>No facilities found.</p>
            <p>Click "Add Facility" to create one, or use the map above to place facilities.</p>
          </div>
        ) : (
          <div className="houses-table-container">
            <table className="houses-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((facility) => {
                  const typeInfo = FACILITY_TYPES.find((ft) => ft.value === facility.type);
                  return (
                    <tr key={facility.id}>
                      <td>
                        <strong>{facility.name}</strong>
                      </td>
                      <td>
                        <span className="facility-type-badge" style={{ backgroundColor: typeInfo?.color || '#6B7280' }}>
                          {typeInfo?.icon || '?'} {typeInfo?.label || facility.type}
                        </span>
                      </td>
                      <td className="description-cell">{facility.description || '—'}</td>
                      <td className="location-cell">
                        {facility.latitude.toFixed(4)}, {facility.longitude.toFixed(4)}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleEditFacility(facility)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            setDeletingFacility(facility);
                            setSuccessMessage('');
                            setError('');
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapManagement;
