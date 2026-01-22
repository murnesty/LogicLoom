import { useEffect, useState } from 'react';
import { EventDetailDto, EventSummaryDto, CATEGORY_ICONS } from '../types';
import { fetchEventDetail, formatYear, formatYearZh } from '../api/historyApi';
import { useLanguage } from '../contexts/LanguageContext';
import './EventSidebar.css';

interface EventSidebarProps {
  event: EventSummaryDto | null;
  onClose: () => void;
  onRelatedEventClick: (eventId: string) => void;
}

export function EventSidebar({ event, onClose, onRelatedEventClick }: EventSidebarProps) {
  const { lang, t } = useLanguage();
  const [detail, setDetail] = useState<EventDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!event) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchEventDetail(event.id, lang)
      .then(setDetail)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [event?.id, lang]);

  if (!event) return null;

  const formatYearDisplay = (year: number) => {
    return lang === 'zh' ? formatYearZh(year) : formatYear(year);
  };

  const renderSignificanceStars = (significance: number) => {
    return '★'.repeat(significance) + '☆'.repeat(10 - significance);
  };

  return (
    <div className="event-sidebar">
      <button className="sidebar-close" onClick={onClose}>×</button>

      {loading && (
        <div className="sidebar-loading">
          <div className="loading-spinner"></div>
          <p>{t('Loading...', '加载中...')}</p>
        </div>
      )}

      {error && (
        <div className="sidebar-error">
          <p>⚠️ {error}</p>
        </div>
      )}

      {detail && (
        <>
          {/* Header Image */}
          {detail.imageUrl && (
            <div className="sidebar-image">
              <img src={detail.imageUrl} alt={detail.title} />
            </div>
          )}

          {/* Title */}
          <h2 className="sidebar-title">{detail.title}</h2>

          {/* Meta information */}
          <div className="sidebar-meta">
            <div className="meta-item">
              <span className="meta-icon">📅</span>
              <span>{formatYearDisplay(detail.startYear)}</span>
              {detail.endYear && detail.endYear !== detail.startYear && (
                <span> - {formatYearDisplay(detail.endYear)}</span>
              )}
            </div>

            {detail.era && (
              <div className="meta-item">
                <span 
                  className="era-badge" 
                  style={{ backgroundColor: detail.era.color || '#666' }}
                >
                  {detail.era.name}
                </span>
              </div>
            )}

            <div className="meta-item">
              <span className="meta-icon">{CATEGORY_ICONS[detail.category] || '📍'}</span>
              <span>{detail.category}</span>
            </div>

            <div className="meta-item significance">
              <span className="meta-label">{t('Significance:', '重要性:')}</span>
              <span className="significance-stars">{renderSignificanceStars(detail.significance)}</span>
            </div>
          </div>

          {/* Description */}
          {detail.description && (
            <div className="sidebar-section">
              <p className="sidebar-description">{detail.description}</p>
            </div>
          )}

          {/* Key Figures */}
          {detail.figures && detail.figures.length > 0 && (
            <div className="sidebar-section">
              <h3 className="section-title">{t('Key Figures', '关键人物')}</h3>
              <div className="figures-list">
                {detail.figures.map((figure) => (
                  <div key={figure.id} className="figure-item">
                    <span className="figure-avatar">
                      {figure.portraitUrl ? (
                        <img src={figure.portraitUrl} alt={figure.name} />
                      ) : (
                        '👤'
                      )}
                    </span>
                    <div className="figure-info">
                      <span className="figure-name">{figure.name}</span>
                      {figure.role && <span className="figure-role">{figure.role}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {detail.tags && detail.tags.length > 0 && (
            <div className="sidebar-section">
              <div className="tags-list">
                {detail.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Related Events */}
          {detail.relatedEvents && detail.relatedEvents.length > 0 && (
            <div className="sidebar-section">
              <h3 className="section-title">{t('Related Events', '相关事件')}</h3>
              <div className="related-events-list">
                {detail.relatedEvents.map((relatedEvent) => (
                  <button
                    key={relatedEvent.id}
                    className="related-event"
                    onClick={() => onRelatedEventClick(relatedEvent.id)}
                  >
                    <span className="related-event-icon">
                      {CATEGORY_ICONS[relatedEvent.category] || '📍'}
                    </span>
                    <span className="related-event-title">{relatedEvent.title}</span>
                    <span className="related-event-year">
                      {formatYearDisplay(relatedEvent.year)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Source Link */}
          {detail.sourceUrl && (
            <div className="sidebar-section">
              <a 
                href={detail.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="source-link"
              >
                📖 {t('Read More', '了解更多')}
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
