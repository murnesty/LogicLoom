import { EraDto, EventSummaryDto, EventDetailDto, LanguageDto, FigureDetailDto } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function fetchLanguages(): Promise<LanguageDto[]> {
  const response = await fetch(`${API_URL}/api/languages`);
  if (!response.ok) throw new Error('Failed to fetch languages');
  return response.json();
}

export async function fetchEras(lang: string = 'en', civilization?: string): Promise<EraDto[]> {
  const params = new URLSearchParams({ lang });
  if (civilization) params.set('civilization', civilization);
  
  const response = await fetch(`${API_URL}/api/eras?${params}`);
  if (!response.ok) throw new Error('Failed to fetch eras');
  return response.json();
}

export async function fetchEvents(params: {
  lang?: string;
  startYear?: number;
  endYear?: number;
  category?: string;
  civilization?: string;
  significance?: number;
  limit?: number;
}): Promise<EventSummaryDto[]> {
  const searchParams = new URLSearchParams();
  
  if (params.lang) searchParams.set('lang', params.lang);
  if (params.startYear !== undefined) searchParams.set('startYear', params.startYear.toString());
  if (params.endYear !== undefined) searchParams.set('endYear', params.endYear.toString());
  if (params.category) searchParams.set('category', params.category);
  if (params.civilization) searchParams.set('civilization', params.civilization);
  if (params.significance) searchParams.set('significance', params.significance.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  
  const response = await fetch(`${API_URL}/api/events?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch events');
  return response.json();
}

export async function fetchEventDetail(id: string, lang: string = 'en'): Promise<EventDetailDto> {
  const response = await fetch(`${API_URL}/api/events/${id}?lang=${lang}`);
  if (!response.ok) throw new Error('Failed to fetch event detail');
  return response.json();
}

export async function fetchFigureDetail(id: string, lang: string = 'en'): Promise<FigureDetailDto> {
  const response = await fetch(`${API_URL}/api/figures/${id}?lang=${lang}`);
  if (!response.ok) throw new Error('Failed to fetch figure detail');
  return response.json();
}

export function formatYear(year: number): string {
  if (year < 0) {
    return `${Math.abs(year)} BC`;
  }
  return `${year} AD`;
}

export function formatYearZh(year: number): string {
  if (year < 0) {
    return `公元前${Math.abs(year)}年`;
  }
  return `公元${year}年`;
}
