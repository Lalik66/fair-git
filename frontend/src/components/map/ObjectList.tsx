import React, { useRef, useEffect } from 'react';
import { MapObject } from '../../types/map';
import ObjectListItem from './ObjectListItem';

interface ObjectListProps {
  objects: MapObject[];
  selectedObjectId: string | null;
  onObjectSelect: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

const ObjectList: React.FC<ObjectListProps> = ({
  objects,
  selectedObjectId,
  onObjectSelect,
  isLoading = false,
  className = '',
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll to selected item when selection changes
  useEffect(() => {
    if (selectedObjectId && listRef.current) {
      const itemElement = itemRefs.current.get(selectedObjectId);
      if (itemElement) {
        itemElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [selectedObjectId]);

  if (isLoading) {
    return (
      <div className={`object-list ${className}`}>
        <div className="object-list-loading">
          <div className="spinner"></div>
          <p>Yüklənir...</p>
        </div>
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <div className={`object-list ${className}`}>
        <div className="object-list-empty">
          <span className="empty-icon">🔍</span>
          <p>Heç bir obyekt tapılmadı</p>
        </div>
      </div>
    );
  }

  // Group objects by type
  const vendorHouses = objects.filter(obj => obj.type === 'vendor_house');
  const facilities = objects.filter(obj => obj.type !== 'vendor_house');

  return (
    <div className={`object-list ${className}`} ref={listRef}>
      {vendorHouses.length > 0 && (
        <div className="object-group">
          <div className="object-group-header">
            <span className="group-emoji">🏠</span>
            <span className="group-title">Satıcı evləri</span>
            <span className="group-count">{vendorHouses.length}</span>
          </div>
          <div className="object-group-items">
            {vendorHouses.map((obj) => (
              <div
                key={obj.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(obj.id, el);
                }}
              >
                <ObjectListItem
                  object={obj}
                  isSelected={selectedObjectId === obj.id}
                  onClick={() => onObjectSelect(obj.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {facilities.length > 0 && (
        <div className="object-group">
          <div className="object-group-header">
            <span className="group-emoji">📍</span>
            <span className="group-title">Obyektlər</span>
            <span className="group-count">{facilities.length}</span>
          </div>
          <div className="object-group-items">
            {facilities.map((obj) => (
              <div
                key={obj.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(obj.id, el);
                }}
              >
                <ObjectListItem
                  object={obj}
                  isSelected={selectedObjectId === obj.id}
                  onClick={() => onObjectSelect(obj.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectList;
