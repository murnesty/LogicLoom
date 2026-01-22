import { EventSummaryDto, CATEGORY_ICONS, CATEGORY_COLORS } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import './HistoryMap.css';

interface HistoryMapProps {
  events: EventSummaryDto[];
  onEventClick: (event: EventSummaryDto) => void;
  selectedEventId?: string;
}

// Map China's historical region coordinates
const MAP_BOUNDS = {
  minLat: 18,
  maxLat: 54,
  minLng: 73,
  maxLng: 135,
};

export function HistoryMap({ events, onEventClick, selectedEventId }: HistoryMapProps) {
  const { t } = useLanguage();

  const latLngToXY = (lat: number, lng: number) => {
    const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
    const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;
    return { x, y };
  };

  const getMarkerSize = (significance: number) => {
    return 16 + significance * 3; // 16px to 46px based on significance 1-10
  };

  return (
    <div className="history-map">
      {/* SVG China outline (simplified) */}
      <svg className="map-background" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2d3a4f" />
            <stop offset="100%" stopColor="#1a2633" />
          </linearGradient>
          <pattern id="gridPattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#mapGradient)" />
        <rect width="100" height="100" fill="url(#gridPattern)" />
        
        {/* Simplified China outline */}
        <path
          className="china-outline"
          d="M 45 15 Q 55 12, 65 15 Q 75 18, 80 25 Q 85 35, 82 45 Q 80 55, 75 60 
             Q 70 65, 65 70 Q 60 75, 55 78 Q 50 80, 45 78 Q 35 75, 30 70 
             Q 25 65, 22 55 Q 20 45, 22 35 Q 25 25, 35 18 Q 40 15, 45 15"
          fill="rgba(100, 140, 100, 0.15)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="0.5"
        />
        
        {/* Major rivers (simplified) */}
        <path
          className="river"
          d="M 30 40 Q 40 38, 50 42 Q 60 45, 75 43"
          fill="none"
          stroke="rgba(100, 150, 200, 0.3)"
          strokeWidth="0.8"
        />
        <path
          className="river"
          d="M 25 55 Q 40 52, 55 55 Q 70 58, 78 55"
          fill="none"
          stroke="rgba(100, 150, 200, 0.3)"
          strokeWidth="0.8"
        />
      </svg>

      {/* Event markers */}
      <div className="map-markers">
        {events.map((event) => {
          const { x, y } = latLngToXY(event.lat, event.lng);
          const size = getMarkerSize(event.significance);
          const isSelected = event.id === selectedEventId;
          
          return (
            <button
              key={event.id}
              className={`map-marker ${isSelected ? 'selected' : ''}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                backgroundColor: event.eraColor || CATEGORY_COLORS[event.category] || '#666',
                transform: `translate(-50%, -50%) ${isSelected ? 'scale(1.3)' : ''}`,
                zIndex: isSelected ? 100 : event.significance,
              }}
              onClick={() => onEventClick(event)}
              title={`${event.title} (${event.year < 0 ? Math.abs(event.year) + ' BC' : event.year + ' AD'})`}
            >
              <span className="marker-icon">{CATEGORY_ICONS[event.category] || '📍'}</span>
            </button>
          );
        })}
      </div>

      {/* Map legend */}
      <div className="map-legend">
        <div className="legend-title">{t('Categories', '类别')}</div>
        <div className="legend-items">
          {Object.entries(CATEGORY_ICONS).slice(0, 6).map(([category, icon]) => (
            <div key={category} className="legend-item">
              <span className="legend-icon">{icon}</span>
              <span className="legend-label">{category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* No events message */}
      {events.length === 0 && (
        <div className="map-empty">
          <p>{t('No events found in this time period', '在此时间段内未找到事件')}</p>
        </div>
      )}
    </div>
  );
}
