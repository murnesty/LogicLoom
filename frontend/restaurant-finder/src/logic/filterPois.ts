import type { FoodPoi } from '../types/poi.ts'
import { isFoodishTags, poiMatchesSelectedCategory } from '../types/placeCategories.ts'
import { externalUrlFromTags, imageUrlsFromTags } from '../utils/osmDisplay.ts'

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000
  const φ1 = (aLat * Math.PI) / 180
  const φ2 = (bLat * Math.PI) / 180
  const Δφ = ((bLat - aLat) * Math.PI) / 180
  const Δλ = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

function cuisineMatches(
  tags: Record<string, string>,
  needle: string,
  chips: Set<string>
): boolean {
  const cu = (tags.cuisine ?? '').toLowerCase()
  const parts = cu
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean)
  if (chips.size > 0) {
    const chipOk = [...chips].some((chip) =>
      parts.some((p) => p.includes(chip) || cu.includes(chip))
    )
    if (!chipOk) return false
  }
  if (needle.trim()) {
    const n = needle.trim().toLowerCase()
    if (!parts.some((x) => x.includes(n)) && !cu.includes(n)) return false
  }
  return true
}

export interface PoiFilterOptions {
  selectedCategoryIds: Set<string>
  cuisineNeedle: string
  selectedCuisineChips: Set<string>
  halalOnly: boolean
  centerLat: number
  centerLng: number
  radiusM: number
  requireImageUrl: boolean
  requireWebsite: boolean
}

export function filterPois(pois: FoodPoi[], o: PoiFilterOptions): FoodPoi[] {
  return pois.filter((p) => {
    if (!poiMatchesSelectedCategory(p.tags, o.selectedCategoryIds)) return false

    if (o.halalOnly) {
      if (isFoodishTags(p.tags) && p.tags['diet:halal'] !== 'yes') return false
    }

    if (isFoodishTags(p.tags)) {
      if (!cuisineMatches(p.tags, o.cuisineNeedle, o.selectedCuisineChips)) return false
    }

    if (o.requireImageUrl && imageUrlsFromTags(p.tags).length < 1) return false
    if (o.requireWebsite && !externalUrlFromTags(p.tags)) return false

    const d = distanceMeters(o.centerLat, o.centerLng, p.lat, p.lon)
    if (d > o.radiusM) return false
    return true
  })
}
