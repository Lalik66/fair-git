import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapObject, FilterType, Fair } from '../../types/map';
import FilterBar from './FilterBar';
import ObjectList from './ObjectList';

interface SidebarProps {
  objects: MapObject[];
  selectedObjectId: string | null;
  onObjectSelect: (id: string | null) => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  fairs: Fair[];
  selectedFairId: string | null;
  onFairChange: (fairId: string | null) => void;
  isLoading?: boolean;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  objects,
  selectedObjectId,
  onObjectSelect,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  fairs,
  selectedFairId,
  onFairChange,
  isLoading = false,
  className = '',
}) => {
  const { t, i18n } = useTranslation();

  const selectedFair = fairs.find(f => f.id === selectedFairId);

  return (
    <div className={`sidebar ${className}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          <span className="title-icon">🗺️</span>
          Yarmarka xəritəsi
        </h2>
      </div>

      {/* Fair selector */}
      <div className="sidebar-section fair-selector-section">
        <select
          className="fair-select"
          value={selectedFairId || ''}
          onChange={(e) => onFairChange(e.target.value || null)}
          aria-label={t('map.selectFairLabel', 'Yarmarkanı seçin')}
        >
          <option value="">{t('map.allFairs', 'Bütün yarmarkalar')}</option>
          {fairs.map((fair) => (
            <option key={fair.id} value={fair.id}>
              {fair.name} ({fair.status === 'active' ? 'Aktiv' : fair.status === 'upcoming' ? 'Gələcək' : fair.status})
            </option>
          ))}
        </select>

        {selectedFair && (
          <div className="fair-info-card">
            <div className="fair-dates">
              📅 {new Date(selectedFair.startDate).toLocaleDateString(i18n.language)} - {new Date(selectedFair.endDate).toLocaleDateString(i18n.language)}
            </div>
            {selectedFair.locationAddress && (
              <div className="fair-location">
                📍 {selectedFair.locationAddress}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search box */}
      <div className="sidebar-section search-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={t('map.search', 'Axtar...')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="sidebar-section filter-section">
        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
        />
      </div>

      {/* Results count */}
      <div className="sidebar-section results-section">
        <span className="results-count">
          {objects.length} {objects.length === 1 ? 'nəticə' : 'nəticə'}
        </span>
      </div>

      {/* Object list */}
      <ObjectList
        objects={objects}
        selectedObjectId={selectedObjectId}
        onObjectSelect={(id) => onObjectSelect(id)}
        isLoading={isLoading}
        className="sidebar-object-list"
      />
    </div>
  );
};

export default Sidebar;
