import React from 'react';
import { MapObject } from '../../types/map';

interface ObjectListItemProps {
  object: MapObject;
  isSelected: boolean;
  onClick: () => void;
}

const ObjectListItem: React.FC<ObjectListItemProps> = ({
  object,
  isSelected,
  onClick,
}) => {
  const isVendorHouse = object.type === 'vendor_house';

  return (
    <div
      className={`object-list-item ${isSelected ? 'selected' : ''} ${isVendorHouse ? 'vendor-house' : 'facility'}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="object-icon" style={{ backgroundColor: object.color }}>
        {object.emoji}
      </div>
      <div className="object-info">
        <div className="object-name">{object.label}</div>
        {isVendorHouse && (
          <div className="object-details">
            {object.areaSqm && <span>{object.areaSqm.toFixed(0)} m²</span>}
            {object.areaSqm && object.price && <span className="separator">•</span>}
            {object.price && <span>{object.price.toFixed(0)} AZN</span>}
          </div>
        )}
        {!isVendorHouse && object.description && (
          <div className="object-description">{object.description}</div>
        )}
      </div>
      {isVendorHouse && object.isAvailable !== null && (
        <div className={`availability-badge ${object.isAvailable ? 'available' : 'occupied'}`}>
          {object.isAvailable ? 'Bos' : 'Tutulub'}
        </div>
      )}
      {object.panorama360Url && (
        <div className="panorama-indicator" title="360° panorama mövcuddur">
          🔄
        </div>
      )}
    </div>
  );
};

export default ObjectListItem;
