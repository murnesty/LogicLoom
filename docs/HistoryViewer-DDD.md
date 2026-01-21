# History Viewer - Domain-Driven Design

## Overview

This document outlines the domain model, database design, API structure, and UI data flow for the History Viewer application using DDD principles.

---

## 1. Domain Analysis

### 1.1 Ubiquitous Language

| Term | Definition |
|------|------------|
| **Era** | A named historical period (e.g., 秦朝 Qin Dynasty, Roman Empire) |
| **Event** | Something significant that happened at a time and place |
| **Historical Figure** | Important person in history |
| **Territory** | Geographic area controlled by a civilization at a point in time |
| **Category** | Type of event (war, cultural, scientific, religious, political) |
| **Timeline** | Chronological representation of events |

### 1.2 Bounded Contexts

```
┌─────────────────────────────────────────────────────────────────────┐
│                    History Viewer Domain                             │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Timeline   │  │  Geography   │  │   People     │               │
│  │   Context    │  │   Context    │  │   Context    │               │
│  │              │  │              │  │              │               │
│  │ - Events     │  │ - Locations  │  │ - Figures    │               │
│  │ - Eras       │  │ - Territories│  │ - Roles      │               │
│  │ - Categories │  │ - Regions    │  │ - Relations  │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Domain Model (Aggregates & Entities)

### 2.1 Core Aggregates

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EVENT AGGREGATE                              │
│  (Root: Event)                                                       │
│                                                                      │
│  Event                                                               │
│  ├── Id: Guid                                                        │
│  ├── Title: LocalizedString                                          │
│  ├── Description: LocalizedString                                    │
│  ├── DateRange: HistoricalDate                                       │
│  ├── Location: GeoPoint                                              │
│  ├── Category: EventCategory                                         │
│  ├── Significance: int (1-10)                                        │
│  ├── Sources: List<Source>                                           │
│  ├── MediaItems: List<MediaItem>                                     │
│  └── Tags: List<Tag>                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          ERA AGGREGATE                               │
│  (Root: Era)                                                         │
│                                                                      │
│  Era                                                                 │
│  ├── Id: Guid                                                        │
│  ├── Name: LocalizedString (e.g., "秦朝", "Qin Dynasty")             │
│  ├── DateRange: HistoricalDate                                       │
│  ├── Civilization: Civilization                                      │
│  ├── Capital: Location                                               │
│  ├── Description: LocalizedString                                    │
│  ├── Characteristics: List<string>                                   │
│  └── Color: string (for UI display)                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    HISTORICAL FIGURE AGGREGATE                       │
│  (Root: HistoricalFigure)                                            │
│                                                                      │
│  HistoricalFigure                                                    │
│  ├── Id: Guid                                                        │
│  ├── Name: LocalizedString                                           │
│  ├── BirthDate: HistoricalDate                                       │
│  ├── DeathDate: HistoricalDate                                       │
│  ├── BirthPlace: Location                                            │
│  ├── Roles: List<Role>                                               │
│  ├── Biography: LocalizedString                                      │
│  ├── Portrait: MediaItem                                             │
│  └── Aliases: List<string>                                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       TERRITORY AGGREGATE                            │
│  (Root: Territory)                                                   │
│                                                                      │
│  Territory                                                           │
│  ├── Id: Guid                                                        │
│  ├── Name: LocalizedString                                           │
│  ├── EraId: Guid                                                     │
│  ├── Year: int (specific year snapshot)                              │
│  ├── Boundaries: GeoPolygon (GeoJSON)                                │
│  ├── ControlledBy: Civilization                                      │
│  └── Color: string (for map display)                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Value Objects

```csharp
// Handles BC/AD dates elegantly
public record HistoricalDate
{
    public int Year { get; init; }           // Negative for BC
    public int? Month { get; init; }
    public int? Day { get; init; }
    public DatePrecision Precision { get; init; }  // Year, Month, Day, Approximate
    
    // Examples:
    // 221 BC = Year: -221
    // 1644 AD = Year: 1644
    // "Around 500 BC" = Year: -500, Precision: Approximate
}

public record LocalizedString
{
    public string En { get; init; }    // English
    public string Zh { get; init; }    // Chinese
    public string? ZhTw { get; init; } // Traditional Chinese
    // Add more languages as needed
}

public record GeoPoint
{
    public double Latitude { get; init; }
    public double Longitude { get; init; }
}

public record GeoPolygon
{
    public string GeoJson { get; init; }  // GeoJSON format for complex boundaries
}
```

### 2.3 Enums

```csharp
public enum EventCategory
{
    War,
    Political,
    Cultural,
    Scientific,
    Religious,
    Economic,
    Natural,        // Natural disasters, climate events
    Migration,
    Construction,   // Great Wall, pyramids, etc.
    Diplomatic
}

public enum Civilization
{
    Chinese,
    Roman,
    Greek,
    Persian,
    Islamic,
    Mongol,
    Byzantine,
    Indian,
    Japanese,
    Korean,
    Egyptian,
    Mesopotamian,
    // ... more
}

public enum FigureRole
{
    Emperor,
    King,
    General,
    Scholar,
    Artist,
    Scientist,
    Philosopher,
    Religious,
    Explorer,
    Rebel
}
```

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Eras     │       │     Events      │       │HistoricalFigures│
├─────────────┤       ├─────────────────┤       ├─────────────────┤
│ Id (PK)     │──┐    │ Id (PK)         │    ┌──│ Id (PK)         │
│ NameEn      │  │    │ TitleEn         │    │  │ NameEn          │
│ NameZh      │  │    │ TitleZh         │    │  │ NameZh          │
│ StartYear   │  │    │ DescriptionEn   │    │  │ BirthYear       │
│ EndYear     │  │    │ DescriptionZh   │    │  │ DeathYear       │
│ Civilization│  │    │ StartYear       │    │  │ BiographyEn     │
│ Color       │  └───>│ EndYear         │    │  │ BiographyZh     │
│ ...         │       │ Latitude        │    │  │ ...             │
└─────────────┘       │ Longitude       │    │  └─────────────────┘
                      │ Category        │    │
┌─────────────┐       │ Significance    │    │  ┌─────────────────┐
│ Territories │       │ EraId (FK)      │<───┘  │  EventFigures   │
├─────────────┤       │ ...             │       │  (Junction)     │
│ Id (PK)     │       └─────────────────┘       ├─────────────────┤
│ NameEn      │              │                  │ EventId (FK)    │
│ NameZh      │              │                  │ FigureId (FK)   │
│ Year        │              │                  │ Role            │
│ EraId (FK)  │              │                  └─────────────────┘
│ Boundaries  │◄─────────────┘
│ (GeoJSON)   │       ┌─────────────────┐
│ Color       │       │   EventTags     │
└─────────────┘       ├─────────────────┤
                      │ EventId (FK)    │
                      │ TagId (FK)      │
                      └─────────────────┘
```

### 3.2 SQL Schema (PostgreSQL with PostGIS)

```sql
-- Eras table
CREATE TABLE eras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(200) NOT NULL,
    name_zh VARCHAR(200) NOT NULL,
    start_year INT NOT NULL,           -- Negative for BC
    end_year INT NOT NULL,
    civilization VARCHAR(50) NOT NULL,
    capital_lat DECIMAL(10, 7),
    capital_lng DECIMAL(10, 7),
    description_en TEXT,
    description_zh TEXT,
    color VARCHAR(7),                  -- Hex color for UI
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en VARCHAR(500) NOT NULL,
    title_zh VARCHAR(500) NOT NULL,
    description_en TEXT,
    description_zh TEXT,
    start_year INT NOT NULL,
    end_year INT,
    date_precision VARCHAR(20) DEFAULT 'year',
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    category VARCHAR(50) NOT NULL,
    significance INT CHECK (significance BETWEEN 1 AND 10),
    era_id UUID REFERENCES eras(id),
    image_url VARCHAR(500),
    source_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Historical Figures table
CREATE TABLE historical_figures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(200) NOT NULL,
    name_zh VARCHAR(200) NOT NULL,
    birth_year INT,
    death_year INT,
    birth_place_lat DECIMAL(10, 7),
    birth_place_lng DECIMAL(10, 7),
    biography_en TEXT,
    biography_zh TEXT,
    portrait_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Event-Figure junction table
CREATE TABLE event_figures (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    figure_id UUID REFERENCES historical_figures(id) ON DELETE CASCADE,
    role VARCHAR(50),  -- e.g., "commander", "victim", "founder"
    PRIMARY KEY (event_id, figure_id)
);

-- Figure roles table
CREATE TABLE figure_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    figure_id UUID REFERENCES historical_figures(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    era_id UUID REFERENCES eras(id),
    title_en VARCHAR(200),
    title_zh VARCHAR(200)
);

-- Territories table (for showing empire boundaries)
CREATE TABLE territories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(200) NOT NULL,
    name_zh VARCHAR(200) NOT NULL,
    year INT NOT NULL,                 -- Snapshot year
    era_id UUID REFERENCES eras(id),
    civilization VARCHAR(50) NOT NULL,
    boundaries JSONB NOT NULL,         -- GeoJSON polygon
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(100) NOT NULL,
    name_zh VARCHAR(100) NOT NULL,
    category VARCHAR(50)
);

-- Event-Tags junction
CREATE TABLE event_tags (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, tag_id)
);

-- Indexes for common queries
CREATE INDEX idx_events_year ON events(start_year, end_year);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_era ON events(era_id);
CREATE INDEX idx_events_location ON events(latitude, longitude);
CREATE INDEX idx_territories_year ON territories(year);
CREATE INDEX idx_figures_era ON figure_roles(era_id);
```

---

## 4. Sample Data: Chinese Dynasties

### 4.1 Eras (Chinese Dynasties)

```sql
INSERT INTO eras (name_en, name_zh, start_year, end_year, civilization, color) VALUES
('Qin Dynasty',      '秦朝', -221,  -206, 'Chinese', '#8B4513'),
('Han Dynasty',      '汉朝', -206,   220, 'Chinese', '#DC143C'),
('Sui Dynasty',      '隋朝',  581,   618, 'Chinese', '#4B0082'),
('Tang Dynasty',     '唐朝',  618,   907, 'Chinese', '#FFD700'),
('Song Dynasty',     '宋朝',  960,  1279, 'Chinese', '#32CD32'),
('Yuan Dynasty',     '元朝', 1271,  1368, 'Chinese', '#1E90FF'),
('Ming Dynasty',     '明朝', 1368,  1644, 'Chinese', '#FF6347'),
('Qing Dynasty',     '清朝', 1644,  1912, 'Chinese', '#9932CC');
```

### 4.2 Sample Events

```sql
-- Qin Dynasty events
INSERT INTO events (title_en, title_zh, start_year, latitude, longitude, category, significance, description_en, description_zh) VALUES
('Unification of China', '秦统一中国', -221, 34.27, 108.93, 'Political', 10,
 'Qin Shi Huang unified China, ending the Warring States period',
 '秦始皇统一六国，结束战国时代'),

('Construction of Great Wall begins', '长城修建开始', -221, 40.43, 116.57, 'Construction', 9,
 'Beginning of the Great Wall construction to defend against northern invasions',
 '开始修建长城以防御北方入侵'),

('Burning of Books and Burying of Scholars', '焚书坑儒', -213, 34.27, 108.93, 'Cultural', 8,
 'Qin Shi Huang ordered burning of books and execution of scholars',
 '秦始皇下令焚烧书籍、坑杀儒生'),

-- Tang Dynasty events
('An Lushan Rebellion', '安史之乱', 755, 39.90, 116.40, 'War', 9,
 'Devastating rebellion that marked the decline of Tang Dynasty',
 '安禄山发动叛乱，标志唐朝由盛转衰'),

('Xuanzang''s Journey to India', '玄奘西行取经', 629, 34.27, 108.93, 'Religious', 8,
 'Buddhist monk Xuanzang traveled to India to obtain Buddhist scriptures',
 '玄奘法师西行印度取经');
```

### 4.3 Sample Historical Figures

```sql
INSERT INTO historical_figures (name_en, name_zh, birth_year, death_year, biography_en, biography_zh) VALUES
('Qin Shi Huang', '秦始皇', -259, -210,
 'First Emperor of unified China, founder of Qin Dynasty',
 '中国历史上第一个统一的封建王朝的开国皇帝'),

('Liu Bang', '刘邦', -256, -195,
 'Founder of Han Dynasty, known as Emperor Gaozu of Han',
 '汉朝开国皇帝，即汉高祖'),

('Emperor Taizong of Tang', '唐太宗', 598, 649,
 'Second emperor of Tang Dynasty, initiated the prosperous Zhenguan era',
 '唐朝第二位皇帝，开创贞观之治'),

('Genghis Khan', '成吉思汗', 1162, 1227,
 'Founder of the Mongol Empire, grandfather of Kublai Khan',
 '蒙古帝国创建者，忽必烈的祖父'),

('Zheng He', '郑和', 1371, 1433,
 'Ming Dynasty admiral who led seven voyages to Southeast Asia and Africa',
 '明朝航海家，七次下西洋');
```

---

## 5. API Design

### 5.1 REST Endpoints

```
GET  /api/events
     ?startYear=-500&endYear=500           # Filter by year range
     &category=war,political               # Filter by categories
     &civilization=chinese                  # Filter by civilization
     &bounds=30,100,45,130                 # Filter by map bounds (lat1,lng1,lat2,lng2)
     &significance=7                       # Minimum significance
     &lang=zh                              # Response language

GET  /api/events/{id}                      # Get single event with details

GET  /api/eras
     ?civilization=chinese                  # Filter by civilization
     &year=-200                            # Get era for specific year

GET  /api/eras/{id}                        # Get single era with events

GET  /api/figures
     ?era={eraId}                          # Figures in an era
     &role=emperor                          # Filter by role

GET  /api/figures/{id}                     # Get figure with events

GET  /api/territories
     ?year=-200                            # Get all territories at a year
     &civilization=chinese

GET  /api/timeline
     ?startYear=-500&endYear=500           # Get timeline summary
     &granularity=decade                   # decade, century, year
```

### 5.2 Response DTOs

```csharp
// Timeline query response - optimized for map display
public record TimelineEventDto
{
    public Guid Id { get; init; }
    public string Title { get; init; }          // Based on lang param
    public int Year { get; init; }
    public double Lat { get; init; }
    public double Lng { get; init; }
    public string Category { get; init; }
    public int Significance { get; init; }
    public string? ThumbnailUrl { get; init; }
    public string EraName { get; init; }
    public string EraColor { get; init; }
}

// Detailed event response
public record EventDetailDto
{
    public Guid Id { get; init; }
    public string Title { get; init; }
    public string Description { get; init; }
    public int StartYear { get; init; }
    public int? EndYear { get; init; }
    public GeoPointDto Location { get; init; }
    public string Category { get; init; }
    public int Significance { get; init; }
    public EraDto Era { get; init; }
    public List<FigureSummaryDto> Figures { get; init; }
    public List<string> Images { get; init; }
    public List<SourceDto> Sources { get; init; }
    public List<string> Tags { get; init; }
    public List<EventSummaryDto> RelatedEvents { get; init; }
}

// Territory for map overlay
public record TerritoryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; }
    public int Year { get; init; }
    public string Civilization { get; init; }
    public object Boundaries { get; init; }     // GeoJSON
    public string Color { get; init; }
}

// Era summary
public record EraDto
{
    public Guid Id { get; init; }
    public string Name { get; init; }
    public int StartYear { get; init; }
    public int EndYear { get; init; }
    public string Civilization { get; init; }
    public string Color { get; init; }
    public int EventCount { get; init; }
}
```

---

## 6. UI Data Flow & Interactions

### 6.1 Main UI Components

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                        HEADER                                │   │
│  │  [Logo]  [Search...]  [Filters ▼]  [Language 🌐]  [About]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │                                                              │   │
│  │                      INTERACTIVE MAP                         │   │
│  │                                                              │   │
│  │     [Era Legend]          📍 Event markers                   │   │
│  │     ■ Qin (red)           🔵 Territory boundaries            │   │
│  │     ■ Han (blue)                                             │   │
│  │     ■ Tang (gold)         [+] [-] [🏠] Zoom controls        │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     TIMELINE SLIDER                          │   │
│  │                                                              │   │
│  │  -500 ──────●━━━━━━━━━━━━━●────────────────────────── 2000  │   │
│  │            Selected: 221 BC - 220 AD                        │   │
│  │                                                              │   │
│  │  [秦] [汉]     [隋][唐]    [宋]  [元] [明]  [清]            │   │
│  │  ████  ████████  ██ █████  █████ ███  ████  ██████          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    EVENT SIDEBAR (when clicked)              │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │ 🖼️ [Image]                                          │    │   │
│  │  │                                                      │    │   │
│  │  │ **Unification of China**                            │    │   │
│  │  │ 秦统一中国                                           │    │   │
│  │  │                                                      │    │   │
│  │  │ 📅 221 BC                                           │    │   │
│  │  │ 📍 Xi'an, China                                     │    │   │
│  │  │ 🏷️ Political | Significance: ★★★★★★★★★★            │    │   │
│  │  │                                                      │    │   │
│  │  │ Qin Shi Huang unified China...                      │    │   │
│  │  │                                                      │    │   │
│  │  │ **Key Figures:**                                    │    │   │
│  │  │ 👤 Qin Shi Huang (秦始皇) - Emperor                 │    │   │
│  │  │                                                      │    │   │
│  │  │ **Related Events:**                                 │    │   │
│  │  │ • Great Wall Construction                           │    │   │
│  │  │ • Burning of Books                                  │    │   │
│  │  │                                                      │    │   │
│  │  │ [📖 Read More] [📤 Share]                           │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 User Interactions & Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTIONS                             │
└──────────────────────────────────────────────────────────────────────┘

1. PAGE LOAD
   User opens page
        │
        ▼
   ┌─────────────────────────────────────────┐
   │ GET /api/eras                           │ → Load all eras for legend
   │ GET /api/events?startYear=-500&         │ → Load initial events
   │     endYear=500&significance=5          │   (only significant ones)
   │ GET /api/territories?year=0             │ → Load territory boundaries
   └─────────────────────────────────────────┘
        │
        ▼
   Map displays markers + territories

────────────────────────────────────────────────────────────────────────

2. DRAG TIMELINE SLIDER
   User drags to year 755 AD
        │
        ▼
   ┌─────────────────────────────────────────┐
   │ GET /api/events?startYear=700&          │ → Events for new range
   │     endYear=800&bounds=...              │
   │ GET /api/territories?year=755           │ → Territory at 755 AD
   └─────────────────────────────────────────┘
        │
        ▼
   Map updates markers + territory polygons
   
────────────────────────────────────────────────────────────────────────

3. CLICK EVENT MARKER
   User clicks on "An Lushan Rebellion" marker
        │
        ▼
   ┌─────────────────────────────────────────┐
   │ GET /api/events/{id}                    │ → Full event details
   └─────────────────────────────────────────┘
        │
        ▼
   Sidebar opens with event details
   
────────────────────────────────────────────────────────────────────────

4. CLICK HISTORICAL FIGURE
   User clicks on "Emperor Taizong"
        │
        ▼
   ┌─────────────────────────────────────────┐
   │ GET /api/figures/{id}                   │ → Figure details + events
   └─────────────────────────────────────────┘
        │
        ▼
   Map highlights all events involving this figure
   
────────────────────────────────────────────────────────────────────────

5. APPLY FILTERS
   User selects: Category = "War", Civilization = "Chinese"
        │
        ▼
   ┌─────────────────────────────────────────┐
   │ GET /api/events?category=war&           │
   │     civilization=chinese&               │
   │     startYear=...&endYear=...           │
   └─────────────────────────────────────────┘
        │
        ▼
   Map shows only war events in Chinese civilization

────────────────────────────────────────────────────────────────────────

6. PAN/ZOOM MAP
   User zooms into a specific region
        │
        ▼
   ┌─────────────────────────────────────────┐
   │ GET /api/events?bounds=30,100,35,110&   │ → Events in visible area
   │     startYear=...&endYear=...           │   (load more detail)
   └─────────────────────────────────────────┘
        │
        ▼
   Map shows more events in zoomed area
```

### 6.3 Data Shapes for UI Components

```typescript
// What the Timeline Slider needs
interface TimelineData {
  eras: {
    id: string;
    name: string;
    startYear: number;
    endYear: number;
    color: string;
  }[];
  selectedRange: {
    start: number;
    end: number;
  };
}

// What the Map needs for markers
interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category: EventCategory;
  significance: number;  // Determines marker size
  year: number;
  eraColor: string;
}

// What the Map needs for territories
interface TerritoryOverlay {
  id: string;
  name: string;
  geoJson: GeoJSON.Polygon;
  color: string;
  opacity: number;
}

// What the Event Sidebar needs
interface EventDetail {
  id: string;
  title: string;
  description: string;
  year: number;
  yearEnd?: number;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  category: string;
  significance: number;
  era: {
    name: string;
    color: string;
  };
  figures: {
    id: string;
    name: string;
    role: string;
    thumbnail?: string;
  }[];
  images: string[];
  relatedEvents: {
    id: string;
    title: string;
    year: number;
  }[];
  sources: {
    title: string;
    url: string;
  }[];
}
```

---

## 7. Performance Considerations

### 7.1 Data Loading Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PROGRESSIVE LOADING                              │
└─────────────────────────────────────────────────────────────────────┘

1. Initial Load (fast):
   - Load only high-significance events (★7+)
   - Load era metadata
   - Load territory for default year
   
2. On Zoom In:
   - Load more events in visible area
   - Lower significance threshold (★5+)
   
3. On Demand:
   - Full event details only when clicked
   - Figure details only when clicked

┌─────────────────────────────────────────────────────────────────────┐
│                         CACHING STRATEGY                             │
└─────────────────────────────────────────────────────────────────────┘

- Eras: Cache indefinitely (rarely change)
- Events list: Cache by year range + filters
- Event details: Cache by ID
- Territories: Cache by year
- Use React Query / SWR for client-side caching
```

### 7.2 Database Optimizations

```sql
-- Composite index for common queries
CREATE INDEX idx_events_year_category_significance 
ON events(start_year, category, significance DESC);

-- Spatial index if using PostGIS
CREATE INDEX idx_events_location 
ON events USING GIST(ST_MakePoint(longitude, latitude));

-- Materialized view for timeline summary
CREATE MATERIALIZED VIEW timeline_summary AS
SELECT 
    (start_year / 100) * 100 as century,
    category,
    civilization,
    COUNT(*) as event_count,
    AVG(significance) as avg_significance
FROM events e
JOIN eras er ON e.era_id = er.id
GROUP BY century, category, civilization;
```

---

## 8. Internationalization (i18n) Strategy

### 8.1 Decision: Backend-Resolved Language (Option A)

We use **backend-resolved language** for all API responses. This means:
- Frontend sends `?lang=zh` parameter with each request
- Backend returns **only the requested language** in response
- Switching language requires a new API call

**Why this approach:**
- ✅ Smaller payload (especially important as we scale to 10+ languages)
- ✅ Simpler frontend code (no language resolution logic)
- ✅ Easier to maintain and extend
- ✅ Better for SEO (single language per page)
- ⚠️ Trade-off: Requires API call when user switches language

### 8.2 Database Schema with JSONB Translations

Store translations in **JSONB columns** with a default fallback column:

```sql
-- Updated schema pattern for all tables with localized text
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Default language (English) - always required, used as fallback
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- All translations stored in JSONB
    title_i18n JSONB DEFAULT '{}',         -- {"zh": "秦统一中国", "ja": "秦の統一", ...}
    description_i18n JSONB DEFAULT '{}',
    
    -- Other fields remain the same
    start_year INT NOT NULL,
    end_year INT,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    category VARCHAR(50) NOT NULL,
    significance INT,
    era_id UUID REFERENCES eras(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Same pattern for eras
CREATE TABLE eras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,            -- English default
    name_i18n JSONB DEFAULT '{}',          -- {"zh": "秦朝", "ja": "秦王朝", ...}
    description TEXT,
    description_i18n JSONB DEFAULT '{}',
    -- ... other fields
);

-- Same pattern for historical_figures
CREATE TABLE historical_figures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,            -- English default
    name_i18n JSONB DEFAULT '{}',          -- {"zh": "秦始皇", "ja": "始皇帝", ...}
    biography TEXT,
    biography_i18n JSONB DEFAULT '{}',
    -- ... other fields
);
```

### 8.3 Supported Languages Table

```sql
-- Track which languages are available
CREATE TABLE supported_languages (
    code VARCHAR(10) PRIMARY KEY,      -- 'en', 'zh', 'ja', 'ru', 'ko'
    name_native VARCHAR(100) NOT NULL, -- '中文', '日本語', 'English'
    name_en VARCHAR(100) NOT NULL,     -- 'Chinese', 'Japanese', 'English'
    is_rtl BOOLEAN DEFAULT FALSE,      -- Right-to-left (for Arabic, Hebrew)
    is_active BOOLEAN DEFAULT TRUE,    -- Can disable languages
    sort_order INT DEFAULT 0
);

INSERT INTO supported_languages (code, name_native, name_en, sort_order) VALUES
('en', 'English', 'English', 1),
('zh', '中文', 'Chinese (Simplified)', 2),
('zh-tw', '繁體中文', 'Chinese (Traditional)', 3),
('ja', '日本語', 'Japanese', 4),
('ko', '한국어', 'Korean', 5);
```

### 8.4 PostgreSQL Helper Function

```sql
-- Function to get localized text with fallback to English
CREATE OR REPLACE FUNCTION get_localized(
    default_text TEXT,
    translations JSONB,
    lang VARCHAR(10)
) RETURNS TEXT AS $$
BEGIN
    -- If requesting English or translation doesn't exist, return default
    IF lang = 'en' OR NOT (translations ? lang) THEN
        RETURN default_text;
    END IF;
    
    -- Return the translation
    RETURN translations ->> lang;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Usage in queries:
SELECT 
    id,
    get_localized(title, title_i18n, 'zh') as title,
    get_localized(description, description_i18n, 'zh') as description,
    start_year
FROM events
WHERE start_year = -221;
```

### 8.5 API with Language Parameter

All endpoints accept `?lang=` parameter:

```
GET /api/events?startYear=-500&endYear=500&lang=zh
GET /api/events/{id}?lang=zh
GET /api/eras?lang=zh
GET /api/figures/{id}?lang=zh
```

**Response example** (with `?lang=zh`):
```json
{
  "id": "...",
  "title": "秦统一中国",
  "description": "秦始皇统一六国，结束战国时代",
  "startYear": -221,
  "category": "Political",
  "significance": 10
}
```

**Response example** (with `?lang=en` or no lang param):
```json
{
  "id": "...",
  "title": "Unification of China",
  "description": "Qin Shi Huang unified China, ending the Warring States period",
  "startYear": -221,
  "category": "Political",
  "significance": 10
}
```

### 8.6 Frontend Language Handling

```typescript
// Language context
const [lang, setLang] = useState<string>('en');

// API calls include language
const fetchEvents = async (startYear: number, endYear: number) => {
  const response = await fetch(
    `/api/events?startYear=${startYear}&endYear=${endYear}&lang=${lang}`
  );
  return response.json();
};

// When user switches language, refetch data
const handleLanguageChange = (newLang: string) => {
  setLang(newLang);
  // React Query will automatically refetch with new lang param
  queryClient.invalidateQueries(['events']);
  queryClient.invalidateQueries(['eras']);
};
```

### 8.7 Adding a New Language

To add a new language (e.g., Russian):

1. **Add to supported_languages table:**
```sql
INSERT INTO supported_languages (code, name_native, name_en, sort_order) 
VALUES ('ru', 'Русский', 'Russian', 6);
```

2. **Add translations to existing data:**
```sql
UPDATE events 
SET title_i18n = title_i18n || '{"ru": "Объединение Китая"}'
WHERE title = 'Unification of China';
```

3. **No code changes required!** Frontend will show the new language option automatically.

---

## 9. Extended Model: Granular Military History (战国七雄 Example)

For detailed periods like the **Warring States (战国时代 475-221 BC)** and **Qin's Unification**, we need additional domain concepts beyond simple "Events".

### 9.1 Additional Aggregates for Military History

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STATE AGGREGATE                              │
│  (For Warring States: 秦、楚、齐、燕、赵、魏、韩)                      │
│                                                                      │
│  State                                                               │
│  ├── Id: Guid                                                        │
│  ├── Name: LocalizedString (秦国 / State of Qin)                     │
│  ├── Capital: Location                                               │
│  ├── DateRange: HistoricalDate (existence period)                   │
│  ├── Strengths: List<string> (agriculture, military, etc.)          │
│  ├── Weaknesses: List<string>                                        │
│  ├── Rulers: List<Ruler> (ordered by reign)                         │
│  └── Color: string (for map display)                                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         BATTLE AGGREGATE                             │
│  (Detailed military engagements)                                     │
│                                                                      │
│  Battle                                                              │
│  ├── Id: Guid                                                        │
│  ├── Name: LocalizedString (长平之战 / Battle of Changping)          │
│  ├── Date: HistoricalDate                                           │
│  ├── Location: GeoPoint                                              │
│  ├── BattleType: enum (Siege, Field, Naval, Ambush)                 │
│  ├── Belligerents: List<BattleSide>                                 │
│  │   └── BattleSide                                                  │
│  │       ├── State: State                                            │
│  │       ├── Commanders: List<HistoricalFigure>                     │
│  │       ├── TroopCount: int?                                        │
│  │       ├── Casualties: int?                                        │
│  │       └── IsVictor: bool                                          │
│  ├── Tactics: List<Tactic>                                          │
│  ├── Outcome: LocalizedString                                        │
│  ├── Significance: int (1-10)                                        │
│  ├── CampaignId: Guid? (part of larger campaign)                    │
│  └── Consequences: List<string>                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        CAMPAIGN AGGREGATE                            │
│  (Series of related battles with strategic objective)                │
│                                                                      │
│  Campaign                                                            │
│  ├── Id: Guid                                                        │
│  ├── Name: LocalizedString (灭楚之战 / Conquest of Chu)              │
│  ├── DateRange: HistoricalDate                                       │
│  ├── Objective: LocalizedString                                      │
│  ├── Initiator: State                                                │
│  ├── Target: State                                                   │
│  ├── LeadCommander: HistoricalFigure                                │
│  ├── Battles: List<Battle> (ordered chronologically)                │
│  ├── Outcome: CampaignOutcome (Victory, Defeat, Stalemate)          │
│  └── TerritoryGained: GeoPolygon?                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         POLICY AGGREGATE                             │
│  (Reforms that shaped state power)                                   │
│                                                                      │
│  Policy                                                              │
│  ├── Id: Guid                                                        │
│  ├── Name: LocalizedString (商鞅变法 / Shang Yang Reforms)           │
│  ├── DateRange: HistoricalDate                                       │
│  ├── Architect: HistoricalFigure                                    │
│  ├── Sponsor: HistoricalFigure (ruler who approved)                 │
│  ├── State: State                                                    │
│  ├── Category: PolicyCategory                                        │
│  ├── Measures: List<PolicyMeasure>                                  │
│  │   └── PolicyMeasure                                               │
│  │       ├── Title: LocalizedString                                  │
│  │       ├── Description: LocalizedString                            │
│  │       └── Impact: LocalizedString                                 │
│  ├── Effects: List<string> (short-term results)                     │
│  ├── LegacyImpact: LocalizedString (long-term significance)         │
│  └── Significance: int (1-10)                                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    MILITARY SYSTEM AGGREGATE                         │
│  (Army organization, training, tactics)                              │
│                                                                      │
│  MilitarySystem                                                      │
│  ├── Id: Guid                                                        │
│  ├── State: State                                                    │
│  ├── Era: Era                                                        │
│  ├── Organization: ArmyOrganization                                 │
│  │   ├── Units: List<MilitaryUnit>                                   │
│  │   │   └── MilitaryUnit                                            │
│  │   │       ├── Name: LocalizedString (什/伍/卒)                    │
│  │   │       ├── Size: int                                           │
│  │   │       ├── Type: UnitType (Infantry, Cavalry, Chariot, Archer)│
│  │   │       └── Equipment: List<string>                             │
│  │   └── CommandStructure: List<Rank>                               │
│  ├── TrainingMethods: List<TrainingMethod>                          │
│  │   └── TrainingMethod                                              │
│  │       ├── Name: LocalizedString                                   │
│  │       ├── Description: LocalizedString                            │
│  │       └── Purpose: string                                         │
│  ├── Tactics: List<Tactic>                                          │
│  │   └── Tactic                                                      │
│  │       ├── Name: LocalizedString                                   │
│  │       ├── Description: LocalizedString                            │
│  │       ├── Conditions: string (when to use)                        │
│  │       └── FamousBattles: List<Battle>                            │
│  ├── Strengths: List<string>                                         │
│  └── Weaknesses: List<string>                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Enums for Military Domain

```csharp
public enum PolicyCategory
{
    Military,       // 军事改革
    Economic,       // 经济改革
    Agricultural,   // 农业改革
    Legal,          // 法律改革
    Administrative, // 行政改革
    Social,         // 社会改革
    Educational     // 教育改革
}

public enum BattleType
{
    FieldBattle,    // 野战
    Siege,          // 攻城战
    Ambush,         // 伏击
    Naval,          // 水战
    DefensiveSiege, // 守城战
    Encirclement    // 包围战
}

public enum UnitType
{
    Infantry,       // 步兵
    Cavalry,        // 骑兵
    Chariot,        // 战车
    Archer,         // 弓箭手
    Crossbowman,    // 弩手
    Engineer,       // 工兵
    Navy            // 水军
}

public enum MilitaryRank
{
    // Qin ranks (20-rank system 二十等爵)
    GongShi,        // 公士 (rank 1)
    ShangZao,       // 上造 (rank 2)
    // ... more ranks
    DaLiangZao,     // 大良造 (rank 16)
    Marquis,        // 侯 (rank 17+)
}
```

### 9.3 Extended Database Schema

```sql
-- States (Warring States period kingdoms)
CREATE TABLE states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(200) NOT NULL,
    name_zh VARCHAR(200) NOT NULL,
    capital_name_en VARCHAR(200),
    capital_name_zh VARCHAR(200),
    capital_lat DECIMAL(10, 7),
    capital_lng DECIMAL(10, 7),
    start_year INT NOT NULL,
    end_year INT,
    color VARCHAR(7),
    description_en TEXT,
    description_zh TEXT,
    strengths TEXT[],
    weaknesses TEXT[]
);

-- Battles
CREATE TABLE battles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(300) NOT NULL,
    name_zh VARCHAR(300) NOT NULL,
    year INT NOT NULL,
    month INT,
    day INT,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    battle_type VARCHAR(50) NOT NULL,
    description_en TEXT,
    description_zh TEXT,
    outcome_en TEXT,
    outcome_zh TEXT,
    significance INT CHECK (significance BETWEEN 1 AND 10),
    campaign_id UUID REFERENCES campaigns(id),
    era_id UUID REFERENCES eras(id)
);

-- Battle participants (which side, commanders, troops)
CREATE TABLE battle_sides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
    state_id UUID REFERENCES states(id),
    is_victor BOOLEAN,
    troop_count INT,
    casualties INT,
    notes TEXT
);

-- Commanders in battles
CREATE TABLE battle_commanders (
    battle_side_id UUID REFERENCES battle_sides(id) ON DELETE CASCADE,
    figure_id UUID REFERENCES historical_figures(id),
    role VARCHAR(100),  -- e.g., "主帅", "副将", "先锋"
    PRIMARY KEY (battle_side_id, figure_id)
);

-- Campaigns (series of battles)
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(300) NOT NULL,
    name_zh VARCHAR(300) NOT NULL,
    start_year INT NOT NULL,
    end_year INT,
    objective_en TEXT,
    objective_zh TEXT,
    initiator_state_id UUID REFERENCES states(id),
    target_state_id UUID REFERENCES states(id),
    lead_commander_id UUID REFERENCES historical_figures(id),
    outcome VARCHAR(50),  -- Victory, Defeat, Stalemate
    significance INT
);

-- Policies / Reforms
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(300) NOT NULL,
    name_zh VARCHAR(300) NOT NULL,
    start_year INT NOT NULL,
    end_year INT,
    category VARCHAR(50) NOT NULL,
    state_id UUID REFERENCES states(id),
    architect_id UUID REFERENCES historical_figures(id),
    sponsor_id UUID REFERENCES historical_figures(id),
    description_en TEXT,
    description_zh TEXT,
    legacy_impact_en TEXT,
    legacy_impact_zh TEXT,
    significance INT
);

-- Policy measures (individual reforms within a policy)
CREATE TABLE policy_measures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
    title_en VARCHAR(300),
    title_zh VARCHAR(300),
    description_en TEXT,
    description_zh TEXT,
    impact_en TEXT,
    impact_zh TEXT,
    order_index INT
);

-- Military systems
CREATE TABLE military_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID REFERENCES states(id),
    era_id UUID REFERENCES eras(id),
    name_en VARCHAR(200),
    name_zh VARCHAR(200),
    description_en TEXT,
    description_zh TEXT,
    strengths TEXT[],
    weaknesses TEXT[]
);

-- Military units
CREATE TABLE military_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    military_system_id UUID REFERENCES military_systems(id) ON DELETE CASCADE,
    name_en VARCHAR(200),
    name_zh VARCHAR(200),
    unit_type VARCHAR(50),
    size INT,
    equipment TEXT[],
    description_en TEXT,
    description_zh TEXT
);

-- Tactics
CREATE TABLE tactics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(200),
    name_zh VARCHAR(200),
    description_en TEXT,
    description_zh TEXT,
    conditions TEXT,  -- When to use
    military_system_id UUID REFERENCES military_systems(id)
);

-- Link tactics to battles where they were used
CREATE TABLE battle_tactics (
    battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
    tactic_id UUID REFERENCES tactics(id),
    side VARCHAR(50),  -- Which side used it
    effectiveness TEXT,
    PRIMARY KEY (battle_id, tactic_id)
);
```

### 9.4 Sample Data: 秦统一战国七雄

```sql
-- Insert the Seven Warring States
INSERT INTO states (name_en, name_zh, start_year, end_year, color, strengths, weaknesses) VALUES
('State of Qin',  '秦国', -770, -221, '#8B0000', 
 ARRAY['Military reforms', 'Legalist governance', 'Agricultural productivity', 'Strategic location'],
 ARRAY['Viewed as barbaric by eastern states']),
('State of Chu',  '楚国', -1030, -223, '#228B22',
 ARRAY['Largest territory', 'Rich resources', 'Strong navy'],
 ARRAY['Decentralized nobility', 'Internal conflicts']),
('State of Qi',   '齐国', -1046, -221, '#4169E1',
 ARRAY['Wealthy from trade/salt', 'Cultural center', 'Diplomatic skill'],
 ARRAY['Weak military', 'Complacent']),
('State of Yan',  '燕国', -1046, -222, '#2F4F4F',
 ARRAY['Northern defenses', 'Horse breeding'],
 ARRAY['Remote location', 'Weak economy']),
('State of Zhao', '赵国', -403, -222, '#DC143C',
 ARRAY['Strong cavalry', 'Military talent'],
 ARRAY['Lost elite army at Changping']),
('State of Wei',  '魏国', -403, -225, '#9932CC',
 ARRAY['Central location', 'Early military reforms'],
 ARRAY['Surrounded by enemies', 'Lost talent to other states']),
('State of Han',  '韩国', -403, -230, '#FF8C00',
 ARRAY['Weapon manufacturing', 'Strategic passes'],
 ARRAY['Smallest state', 'Squeezed between powers']);

-- Insert key historical figures
INSERT INTO historical_figures (name_en, name_zh, birth_year, death_year, biography_en, biography_zh) VALUES
('Shang Yang', '商鞅', -390, -338,
 'Legalist reformer who transformed Qin into a military powerhouse through radical reforms',
 '法家改革家，通过变法使秦国成为军事强国'),
('Bai Qi', '白起', -332, -257,
 'Greatest general of Qin, never lost a battle, killed over 1 million enemy soldiers',
 '秦国名将，战神，一生未尝败绩，歼敌百万'),
('Wang Jian', '王翦', -285, -210,
 'Veteran general who conquered Chu with 600,000 troops, cautious and strategic',
 '秦国老将，率六十万大军灭楚，用兵谨慎'),
('Li Mu', '李牧', NULL, -229,
 'Zhao general who defeated Qin multiple times, killed by his own king due to Qin schemes',
 '赵国名将，多次击败秦军，后被赵王中反间计杀害'),
('King Zhaoxiang of Qin', '秦昭襄王', -325, -251,
 'Longest-reigning Qin king, expanded territory significantly, grandfather of Qin Shi Huang',
 '秦国在位最长的君主，大幅扩张领土，秦始皇曾祖父'),
('Qin Shi Huang', '秦始皇', -259, -210,
 'First Emperor of unified China, completed the conquest of all six states',
 '中国第一位皇帝，完成统一六国大业'),
('Lian Po', '廉颇', -327, -243,
 'Famous Zhao general known for defensive warfare, later forced into exile',
 '赵国名将，善于防守，后被迫流亡'),
('Fan Ju', '范雎', NULL, -255,
 'Qin strategist who proposed "befriend distant states, attack nearby" policy',
 '秦国谋士，提出"远交近攻"战略');

-- Insert Shang Yang Reforms (商鞅变法)
INSERT INTO policies (name_en, name_zh, start_year, end_year, category, description_en, description_zh, significance) VALUES
('Shang Yang Reforms', '商鞅变法', -356, -338, 'Comprehensive',
 'Radical legalist reforms that transformed Qin from a backward state into the most powerful kingdom',
 '彻底的法家改革，使秦国从落后国家变成最强大的诸侯国', 10);

-- Insert reform measures
INSERT INTO policy_measures (policy_id, title_en, title_zh, description_en, description_zh, impact_en, impact_zh, order_index) VALUES
((SELECT id FROM policies WHERE name_zh = '商鞅变法'), 
 'Military Merit System', '军功爵制',
 'Nobility titles awarded based on military achievements (enemy heads), not birth',
 '按军功（敌人首级）授予爵位，而非出身',
 'Created highly motivated army; soldiers fought fiercely for advancement',
 '造就了极具战斗力的军队，士兵为升爵而奋勇杀敌', 1),

((SELECT id FROM policies WHERE name_zh = '商鞅变法'),
 'Abolition of Aristocratic Privileges', '废除世卿世禄',
 'Stripped hereditary nobles of automatic privileges and land',
 '废除贵族的世袭特权和封地',
 'Centralized power in the king; reduced internal resistance',
 '将权力集中于君主，减少内部阻力', 2),

((SELECT id FROM policies WHERE name_zh = '商鞅变法'),
 'Household Registration System', '什伍连坐制',
 'Organized population into groups of 5 and 10 households with mutual responsibility',
 '将人口编为五家、十家的组织，实行连坐',
 'Tight social control; efficient taxation and conscription',
 '严密的社会控制；高效的税收和征兵', 3),

((SELECT id FROM policies WHERE name_zh = '商鞅变法'),
 'Land Reform', '废井田、开阡陌',
 'Abolished well-field system, allowed private land ownership and sale',
 '废除井田制，允许土地私有和买卖',
 'Increased agricultural productivity; enriched state treasury',
 '提高农业产量；充实国库', 4),

((SELECT id FROM policies WHERE name_zh = '商鞅变法'),
 'Standardization', '统一度量衡',
 'Standardized weights, measures, and later writing',
 '统一度量衡，后来统一文字',
 'Facilitated trade and administration',
 '促进贸易和行政管理', 5),

((SELECT id FROM policies WHERE name_zh = '商鞅变法'),
 'Harsh Punishments', '严刑峻法',
 'Severe and consistent punishments for all, regardless of status',
 '对所有人实行严厉且一致的惩罚，不论身份',
 'Deterred crime; ensured compliance with laws',
 '威慑犯罪；确保法律得到遵守', 6);

-- Insert Qin Military System
INSERT INTO military_systems (state_id, name_en, name_zh, description_en, description_zh, strengths, weaknesses) VALUES
((SELECT id FROM states WHERE name_zh = '秦国'),
 'Qin Military System', '秦军制度',
 'Highly organized professional army with standardized equipment and merit-based promotion',
 '组织严密的职业军队，装备标准化，军功晋升制',
 ARRAY['Standardized weapons', 'Merit-based ranks', 'Strict discipline', 'Crossbow technology', 'Infantry + cavalry coordination'],
 ARRAY['Relied on constant warfare', 'Harsh on soldiers']);

-- Insert military units
INSERT INTO military_units (military_system_id, name_en, name_zh, unit_type, size, equipment, description_en, description_zh) VALUES
((SELECT id FROM military_systems WHERE name_zh = '秦军制度'),
 'Wu (Squad)', '伍', 'Infantry', 5, ARRAY['Spear', 'Shield', 'Short sword'],
 'Basic unit of 5 soldiers', '五人小队，最基本作战单位'),

((SELECT id FROM military_systems WHERE name_zh = '秦军制度'),
 'Shi (Section)', '什', 'Infantry', 10, ARRAY['Mixed weapons'],
 'Two Wu forming a section', '两伍组成一什'),

((SELECT id FROM military_systems WHERE name_zh = '秦军制度'),
 'Crossbow Corps', '弩兵', 'Crossbowman', 100, ARRAY['Crossbow', 'Bolts', 'Short sword'],
 'Devastating ranged units with mass-produced crossbows', '装备批量生产弩机的远程部队，杀伤力巨大'),

((SELECT id FROM military_systems WHERE name_zh = '秦军制度'),
 'Cavalry', '骑兵', 'Cavalry', 100, ARRAY['Lance', 'Bow', 'Armor'],
 'Mobile strike force for flanking and pursuit', '机动打击力量，用于侧翼包抄和追击');

-- Insert major battles
INSERT INTO battles (name_en, name_zh, year, latitude, longitude, battle_type, significance, description_en, description_zh) VALUES
('Battle of Changping', '长平之战', -260, 35.77, 112.83, 'Encirclement', 10,
 'Largest battle of Warring States. Qin general Bai Qi annihilated 450,000 Zhao soldiers',
 '战国最大规模战役。秦将白起坑杀赵军四十五万'),

('Battle of Yique', '伊阙之战', -293, 34.62, 112.45, 'FieldBattle', 9,
 'Bai Qi defeated combined Han-Wei army, killing 240,000',
 '白起大败韩魏联军，斩首二十四万'),

('Conquest of Chu', '灭楚之战', -224, 30.58, 114.30, 'FieldBattle', 9,
 'Wang Jian led 600,000 troops to conquer Chu, the largest state',
 '王翦率六十万大军灭楚，楚国是最大的诸侯国');

-- Insert campaigns
INSERT INTO campaigns (name_en, name_zh, start_year, end_year, objective_en, objective_zh, outcome, significance) VALUES
('Qin Unification Wars', '秦灭六国之战', -230, -221, 
 'Complete conquest of all six remaining states to unify China',
 '征服其余六国，统一中国',
 'Victory', 10);

-- Insert "Far-Near" diplomatic strategy
INSERT INTO policies (name_en, name_zh, start_year, category, description_en, description_zh, significance) VALUES
('Befriend Distant States, Attack Nearby', '远交近攻', -270, 'Diplomatic',
 'Strategic policy to ally with distant states (Qi, Yan) while conquering nearby states (Han, Wei, Zhao)',
 '与远方国家（齐、燕）结盟，同时攻打邻近国家（韩、魏、赵）的战略',
 9);
```

### 9.5 Extended API Endpoints

```
# States
GET  /api/states
     ?era=warring-states                   # Filter by era
     &year=-300                            # States existing at year
GET  /api/states/{id}                      # State details with rulers, policies

# Battles
GET  /api/battles
     ?startYear=-300&endYear=-200          # Filter by year range
     &state=qin                            # Battles involving state
     &commander={figureId}                 # Battles by commander
     &type=siege                           # Filter by battle type
GET  /api/battles/{id}                     # Full battle details

# Campaigns
GET  /api/campaigns
     ?state=qin                            # Campaigns by state
GET  /api/campaigns/{id}                   # Campaign with all battles

# Policies
GET  /api/policies
     ?state=qin                            # Policies by state
     &category=military                    # Filter by category
GET  /api/policies/{id}                    # Policy with all measures

# Military Systems
GET  /api/military-systems
     ?state=qin
GET  /api/military-systems/{id}            # Full system with units, tactics
```

### 9.6 UI for Detailed Military History

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WARRING STATES VIEW                              │
│  [Map showing 7 states with territories]                            │
│                                                                     │
│   ┌─────┐    ┌─────┐                                               │
│   │ 燕  │    │ 齐  │         Legend:                               │
│   └──┬──┘    └──┬──┘         ⚔️ Battle                             │
│      │ ┌─────┐ │             📜 Policy/Reform                       │
│   ┌──┴─┤ 赵  ├─┴──┐          👑 Ruler Change                        │
│   │    └──┬──┘    │          ⭐ Major Event                         │
│   │ ┌────┼────┐   │                                                │
│   │ │ 魏 │ 韩 │   │                                                │
│   │ └────┴────┘   │                                                │
│ ┌─┴─┐         ┌───┴───┐                                            │
│ │秦 │         │  楚   │                                            │
│ └───┘         └───────┘                                            │
│                                                                     │
│  Timeline: -400 ════╪════════════════════════════════ -221        │
│                   -356: 商鞅变法                                    │
│                        -260: 长平之战 ⚔️                           │
│                             -230: 灭韩                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  BATTLE DETAIL: 长平之战 (Battle of Changping)                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  📅 260 BC                          🗺️ [Mini battle map]           │
│  📍 Changping, Shanxi                                              │
│  ⚔️ Type: Encirclement                                             │
│  ⭐ Significance: ★★★★★★★★★★                                       │
│                                                                     │
│  ┌─────────────────┐  VS  ┌─────────────────┐                      │
│  │ 秦国 (QIN)      │      │ 赵国 (ZHAO)     │                      │
│  │ 👤 白起 (Bai Qi)│      │ 👤 赵括         │                      │
│  │ 🎖️ 主帅        │      │ 🎖️ 主帅        │                      │
│  │ 💪 ~550,000    │      │ 💪 ~450,000    │                      │
│  │ ☠️ ~25,000     │      │ ☠️ 450,000     │                      │
│  │ 🏆 VICTOR      │      │                 │                      │
│  └─────────────────┘      └─────────────────┘                      │
│                                                                     │
│  📖 Description:                                                    │
│  The largest battle of the Warring States period. Bai Qi trapped   │
│  the Zhao army by feigning retreat, then encircled them. After 46  │
│  days of siege, 450,000 Zhao soldiers surrendered and were buried  │
│  alive to prevent future rebellion.                                │
│                                                                     │
│  🎯 Tactics Used:                                                   │
│  • Feigned Retreat (诱敌深入)                                       │
│  • Encirclement (包围)                                              │
│  • Supply Line Cut (断粮道)                                         │
│                                                                     │
│  📚 Consequences:                                                   │
│  • Zhao lost entire military generation                            │
│  • Qin became unchallenged superpower                              │
│  • Accelerated unification                                          │
│                                                                     │
│  🔗 Related:                                                        │
│  • [赵括 - Paper General] • [白起 - The Human Butcher]             │
│  • [长平之战前因] • [秦灭赵之战]                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  POLICY DETAIL: 商鞅变法 (Shang Yang Reforms)                       │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  📅 356-338 BC                                                      │
│  👤 Architect: 商鞅 (Shang Yang)                                   │
│  👑 Sponsor: 秦孝公 (Duke Xiao of Qin)                              │
│  🏛️ State: 秦国                                                    │
│  📂 Category: Comprehensive Reform                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ WHY QIN BECAME POWERFUL 秦国为何强大                         │   │
│  │                                                              │   │
│  │ 1️⃣ 军功爵制 (Military Merit System)                         │   │
│  │    └─ Kill enemies → Get noble rank → Get land              │   │
│  │    └─ Result: Soldiers fight like wolves                    │   │
│  │                                                              │   │
│  │ 2️⃣ 废除世卿世禄 (Abolish Hereditary Nobility)               │   │
│  │    └─ No free ride for nobles                               │   │
│  │    └─ Result: Power centralized to king                     │   │
│  │                                                              │   │
│  │ 3️⃣ 什伍连坐 (Mutual Responsibility System)                  │   │
│  │    └─ Neighbors report each other or all punished           │   │
│  │    └─ Result: Tight social control, efficient conscription  │   │
│  │                                                              │   │
│  │ 4️⃣ 废井田、开阡陌 (Land Privatization)                       │   │
│  │    └─ Anyone can own and sell land                          │   │
│  │    └─ Result: Agricultural boom, more taxes                 │   │
│  │                                                              │   │
│  │ 5️⃣ 严刑峻法 (Harsh Laws)                                    │   │
│  │    └─ Same punishment for noble and peasant                 │   │
│  │    └─ Result: Order and compliance                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  📈 Long-term Impact:                                               │
│  Transformed Qin from backward western state to the superpower     │
│  that would unify China 135 years later.                           │
│                                                                     │
│  ⚠️ Cost:                                                          │
│  Shang Yang himself was executed by being torn apart by chariots   │
│  when his patron Duke Xiao died.                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.7 Data Relationships Diagram

```
                              ┌─────────────┐
                              │    ERA      │
                              │ (战国时代)   │
                              └──────┬──────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
           ▼                         ▼                         ▼
    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
    │   STATES    │          │   EVENTS    │          │  POLICIES   │
    │ (秦楚齐...)  │          │  (General)  │          │ (商鞅变法)  │
    └──────┬──────┘          └─────────────┘          └──────┬──────┘
           │                                                  │
    ┌──────┴──────┐                                          │
    │             │                                          │
    ▼             ▼                                          ▼
┌────────┐  ┌──────────┐                            ┌──────────────┐
│MILITARY│  │ RULERS   │                            │   MEASURES   │
│ SYSTEM │  │(秦孝公等) │                            │ (军功爵制等) │
└────┬───┘  └────┬─────┘                            └──────────────┘
     │           │
     │    ┌──────┴───────────────────┐
     │    │                          │
     ▼    ▼                          ▼
┌────────────┐               ┌─────────────┐
│  TACTICS   │               │  CAMPAIGNS  │
│  (战术)    │               │ (灭六国之战) │
└─────┬──────┘               └──────┬──────┘
      │                             │
      │      ┌──────────────────────┘
      │      │
      ▼      ▼
   ┌─────────────┐
   │   BATTLES   │──────► HISTORICAL FIGURES
   │ (长平之战)   │        (白起、王翦、李牧...)
   └─────────────┘
```

---

## 10. Next Steps

### Phase 1: MVP (China History Focus)
- [ ] Set up PostgreSQL database with i18n schema (JSONB translations)
- [ ] Create .NET 8 Web API project with EF Core
- [ ] Implement core entities: Era, Event, HistoricalFigure
- [ ] Seed Chinese dynasty data (Qin to Qing)
- [ ] Basic API endpoints with `?lang=` parameter
- [ ] React frontend with map (Leaflet/MapLibre)
- [ ] Timeline slider component
- [ ] Event detail sidebar

### Phase 2: Enhanced
- [ ] Territory boundaries (GeoJSON)
- [ ] Historical figures with relationships
- [ ] Search functionality
- [ ] Category filters
- [ ] Supported languages management

### Phase 3: Full Feature
- [ ] Cross-civilization interactions
- [ ] Compare timeline view
- [ ] User accounts
- [ ] Favorites/bookmarks
- [ ] Comments/contributions
- [ ] Additional languages (Japanese, Korean, etc.)

