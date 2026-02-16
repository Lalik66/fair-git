import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface GeocoderResult {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  place_type: string[];
  text: string;
  context?: Array<{ id: string; text: string }>;
}

interface GeocoderSearchProps {
  onLocationSelect: (lng: number, lat: number, zoom?: number) => void;
  mapboxToken: string;
  placeholder?: string;
  proximity?: [number, number]; // [lng, lat] to bias results
  country?: string; // e.g., "az" for Azerbaijan
  className?: string;
}

const GeocoderSearch: React.FC<GeocoderSearchProps> = ({
  onLocationSelect,
  mapboxToken,
  placeholder,
  proximity,
  country = 'az',
  className = '',
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocoderResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search function
  const searchPlaces = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        access_token: mapboxToken,
        autocomplete: 'true',
        limit: '5',
        language: 'az,en',
        types: 'address,poi,place,locality,neighborhood',
      });

      if (country) {
        params.append('country', country);
      }

      if (proximity) {
        params.append('proximity', `${proximity[0]},${proximity[1]}`);
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?${params}`
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      setResults(data.features || []);
      setIsOpen(data.features?.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Geocoding error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [mapboxToken, proximity, country]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout for debounced search
    debounceRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 300);
  };

  // Handle result selection
  const handleSelect = (result: GeocoderResult) => {
    setQuery(result.place_name);
    setIsOpen(false);
    setResults([]);

    // Determine zoom level based on place type
    let zoom = 17;
    if (result.place_type.includes('country')) zoom = 5;
    else if (result.place_type.includes('region')) zoom = 8;
    else if (result.place_type.includes('place')) zoom = 13;
    else if (result.place_type.includes('locality')) zoom = 14;
    else if (result.place_type.includes('neighborhood')) zoom = 15;
    else if (result.place_type.includes('address')) zoom = 17;
    else if (result.place_type.includes('poi')) zoom = 18;

    onLocationSelect(result.center[0], result.center[1], zoom);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Get icon for place type
  const getPlaceIcon = (placeTypes: string[]): string => {
    if (placeTypes.includes('poi')) return '📍';
    if (placeTypes.includes('address')) return '🏠';
    if (placeTypes.includes('place')) return '🏙️';
    if (placeTypes.includes('locality')) return '🏘️';
    if (placeTypes.includes('neighborhood')) return '🏡';
    return '📌';
  };

  // Format the secondary text (context)
  const getSecondaryText = (result: GeocoderResult): string => {
    if (!result.context || result.context.length === 0) return '';
    return result.context.map((c) => c.text).join(', ');
  };

  return (
    <div ref={containerRef} className={`geocoder-search ${className}`}>
      <div className="geocoder-input-wrapper">
        <span className="geocoder-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          className="geocoder-input"
          placeholder={placeholder || t('map.searchLocation', 'Ünvan və ya yer axtar...')}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          autoComplete="off"
        />
        {isLoading && (
          <span className="geocoder-spinner" />
        )}
        {query && !isLoading && (
          <button
            className="geocoder-clear"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="geocoder-results">
          {results.map((result, index) => (
            <li
              key={result.id}
              className={`geocoder-result-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="result-icon">{getPlaceIcon(result.place_type)}</span>
              <div className="result-text">
                <span className="result-primary">{result.text}</span>
                {getSecondaryText(result) && (
                  <span className="result-secondary">{getSecondaryText(result)}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GeocoderSearch;
