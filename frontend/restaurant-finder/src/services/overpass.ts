import { PLACE_CATEGORIES } from '../types/placeCategories.ts'
import type { FoodPoi } from '../types/poi.ts'

const DEFAULT_INTERPRETER = 'https://overpass-api.de/api/interpreter'

function interpreterUrl(): string {
  return import.meta.env.VITE_OVERPASS_URL?.replace(/\/$/, '') || DEFAULT_INTERPRETER
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassJson {
  elements?: OverpassElement[]
}

const AMENITY_VALUES = PLACE_CATEGORIES.filter((c) => c.id.startsWith('amenity:')).map((c) =>
  c.id.slice('amenity:'.length)
)
const SHOP_VALUES = PLACE_CATEGORIES.filter((c) => c.id.startsWith('shop:')).map((c) =>
  c.id.slice('shop:'.length)
)

const AMENITY_REGEX = `^(${AMENITY_VALUES.join('|')})$`
const SHOP_REGEX = `^(${SHOP_VALUES.join('|')})$`

const ALLOWED_AMENITY = new Set(AMENITY_VALUES)
const ALLOWED_SHOP = new Set(SHOP_VALUES)

function elementToPoi(el: OverpassElement): FoodPoi | null {
  const tags = el.tags ?? {}
  const am = tags.amenity
  const sh = tags.shop
  const okAm = am != null && ALLOWED_AMENITY.has(am)
  const okSh = sh != null && ALLOWED_SHOP.has(sh)
  if (!okAm && !okSh) return null

  let lat: number | undefined
  let lon: number | undefined
  if (el.type === 'node' && el.lat != null && el.lon != null) {
    lat = el.lat
    lon = el.lon
  } else if (el.center) {
    lat = el.center.lat
    lon = el.center.lon
  }
  if (lat == null || lon == null) return null

  return {
    key: `${el.type}/${el.id}`,
    osmType: el.type,
    osmId: el.id,
    lat,
    lon,
    tags,
  }
}

export function buildAroundQuery(lat: number, lon: number, radiusM: number): string {
  const r = Math.min(Math.max(Math.round(radiusM), 100), 10_000)
  return `[out:json][timeout:25];
(
  node["amenity"~"${AMENITY_REGEX}"](around:${r},${lat},${lon});
  way["amenity"~"${AMENITY_REGEX}"](around:${r},${lat},${lon});
  node["shop"~"${SHOP_REGEX}"](around:${r},${lat},${lon});
  way["shop"~"${SHOP_REGEX}"](around:${r},${lat},${lon});
);
out center;`
}

export async function fetchFoodAround(
  lat: number,
  lon: number,
  radiusM: number
): Promise<FoodPoi[]> {
  const body = buildAroundQuery(lat, lon, radiusM)
  const res = await fetch(interpreterUrl(), {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
  })

  if (!res.ok) {
    throw new Error(`Overpass error ${res.status}`)
  }

  const json = (await res.json()) as OverpassJson
  const elements = json.elements ?? []
  const out: FoodPoi[] = []
  for (const el of elements) {
    const poi = elementToPoi(el)
    if (poi) out.push(poi)
  }
  return out
}
