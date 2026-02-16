import React from 'react';
import { FilterType, FILTER_BUTTONS } from '../../types/map';

interface FilterBarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  className?: string;
}

const FilterBar: React.FC<FilterBarProps> = ({
  activeFilter,
  onFilterChange,
  className = '',
}) => {
  return (
    <div className={`filter-bar ${className}`}>
      {FILTER_BUTTONS.map((button) => (
        <button
          key={button.key}
          className={`filter-button ${activeFilter === button.key ? 'active' : ''}`}
          onClick={() => onFilterChange(button.key)}
          title={button.label}
        >
          <span className="filter-emoji">{button.emoji}</span>
          <span className="filter-label">{button.label}</span>
        </button>
      ))}
    </div>
  );
};

export default FilterBar;
