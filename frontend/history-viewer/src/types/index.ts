// Types based on HistoryViewer-DDD.md

export interface LanguageDto {
  code: string;
  nameNative: string;
  nameEn: string;
  isRtl: boolean;
}

export interface EraDto {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  civilization: string;
  color: string;
  eventCount: number;
}

export interface EraDetailDto extends EraDto {
  description?: string;
  capitalLat?: number;
  capitalLng?: number;
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
  thumbnailUrl?: string;
  eraName?: string;
  eraColor?: string;
}

export interface GeoPointDto {
  lat: number;
  lng: number;
}

export interface FigureSummaryDto {
  id: string;
  name: string;
  role?: string;
  portraitUrl?: string;
}

export interface EventDetailDto {
  id: string;
  title: string;
  description?: string;
  startYear: number;
  endYear?: number;
  datePrecision?: string;
  location: GeoPointDto;
  category: string;
  significance: number;
  imageUrl?: string;
  sourceUrl?: string;
  era?: EraDto;
  figures: FigureSummaryDto[];
  tags: string[];
  relatedEvents: EventSummaryDto[];
}

export interface FigureRoleDto {
  role: string;
  title?: string;
  eraName?: string;
}

export interface FigureDetailDto {
  id: string;
  name: string;
  biography?: string;
  birthYear?: number;
  deathYear?: number;
  birthPlace?: GeoPointDto;
  portraitUrl?: string;
  roles: FigureRoleDto[];
  events: EventSummaryDto[];
}

export type EventCategory = 
  | 'War' 
  | 'Political' 
  | 'Cultural' 
  | 'Scientific' 
  | 'Religious' 
  | 'Economic' 
  | 'Natural' 
  | 'Migration' 
  | 'Construction' 
  | 'Diplomatic';

export const CATEGORY_ICONS: Record<string, string> = {
  War: '⚔️',
  Political: '👑',
  Cultural: '🎭',
  Scientific: '🔬',
  Religious: '⛩️',
  Economic: '💰',
  Natural: '🌋',
  Migration: '🚶',
  Construction: '🏛️',
  Diplomatic: '🤝',
};

export const CATEGORY_COLORS: Record<string, string> = {
  War: '#dc2626',
  Political: '#7c3aed',
  Cultural: '#db2777',
  Scientific: '#0891b2',
  Religious: '#ea580c',
  Economic: '#16a34a',
  Natural: '#65a30d',
  Migration: '#0284c7',
  Construction: '#a16207',
  Diplomatic: '#4f46e5',
};
