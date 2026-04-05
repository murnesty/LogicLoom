export type OsmElementType = 'node' | 'way' | 'relation'

export interface FoodPoi {
  key: string
  osmType: OsmElementType
  osmId: number
  lat: number
  lon: number
  tags: Record<string, string>
}

/** Same amenity values as food rows in placeCategories.ts (for list summary only). */
const FOOD_AMENITY_VALUES = new Set<string>([
  'restaurant',
  'cafe',
  'fast_food',
  'food_court',
  'bar',
  'pub',
  'ice_cream',
  'bakery',
])

function isFoodishAmenity(tags: Record<string, string>): boolean {
  const a = tags.amenity
  return a != null && FOOD_AMENITY_VALUES.has(a)
}

export function poiDisplayName(tags: Record<string, string>): string {
  return tags.name || tags['name:en'] || tags['name:ms'] || 'Unnamed place'
}

/** One line for list: amenity / shop + optional cuisine */
export function poiTypeSummary(tags: Record<string, string>): string {
  const bits: string[] = []
  if (tags.amenity) bits.push(tags.amenity.replace(/_/g, ' '))
  if (tags.shop) bits.push(tags.shop.replace(/_/g, ' '))
  if (tags.cuisine && isFoodishAmenity(tags)) bits.push(tags.cuisine)
  return bits.join(' · ')
}
