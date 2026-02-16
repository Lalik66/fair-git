import { useState, useCallback, useEffect, useMemo } from 'react';
import { publicApi } from '../services/api';
import { MapObject, FilterType, Fair } from '../types/map';

export interface MapInteractionState {
  selectedObjectId: string | null;
  activeFilter: FilterType;
  searchQuery: string;
  mapObjects: MapObject[];
  filteredObjects: MapObject[];
  isLoading: boolean;
  error: string | null;
  fairs: Fair[];
  selectedFairId: string | null;
}

export interface MapInteractionActions {
  setSelectedObjectId: (id: string | null) => void;
  setActiveFilter: (filter: FilterType) => void;
  setSearchQuery: (query: string) => void;
  setSelectedFairId: (fairId: string | null) => void;
  refreshMapObjects: () => Promise<void>;
}

export function useMapInteraction(initialFairId?: string | null) {
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mapObjects, setMapObjects] = useState<MapObject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fairs, setFairs] = useState<Fair[]>([]);
  const [selectedFairId, setSelectedFairId] = useState<string | null>(initialFairId || null);

  // Load fairs on mount
  useEffect(() => {
    const loadFairs = async () => {
      try {
        const data = await publicApi.getFairs();
        setFairs(data.fairs || []);

        // If no fair selected, use first active/upcoming fair
        if (!selectedFairId && data.fairs?.length > 0) {
          const activeFair = data.fairs.find((f: Fair) => f.status === 'active');
          const upcomingFair = data.fairs.find((f: Fair) => f.status === 'upcoming');
          setSelectedFairId(activeFair?.id || upcomingFair?.id || data.fairs[0].id);
        }
      } catch (err) {
        console.error('Failed to load fairs:', err);
      }
    };
    loadFairs();
  }, []);

  // Load map objects when fair or search changes
  const loadMapObjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: { search?: string; types?: string; fairId?: string } = {};

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      if (activeFilter !== 'all') {
        params.types = activeFilter;
      }

      if (selectedFairId) {
        params.fairId = selectedFairId;
      }

      const data = await publicApi.getMapObjects(params);
      setMapObjects(data.objects || []);
    } catch (err) {
      console.error('Failed to load map objects:', err);
      setError('Failed to load map data');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, activeFilter, selectedFairId]);

  // Load map objects when dependencies change
  useEffect(() => {
    loadMapObjects();
  }, [loadMapObjects]);

  // Filter objects client-side for instant feedback
  const filteredObjects = useMemo(() => {
    let result = mapObjects;

    // Apply type filter if not filtering from API
    if (activeFilter !== 'all') {
      result = result.filter(obj => obj.type === activeFilter);
    }

    // Apply search filter client-side for instant feedback
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(obj =>
        obj.label.toLowerCase().includes(query) ||
        (obj.description && obj.description.toLowerCase().includes(query)) ||
        (obj.houseNumber && obj.houseNumber.toLowerCase().includes(query))
      );
    }

    return result;
  }, [mapObjects, activeFilter, searchQuery]);

  // Get selected object
  const selectedObject = useMemo(() => {
    if (!selectedObjectId) return null;
    return mapObjects.find(obj => obj.id === selectedObjectId) || null;
  }, [mapObjects, selectedObjectId]);

  // Get selected fair
  const selectedFair = useMemo(() => {
    if (!selectedFairId) return null;
    return fairs.find(f => f.id === selectedFairId) || null;
  }, [fairs, selectedFairId]);

  return {
    // State
    selectedObjectId,
    activeFilter,
    searchQuery,
    mapObjects,
    filteredObjects,
    isLoading,
    error,
    fairs,
    selectedFairId,
    selectedObject,
    selectedFair,

    // Actions
    setSelectedObjectId,
    setActiveFilter,
    setSearchQuery,
    setSelectedFairId,
    refreshMapObjects: loadMapObjects,
  };
}
