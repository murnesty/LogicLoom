const DEFAULT_BASE = 'https://nominatim.openstreetmap.org'

function baseUrl(): string {
  const u = import.meta.env.VITE_NOMINATIM_URL?.replace(/\/$/, '')
  return u || DEFAULT_BASE
}

export interface NominatimHit {
  lat: string
  lon: string
  display_name: string
}

/**
 * Forward geocode (user-triggered only — no autocomplete against public Nominatim).
 * Biases results to Malaysia via countrycodes=my.
 */
export async function searchMalaysia(query: string): Promise<NominatimHit[]> {
  const q = query.trim()
  if (!q) return []

  const url = new URL(`${baseUrl()}/search`)
  url.searchParams.set('format', 'json')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '5')
  url.searchParams.set('countrycodes', 'my')
  url.searchParams.set('addressdetails', '1')

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Nominatim error ${res.status}`)
  }

  const data = (await res.json()) as NominatimHit[]
  return Array.isArray(data) ? data : []
}
