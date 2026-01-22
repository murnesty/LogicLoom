import React, { useRef, useEffect, useCallback } from 'react';
import { EraDto } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import './TimelineSlider.css';

interface TimelineSliderProps {
  eras: EraDto[];
  minYear: number;
  maxYear: number;
  selectedRange: { start: number; end: number };
  onRangeChange: (range: { start: number; end: number }) => void;
}

export function TimelineSlider({
  eras,
  minYear,
  maxYear,
  selectedRange,
  onRangeChange,
}: TimelineSliderProps) {
  const { t } = useLanguage();
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<'start' | 'end' | null>(null);

  const yearToPercent = (year: number) => {
    return ((year - minYear) / (maxYear - minYear)) * 100;
  };

  const percentToYear = (percent: number) => {
    return Math.round(minYear + (percent / 100) * (maxYear - minYear));
  };

  const formatYear = (year: number) => {
    if (year < 0) return `${Math.abs(year)} BC`;
    return `${year} AD`;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const year = percentToYear(percent);

      if (isDragging.current === 'start') {
        if (year < selectedRange.end - 50) {
          onRangeChange({ start: year, end: selectedRange.end });
        }
      } else {
        if (year > selectedRange.start + 50) {
          onRangeChange({ start: selectedRange.start, end: year });
        }
      }
    },
    [selectedRange, onRangeChange, percentToYear]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = null;
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleHandleMouseDown = (handle: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = handle;
    document.body.style.cursor = 'grabbing';
  };

  return (
    <div className="timeline-slider">
      <div className="timeline-header">
        <span className="timeline-title">{t('Timeline', '时间轴')}</span>
        <span className="timeline-selected-range">
          {t('Selected:', '选择:')} {formatYear(selectedRange.start)} - {formatYear(selectedRange.end)}
        </span>
      </div>

      <div className="timeline-track-container">
        <span className="timeline-year-label">{formatYear(minYear)}</span>
        
        <div className="timeline-track" ref={trackRef}>
          {/* Era bars */}
          {eras.map((era) => {
            const startPercent = yearToPercent(Math.max(era.startYear, minYear));
            const endPercent = yearToPercent(Math.min(era.endYear, maxYear));
            if (endPercent <= 0 || startPercent >= 100) return null;
            
            return (
              <div
                key={era.id}
                className="timeline-era-bar"
                style={{
                  left: `${startPercent}%`,
                  width: `${endPercent - startPercent}%`,
                  backgroundColor: era.color || '#888',
                }}
                title={`${era.name} (${formatYear(era.startYear)} - ${formatYear(era.endYear)})`}
              >
                <span className="timeline-era-label">{era.name}</span>
              </div>
            );
          })}

          {/* Selected range overlay */}
          <div
            className="timeline-selection"
            style={{
              left: `${yearToPercent(selectedRange.start)}%`,
              width: `${yearToPercent(selectedRange.end) - yearToPercent(selectedRange.start)}%`,
            }}
          />

          {/* Start handle */}
          <div
            className="timeline-handle timeline-handle-start"
            style={{ left: `${yearToPercent(selectedRange.start)}%` }}
            onMouseDown={handleHandleMouseDown('start')}
          />

          {/* End handle */}
          <div
            className="timeline-handle timeline-handle-end"
            style={{ left: `${yearToPercent(selectedRange.end)}%` }}
            onMouseDown={handleHandleMouseDown('end')}
          />
        </div>

        <span className="timeline-year-label">{formatYear(maxYear)}</span>
      </div>
    </div>
  );
}
