// API Types - matches backend DTOs

export interface EraDto {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  civilization: string;
  color: string | null;
  eventCount: number;
}

export interface EraDetailDto extends EraDto {
  description: string | null;
  capitalLat: number | null;
  capitalLng: number | null;
  recentEvents: EventSummaryDto[];
}

export interface EventSummaryDto {
  id: string;
  title: string;
  year: number;
  lat: number;
  lng: number;
  category: string;
  significance: number;
  thumbnailUrl: string | null;
  eraName: string | null;
  eraColor: string | null;
}

export interface EventDetailDto {
  id: string;
  title: string;
  description: string | null;
  startYear: number;
  endYear: number | null;
  datePrecision: string;
  location: GeoPointDto;
  category: string;
  significance: number;
  imageUrl: string | null;
  sourceUrl: string | null;
  era: EraDto | null;
  figures: FigureSummaryDto[];
  tags: string[];
  relatedEvents: EventSummaryDto[];
}

export interface FigureSummaryDto {
  id: string;
  name: string;
  role: string | null;
  portraitUrl: string | null;
}

export interface FigureDetailDto {
  id: string;
  name: string;
  biography: string | null;
  birthYear: number | null;
  deathYear: number | null;
  birthPlace: GeoPointDto | null;
  portraitUrl: string | null;
  roles: FigureRoleDto[];
  events: EventSummaryDto[];
}

export interface FigureRoleDto {
  role: string;
  title: string | null;
  eraName: string | null;
}

export interface GeoPointDto {
  lat: number;
  lng: number;
}

export interface TerritoryDto {
  id: string;
  name: string;
  year: number;
  civilization: string;
  boundaries: string | null; // GeoJSON string
  color: string | null;
}

export interface LanguageDto {
  code: string;
  nameNative: string;
  nameEn: string;
  isRtl: boolean;
}

export interface TimelineResponse {
  eras: EraDto[];
  events: EventSummaryDto[];
}

// Enums
export type EventCategory =
  | 'War'
  | 'Political'
  | 'Cultural'
  | 'Scientific'
  | 'Religious'
  | 'Diplomatic'
  | 'Construction'
  | 'Economic'
  | 'Natural'
  | 'Migration';

export type Language = 'en' | 'zh' | 'zh-tw';

// App State Types
export interface AppFilters {
  categories: EventCategory[];
  civilization: string | null;
  minSignificance: number;
}

export interface YearRange {
  start: number;
  end: number;
}
