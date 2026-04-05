/**
 * OSM-backed place types we load via Overpass and show in filters.
 * IDs are `amenity:value` or `shop:value` to match tags.
 */

export type CategoryGroupId = 'food' | 'shopping'

export interface PlaceCategoryDef {
  id: string
  label: string
  group: CategoryGroupId
}

export const PLACE_CATEGORIES: PlaceCategoryDef[] = [
  // Food & drink
  { id: 'amenity:restaurant', label: 'Restaurant', group: 'food' },
  { id: 'amenity:cafe', label: 'Cafe', group: 'food' },
  { id: 'amenity:fast_food', label: 'Fast food', group: 'food' },
  { id: 'amenity:food_court', label: 'Food court', group: 'food' },
  { id: 'amenity:bar', label: 'Bar', group: 'food' },
  { id: 'amenity:pub', label: 'Pub', group: 'food' },
  { id: 'amenity:ice_cream', label: 'Ice cream', group: 'food' },
  { id: 'amenity:bakery', label: 'Bakery', group: 'food' },
  // Shopping & malls
  { id: 'amenity:shopping_centre', label: 'Shopping centre', group: 'shopping' },
  { id: 'amenity:marketplace', label: 'Marketplace', group: 'shopping' },
  { id: 'shop:mall', label: 'Mall', group: 'shopping' },
  { id: 'shop:department_store', label: 'Department store', group: 'shopping' },
  { id: 'shop:supermarket', label: 'Supermarket', group: 'shopping' },
]

const FOOD_AMENITY_VALUES = new Set(
  PLACE_CATEGORIES.filter((c) => c.group === 'food').map((c) => c.id.replace('amenity:', ''))
)

export function isFoodishTags(tags: Record<string, string>): boolean {
  const a = tags.amenity
  return a != null && FOOD_AMENITY_VALUES.has(a)
}

/** Default checked: common food + malls */
export const DEFAULT_CATEGORY_IDS = new Set<string>([
  'amenity:restaurant',
  'amenity:fast_food',
  'amenity:food_court',
  'shop:mall',
  'amenity:shopping_centre',
])

export function poiMatchesSelectedCategory(
  tags: Record<string, string>,
  selected: Set<string>
): boolean {
  if (selected.size === 0) return true
  const a = tags.amenity
  const s = tags.shop
  if (a && selected.has(`amenity:${a}`)) return true
  if (s && selected.has(`shop:${s}`)) return true
  return false
}

/** Map marker colour: food vs shopping vs other */
export function poiMarkerKind(tags: Record<string, string>): 'food' | 'shopping' {
  const a = tags.amenity ?? ''
  const s = tags.shop ?? ''
  if (a === 'shopping_centre' || a === 'marketplace' || s === 'mall' || s === 'department_store' || s === 'supermarket')
    return 'shopping'
  return 'food'
}
