/**
 * Display helpers for OSM tags returned by Overpass.
 * Only use what exists in tags — no inferred ratings or price bands.
 */

export interface CuisineGroup {
  label: string
  chips: readonly string[]
}

/** Grouped chips for the cuisine tag — easier to scan than one flat list */
export const CUISINE_GROUPS: CuisineGroup[] = [
  {
    label: 'Malaysia & Southeast Asia',
    chips: [
      'malaysian',
      'malay',
      'mamak',
      'nyonya',
      'peranakan',
      'singaporean',
      'indonesian',
      'thai',
      'vietnamese',
      'filipino',
    ],
  },
  {
    label: 'East Asian',
    chips: ['chinese', 'japanese', 'korean', 'taiwanese', 'hainanese'],
  },
  {
    label: 'South Asian & Middle Eastern',
    chips: ['indian', 'pakistani', 'bangladeshi', 'middle_eastern', 'arab', 'lebanese', 'turkish'],
  },
  {
    label: 'Western & fusion',
    chips: ['western', 'italian', 'french', 'american', 'fusion', 'steak_house', 'pizza'],
  },
  {
    label: 'Quick bites',
    chips: ['burger', 'sandwich', 'noodle', 'seafood', 'chicken', 'bbq'],
  },
]

const IMAGE_KEYS = [
  'image',
  'image:0',
  'image:1',
  'image:2',
  'photo',
  'photo:0',
  'photo:1',
] as const

export function imageUrlsFromTags(tags: Record<string, string>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const k of IMAGE_KEYS) {
    const v = tags[k]?.trim()
    if (v && /^https?:\/\//i.test(v)) {
      if (!seen.has(v)) {
        seen.add(v)
        out.push(v)
      }
    }
  }
  return out
}

/** First useful http(s) link from common OSM contact keys (not a “menu API”). */
export function externalUrlFromTags(tags: Record<string, string>): string | undefined {
  const candidates = [
    tags.website,
    tags['contact:website'],
    tags.url,
    tags['menu:url'],
    tags.menu,
    tags['contact:facebook'],
  ]
  for (const c of candidates) {
    const v = c?.trim()
    if (v && /^https?:\/\//i.test(v)) return v
  }
  return undefined
}

/** Raw price-related text when mappers added it (unstructured). */
export function formatPriceLine(tags: Record<string, string>): string | undefined {
  const p = tags.price ?? tags.charge ?? tags['price:range'] ?? tags.fee
  return p?.trim() || undefined
}

/** OSM stars tags (rare). */
export function starsFromTags(tags: Record<string, string>): number | undefined {
  const s = tags.stars ?? tags['rating:stars'] ?? tags['stars:hotel']
  if (!s) return undefined
  const n = parseInt(s, 10)
  if (n >= 1 && n <= 5) return n
  return undefined
}

export function phoneFromTags(tags: Record<string, string>): string | undefined {
  const p = tags.phone ?? tags['contact:phone'] ?? tags['phone:mobile']
  return p?.trim() || undefined
}

export function openingHoursFromTags(tags: Record<string, string>): string | undefined {
  const h = tags.opening_hours
  return h?.trim() || undefined
}
