import { PLACE_CATEGORIES } from '../types/placeCategories.ts'
import type { FoodPoi } from '../types/poi.ts'

/** Default instance — often busy; we fall back to sibling mirrors on 504/502/503. */
const DEFAULT_INTERPRETER = 'https://overpass-api.de/api/interpreter'

/** Same project, separate servers — use when the main gateway times out (very common). */
const DEFAULT_FALLBACK_INTERPRETERS = [
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
]

/**
 * Above this radius, one `around:` query is heavy and often 504s on public Overpass.
 * We run several smaller overlapping queries and merge (same total area, less work each).
 */
const SINGLE_QUERY_MAX_RADIUS_M = 1800

/** Radius for each sub-query when splitting (meters). */
const CHUNK_RADIUS_M = 1800

/** Max parallel sub-requests (stay polite to public servers). */
const CHUNK_PARALLEL = 3

/** Cap sub-centers so pathological radii do not spam Overpass. */
const MAX_SUB_CENTERS = 12

function interpreterUrls(): string[] {
  const primary =
    import.meta.env.VITE_OVERPASS_URL?.replace(/\/$/, '') || DEFAULT_INTERPRETER
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of [primary, ...DEFAULT_FALLBACK_INTERPRETERS]) {
    const u = raw.replace(/\/$/, '')
    if (!seen.has(u)) {
      seen.add(u)
      out.push(u)
    }
  }
  return out
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

export function buildAroundQuery(
  lat: number,
  lon: number,
  radiusM: number,
  timeoutSec: number
): string {
  const r = Math.min(Math.max(Math.round(radiusM), 100), 10_000)
  const t = Math.min(Math.max(Math.round(timeoutSec), 15), 180)
  return `[out:json][timeout:${t}];
(
  node["amenity"~"${AMENITY_REGEX}"](around:${r},${lat},${lon});
  way["amenity"~"${AMENITY_REGEX}"](around:${r},${lat},${lon});
  node["shop"~"${SHOP_REGEX}"](around:${r},${lat},${lon});
  way["shop"~"${SHOP_REGEX}"](around:${r},${lat},${lon});
);
out center;`
}

function haversineM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000
  const p1 = (aLat * Math.PI) / 180
  const p2 = (bLat * Math.PI) / 180
  const dP = ((bLat - aLat) * Math.PI) / 180
  const dL = ((bLon - aLon) * Math.PI) / 180
  const s =
    Math.sin(dP / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dL / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Move from (lat, lon) by `northM` and `eastM` in meters. */
function offsetByMeters(lat: number, lon: number, northM: number, eastM: number): [number, number] {
  const dLat = northM / 111_320
  const dLon = eastM / (111_320 * Math.cos((lat * Math.PI) / 180))
  return [lat + dLat, lon + dLon]
}

/**
 * Grid of sub-query centers whose CHUNK_RADIUS disks cover the user's disk (radiusM),
 * with overlap. Coarsens step if the grid would exceed MAX_SUB_CENTERS.
 */
function subCentersForDisk(lat: number, lon: number, radiusM: number): [number, number][] {
  if (radiusM <= CHUNK_RADIUS_M) {
    return [[lat, lon]]
  }

  let stepM = CHUNK_RADIUS_M * 0.55
  const limit = radiusM + CHUNK_RADIUS_M * 0.4

  for (let attempt = 0; attempt < 8; attempt++) {
    const n = Math.ceil((2 * limit) / stepM) + 1
    const centers: [number, number][] = []
    const seen = new Set<string>()

    for (let ix = -n; ix <= n; ix++) {
      for (let iy = -n; iy <= n; iy++) {
        const [clat, clon] = offsetByMeters(lat, lon, iy * stepM, ix * stepM)
        if (haversineM(lat, lon, clat, clon) > limit) continue
        const key = `${clat.toFixed(4)},${clon.toFixed(4)}`
        if (seen.has(key)) continue
        seen.add(key)
        centers.push([clat, clon])
      }
    }

    if (centers.length <= MAX_SUB_CENTERS) {
      return centers.length > 0 ? centers : [[lat, lon]]
    }
    stepM *= 1.35
  }

  return [[lat, lon]]
}

function shouldTryNextEndpoint(status: number): boolean {
  return status === 504 || status === 502 || status === 503 || status === 429
}

async function parsePoisFromResponse(res: Response): Promise<FoodPoi[]> {
  const json = (await res.json()) as OverpassJson
  const elements = json.elements ?? []
  const out: FoodPoi[] = []
  for (const el of elements) {
    const poi = elementToPoi(el)
    if (poi) out.push(poi)
  }
  return out
}

/** POST body to first mirror that succeeds. */
async function fetchPoisWithMirrors(body: string): Promise<FoodPoi[]> {
  const urls = interpreterUrls()
  let lastStatus = 0

  for (let i = 0; i < urls.length; i++) {
    const res = await fetch(urls[i]!, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
    })

    if (res.ok) {
      return parsePoisFromResponse(res)
    }

    lastStatus = res.status
    const canRetry = shouldTryNextEndpoint(res.status) && i < urls.length - 1
    if (canRetry) {
      continue
    }

    if (lastStatus === 504) {
      throw new Error(
        'OpenStreetMap servers timed out (504). Public Overpass is often overloaded — wait and retry, try a smaller radius, or set VITE_OVERPASS_URL to another mirror in .env.'
      )
    }
    throw new Error(`Overpass error ${lastStatus}`)
  }

  if (lastStatus === 504) {
    throw new Error(
      'OpenStreetMap servers timed out (504) on all mirrors tried. Wait and retry or reduce search radius.'
    )
  }
  throw new Error('Could not load places from OpenStreetMap.')
}

async function runBatched<T>(items: T[], batchSize: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await Promise.all(batch.map((item) => fn(item)))
  }
}

export async function fetchFoodAround(
  lat: number,
  lon: number,
  radiusM: number
): Promise<FoodPoi[]> {
  const R = Math.min(Math.max(Math.round(radiusM), 100), 10_000)

  if (R <= SINGLE_QUERY_MAX_RADIUS_M) {
    const body = buildAroundQuery(lat, lon, R, 40)
    return fetchPoisWithMirrors(body)
  }

  const centers = subCentersForDisk(lat, lon, R)
  const merged = new Map<string, FoodPoi>()

  await runBatched(centers, CHUNK_PARALLEL, async ([clat, clon]) => {
    const body = buildAroundQuery(clat, clon, CHUNK_RADIUS_M, 45)
    const pois = await fetchPoisWithMirrors(body)
    for (const p of pois) {
      if (haversineM(lat, lon, p.lat, p.lon) > R) continue
      merged.set(p.key, p)
    }
  })

  return [...merged.values()]
}
