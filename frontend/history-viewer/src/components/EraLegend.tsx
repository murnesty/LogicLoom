import { EraDto } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import './EraLegend.css';

interface EraLegendProps {
  eras: EraDto[];
  selectedEraId?: string;
  onEraSelect?: (era: EraDto | null) => void;
}

export function EraLegend({ eras, selectedEraId, onEraSelect }: EraLegendProps) {
  const { t } = useLanguage();

  const formatYearRange = (start: number, end: number) => {
    const formatYear = (year: number) => {
      if (year < 0) return `${Math.abs(year)} BC`;
      return `${year} AD`;
    };
    return `${formatYear(start)} - ${formatYear(end)}`;
  };

  return (
    <div className="era-legend">
      <h3 className="era-legend-title">{t('Chinese Dynasties', '中国朝代')}</h3>
      <div className="era-legend-list">
        {eras.map((era) => (
          <div
            key={era.id}
            className={`era-legend-item ${selectedEraId === era.id ? 'selected' : ''}`}
            onClick={() => onEraSelect?.(selectedEraId === era.id ? null : era)}
          >
            <span 
              className="era-color-box" 
              style={{ backgroundColor: era.color || '#888' }}
            />
            <div className="era-info">
              <span className="era-name">{era.name}</span>
              <span className="era-years">{formatYearRange(era.startYear, era.endYear)}</span>
            </div>
            {era.eventCount > 0 && (
              <span className="era-event-count">{era.eventCount}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
