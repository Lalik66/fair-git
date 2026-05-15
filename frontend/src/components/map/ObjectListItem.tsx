import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapObject, getCategoryColor, getCategoryLabel, getCategoryEmoji } from '../../types/map';

interface ObjectListItemProps {
  object: MapObject;
  isSelected: boolean;
  onClick: () => void;
  isPrivileged?: boolean;
}

const ObjectListItem: React.FC<ObjectListItemProps> = ({
  object,
  isSelected,
  onClick,
  isPrivileged = false,
}) => {
  const { i18n } = useTranslation();
  const isVendorHouse = object.type === 'vendor_house';
  const category = object.vendor?.productCategory;
  // Visitors see the icon colored by what the stall sells, not occupancy.
  const iconColor = isVendorHouse && !isPrivileged
    ? getCategoryColor(category)
    : object.color;

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
      <div className="object-icon" style={{ backgroundColor: iconColor }}>
        {object.emoji}
      </div>
      <div className="object-info">
        <div className="object-name">
          {isVendorHouse && !isPrivileged && object.vendor?.companyName
            ? object.vendor.companyName
            : object.label}
        </div>
        {isVendorHouse && isPrivileged && (
          <div className="object-details">
            {object.areaSqm && <span>{object.areaSqm.toFixed(0)} m²</span>}
            {object.areaSqm && object.price && <span className="separator">•</span>}
            {object.price && <span>{object.price.toFixed(0)} AZN</span>}
          </div>
        )}
        {isVendorHouse && !isPrivileged && category && (
          <div className="object-details">
            <span>{getCategoryEmoji(category)} {getCategoryLabel(category, i18n.language)}</span>
          </div>
        )}
        {!isVendorHouse && object.description && (
          <div className="object-description">{object.description}</div>
        )}
      </div>
      {isVendorHouse && isPrivileged && object.isAvailable !== null && object.isAvailable !== undefined && (
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
