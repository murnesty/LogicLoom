import { useState, useEffect, useCallback } from 'react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { Header } from './components/Header';
import { EraLegend } from './components/EraLegend';
import { TimelineSlider } from './components/TimelineSlider';
import { HistoryMap } from './components/HistoryMap';
import { EventSidebar } from './components/EventSidebar';
import { EraDto, EventSummaryDto } from './types';
import { fetchEras, fetchEvents } from './api/historyApi';
import './App.css';

// Default time range for Chinese history
const DEFAULT_MIN_YEAR = -500;
const DEFAULT_MAX_YEAR = 2000;
const INITIAL_START_YEAR = -221; // Start of Qin Dynasty
const INITIAL_END_YEAR = 1912;   // End of Qing Dynasty

function HistoryViewerContent() {
  const { lang } = useLanguage();
  
  // Data state
  const [eras, setEras] = useState<EraDto[]>([]);
  const [events, setEvents] = useState<EventSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [selectedRange, setSelectedRange] = useState({
    start: INITIAL_START_YEAR,
    end: INITIAL_END_YEAR,
  });
  const [selectedEra, setSelectedEra] = useState<EraDto | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventSummaryDto | null>(null);

  // Load eras
  useEffect(() => {
    fetchEras(lang, 'chinese')
      .then(setEras)
      .catch((err) => console.error('Failed to load eras:', err));
  }, [lang]);

  // Load events based on time range and selected era
  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchEvents({
        lang,
        startYear: selectedRange.start,
        endYear: selectedRange.end,
        civilization: 'chinese',
        limit: 100,
      });
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [lang, selectedRange]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Filter events by selected era if one is selected
  const filteredEvents = selectedEra
    ? events.filter((e) => e.eraName === selectedEra.name)
    : events;

  const handleEventClick = (event: EventSummaryDto) => {
    setSelectedEvent(event);
  };

  const handleRelatedEventClick = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
    }
  };

  const handleEraSelect = (era: EraDto | null) => {
    setSelectedEra(era);
    if (era) {
      // Update timeline to show the selected era's range
      setSelectedRange({
        start: Math.max(era.startYear, DEFAULT_MIN_YEAR),
        end: Math.min(era.endYear, DEFAULT_MAX_YEAR),
      });
    }
  };

  return (
    <div className="app">
      <Header />
      
      <div className="main-content">
        {/* Era Legend - Left sidebar */}
        <div className="left-panel">
          <EraLegend
            eras={eras}
            selectedEraId={selectedEra?.id}
            onEraSelect={handleEraSelect}
          />
        </div>

        {/* Map Area - Center */}
        <div className="map-container">
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
            </div>
          )}
          
          {error && (
            <div className="error-banner">
              ⚠️ {error}
              <button onClick={loadEvents}>Retry</button>
            </div>
          )}

          <HistoryMap
            events={filteredEvents}
            onEventClick={handleEventClick}
            selectedEventId={selectedEvent?.id}
          />

          {/* Event Sidebar */}
          {selectedEvent && (
            <EventSidebar
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
              onRelatedEventClick={handleRelatedEventClick}
            />
          )}
        </div>
      </div>

      {/* Timeline - Bottom */}
      <TimelineSlider
        eras={eras}
        minYear={DEFAULT_MIN_YEAR}
        maxYear={DEFAULT_MAX_YEAR}
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
      />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <HistoryViewerContent />
    </LanguageProvider>
  );
}

export default App;
