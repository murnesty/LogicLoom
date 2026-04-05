import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapPane } from './components/MapPane.tsx'
import { filterPois } from './logic/filterPois.ts'
import { searchMalaysia } from './services/nominatim.ts'
import { fetchFoodAround } from './services/overpass.ts'
import { type FoodPoi, poiDisplayName, poiTypeSummary } from './types/poi.ts'
import { DEFAULT_CATEGORY_IDS, PLACE_CATEGORIES } from './types/placeCategories.ts'
import {
  CUISINE_GROUPS,
  externalUrlFromTags,
  formatPriceLine,
  imageUrlsFromTags,
  openingHoursFromTags,
  phoneFromTags,
  starsFromTags,
} from './utils/osmDisplay.ts'
import './App.css'

const DEFAULT_CENTER: [number, number] = [3.139, 101.6869]
const DEFAULT_ZOOM = 14
const MAX_SHOWN = 250

function osmBrowseUrl(p: FoodPoi): string {
  return `https://www.openstreetmap.org/${p.osmType}/${p.osmId}`
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const x of a) {
    if (!b.has(x)) return false
  }
  return true
}

export default function App() {
  const [centerLat, setCenterLat] = useState(DEFAULT_CENTER[0])
  const [centerLng, setCenterLng] = useState(DEFAULT_CENTER[1])
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [searchText, setSearchText] = useState('')
  const [radiusM, setRadiusM] = useState(1500)
  const [rawPois, setRawPois] = useState<FoodPoi[]>([])
  const [loading, setLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    () => new Set(DEFAULT_CATEGORY_IDS)
  )
  const [cuisineFilter, setCuisineFilter] = useState('')
  const [selectedCuisineChips, setSelectedCuisineChips] = useState<Set<string>>(new Set())
  const [halalOnly, setHalalOnly] = useState(false)
  const [requireImageUrl, setRequireImageUrl] = useState(false)
  const [requireWebsite, setRequireWebsite] = useState(false)
  const [highlightKey, setHighlightKey] = useState<string | null>(null)
  const [lunchPick, setLunchPick] = useState<FoodPoi | null>(null)
  const poiListItemRefs = useRef<Record<string, HTMLLIElement | null>>({})

  useEffect(() => {
    if (!highlightKey) return
    const el = poiListItemRefs.current[highlightKey]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    const id = window.requestAnimationFrame(() => {
      el.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(id)
  }, [highlightKey])
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const onChange = () => setFiltersPanelOpen(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const filterOpts = useMemo(
    () => ({
      selectedCategoryIds,
      cuisineNeedle: cuisineFilter,
      selectedCuisineChips,
      halalOnly,
      centerLat,
      centerLng,
      radiusM,
      requireImageUrl,
      requireWebsite,
    }),
    [
      selectedCategoryIds,
      cuisineFilter,
      selectedCuisineChips,
      halalOnly,
      centerLat,
      centerLng,
      radiusM,
      requireImageUrl,
      requireWebsite,
    ]
  )

  const matchedPois = useMemo(() => filterPois(rawPois, filterOpts), [rawPois, filterOpts])
  const filteredPois = useMemo(() => matchedPois.slice(0, MAX_SHOWN), [matchedPois])

  const setCenter = useCallback((lat: number, lng: number) => {
    setCenterLat(lat)
    setCenterLng(lng)
  }, [])

  const centerTuple = useMemo((): [number, number] => [centerLat, centerLng], [centerLat, centerLng])

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.')
      return
    }
    setGeoLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false)
        setCenter(pos.coords.latitude, pos.coords.longitude)
        setZoom(15)
      },
      (err) => {
        setGeoLoading(false)
        setError(err.message || 'Could not read GPS position.')
      },
      { enableHighAccuracy: true, timeout: 15_000 }
    )
  }

  const handleSearchPlace = async () => {
    const q = searchText.trim()
    if (!q) {
      setError('Enter a place name to search.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const hits = await searchMalaysia(q)
      if (hits.length === 0) {
        setError('No results in Malaysia. Try another query.')
        return
      }
      const lat = parseFloat(hits[0].lat)
      const lon = parseFloat(hits[0].lon)
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        setError('Invalid coordinates from search.')
        return
      }
      setCenter(lat, lon)
      setZoom(15)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadNearby = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchFoodAround(centerLat, centerLng, radiusM)
      setRawPois(data)
      setHighlightKey(null)
      setLunchPick(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load places.')
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const foodCategories = useMemo(
    () => PLACE_CATEGORIES.filter((c) => c.group === 'food'),
    []
  )
  const shoppingCategories = useMemo(
    () => PLACE_CATEGORIES.filter((c) => c.group === 'shopping'),
    []
  )

  const categoriesMatchDefault = useMemo(
    () => setsEqual(selectedCategoryIds, DEFAULT_CATEGORY_IDS),
    [selectedCategoryIds]
  )

  const filterSummaryShort = useMemo(() => {
    const bits: string[] = []
    if (!categoriesMatchDefault) {
      const n = selectedCategoryIds.size
      bits.push(n === 0 ? 'All types' : `${n} type${n === 1 ? '' : 's'}`)
    }
    const nChip = selectedCuisineChips.size
    if (nChip > 0) bits.push(`${nChip} cuisine chip${nChip === 1 ? '' : 's'}`)
    if (cuisineFilter.trim()) bits.push('cuisine search')
    const tagBits: string[] = []
    if (halalOnly) tagBits.push('halal')
    if (requireImageUrl) tagBits.push('photo')
    if (requireWebsite) tagBits.push('website')
    if (tagBits.length) bits.push(tagBits.join('+'))
    if (bits.length === 0) return 'Defaults'
    return bits.join(' · ')
  }, [
    categoriesMatchDefault,
    selectedCategoryIds,
    selectedCuisineChips,
    cuisineFilter,
    halalOnly,
    requireImageUrl,
    requireWebsite,
  ])

  const resetFilters = () => {
    setSelectedCategoryIds(new Set(DEFAULT_CATEGORY_IDS))
    setSelectedCuisineChips(new Set())
    setCuisineFilter('')
    setHalalOnly(false)
    setRequireImageUrl(false)
    setRequireWebsite(false)
  }

  const toggleCuisineChip = (c: string) => {
    setSelectedCuisineChips((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  const suggestRandomPlace = () => {
    const list = filteredPois
    if (list.length === 0) {
      setError('Load nearby first so there is at least one place in the list.')
      return
    }
    setError(null)
    const n = list.length
    let pick = list[Math.floor(Math.random() * n)]!
    if (n > 1 && lunchPick) {
      let guard = 0
      while (pick.key === lunchPick.key && guard++ < 12) {
        pick = list[Math.floor(Math.random() * n)]!
      }
    }
    setLunchPick(pick)
    setHighlightKey(pick.key)
  }

  const lunchImgs = lunchPick ? imageUrlsFromTags(lunchPick.tags) : []
  const lunchLink = lunchPick ? externalUrlFromTags(lunchPick.tags) : undefined
  const lunchPrice = lunchPick ? formatPriceLine(lunchPick.tags) : undefined
  const lunchStars = lunchPick ? starsFromTags(lunchPick.tags) : undefined
  const lunchPhone = lunchPick ? phoneFromTags(lunchPick.tags) : undefined
  const lunchHours = lunchPick ? openingHoursFromTags(lunchPick.tags) : undefined

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-brand">
            <span className="app-header-logo" aria-hidden="true">
              ◎
            </span>
            <div>
              <h1>Places near you</h1>
              <p className="app-header-tagline">Malaysia · OpenStreetMap</p>
            </div>
          </div>
          <p className="app-header-desc">
            Find food, malls, and shops around the map centre. Drag the pin to move the search area, then load nearby.
          </p>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar" aria-label="Search and filters">
          <details className="data-notice data-notice--collapsible">
            <summary className="data-notice-summary">
              <span className="data-notice-icon" aria-hidden="true">
                ℹ️
              </span>
              <span>About this data</span>
            </summary>
            <div className="data-notice-body">
              Overpass returns mapper-contributed <strong>tags</strong> only — no reviews or menus. We show links,
              hours, phone, price text, and images when mappers added them.
            </div>
          </details>

          <div className="sidebar-card lunch-bar">
            <button
              type="button"
              className="btn-random"
              onClick={suggestRandomPlace}
              disabled={filteredPois.length === 0}
            >
              <span className="btn-random-icon" aria-hidden="true">
                ✦
              </span>
              Random pick
            </button>
            <span className="lunch-hint">From your current list (after filters)</span>
          </div>

          <div className="sidebar-card">
            <div className="sidebar-card-label">Where to look</div>
            <div className="toolbar">
              <input
                type="search"
                className="input-grow"
                placeholder="Search a town or place in Malaysia…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchPlace()}
                autoComplete="off"
              />
              <button type="button" className="btn-primary" onClick={handleSearchPlace} disabled={loading}>
                Go
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleGeolocation}
                disabled={geoLoading}
                title="Centre the map on your location"
              >
                {geoLoading ? '…' : 'GPS'}
              </button>
            </div>

            <div className="radius-row">
              <div className="radius-label">
                <span>Search radius</span>
                <strong>{radiusM} m</strong>
              </div>
              <input
                type="range"
                className="radius-slider"
                min={500}
                max={3000}
                step={100}
                value={radiusM}
                onChange={(e) => setRadiusM(Number(e.target.value))}
                aria-valuemin={500}
                aria-valuemax={3000}
                aria-valuenow={radiusM}
              />
            </div>

            <button
              type="button"
              className="btn-load"
              onClick={handleLoadNearby}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="btn-load-spinner" aria-hidden="true" />
                  Loading places…
                </>
              ) : (
                <>
                  <span aria-hidden="true">◎</span> Load places nearby
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="status-msg error" role="alert">
              {error}
            </div>
          )}

          <div className="filters-shell sidebar-card sidebar-card--flat">
            <div className="filters-shell-header">
              <button
                type="button"
                className="filters-shell-toggle"
                onClick={() => setFiltersPanelOpen((o) => !o)}
                aria-expanded={filtersPanelOpen}
                id="filters-panel-label"
              >
                <span className="filters-shell-toggle-main">
                  <span className="filters-shell-chevron" aria-hidden="true">
                    {filtersPanelOpen ? '▼' : '▶'}
                  </span>
                  <span className="filters-shell-title">Filters</span>
                </span>
                <span className="filters-shell-preview">{filterSummaryShort}</span>
              </button>
              {filtersPanelOpen && (
                <button type="button" className="filters-reset-btn" onClick={resetFilters}>
                  Reset
                </button>
              )}
            </div>

            {filtersPanelOpen && (
              <div className="filters-shell-body" role="region" aria-labelledby="filters-panel-label">
                <details className="filter-details" open>
                  <summary className="filter-details-summary">
                    <span className="filter-details-title">Place types</span>
                    <span className="filter-details-meta">
                      {selectedCategoryIds.size === 0 ? 'All' : `${selectedCategoryIds.size} on`}
                    </span>
                  </summary>
                  <div className="filter-details-body">
                    <p className="filters-hint">Uncheck all to show every type you already loaded.</p>
                    <div className="filter-group">
                      <div className="filter-group-title">Food &amp; drink</div>
                      <div className="amenity-grid">
                        {foodCategories.map((c) => (
                          <label key={c.id} className="checkbox-pill">
                            <input
                              type="checkbox"
                              checked={selectedCategoryIds.has(c.id)}
                              onChange={() => toggleCategory(c.id)}
                            />
                            <span>{c.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="filter-group filter-group--last">
                      <div className="filter-group-title">Shopping &amp; malls</div>
                      <div className="amenity-grid">
                        {shoppingCategories.map((c) => (
                          <label key={c.id} className="checkbox-pill">
                            <input
                              type="checkbox"
                              checked={selectedCategoryIds.has(c.id)}
                              onChange={() => toggleCategory(c.id)}
                            />
                            <span>{c.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </details>

                <details className="filter-details">
                  <summary className="filter-details-summary">
                    <span className="filter-details-title">Cuisine</span>
                    <span className="filter-details-meta">
                      {selectedCuisineChips.size + (cuisineFilter.trim() ? 1 : 0) === 0
                        ? 'Off'
                        : `${selectedCuisineChips.size + (cuisineFilter.trim() ? 1 : 0)} active`}
                    </span>
                  </summary>
                  <div className="filter-details-body">
                    <p className="filter-note">
                      For <strong>food &amp; drink</strong> only — OSM <code>cuisine</code> tag. Shopping POIs stay
                      visible.
                    </p>
                    {CUISINE_GROUPS.map((g) => (
                      <div key={g.label} className="cuisine-group">
                        <div className="cuisine-group-title">{g.label}</div>
                        <div className="chip-row">
                          {g.chips.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={`chip ${selectedCuisineChips.has(c) ? 'chip-on' : ''}`}
                              onClick={() => toggleCuisineChip(c)}
                            >
                              {c.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="cuisine-row">
                      <label className="sr-only" htmlFor="cuisine-text">
                        Extra cuisine text
                      </label>
                      <input
                        id="cuisine-text"
                        type="text"
                        placeholder="Extra text to match in cuisine tag…"
                        value={cuisineFilter}
                        onChange={(e) => setCuisineFilter(e.target.value)}
                      />
                    </div>
                  </div>
                </details>

                <details className="filter-details filter-details--last">
                  <summary className="filter-details-summary">
                    <span className="filter-details-title">Extra tag rules</span>
                    <span className="filter-details-meta">
                      {(() => {
                        const n = [halalOnly, requireImageUrl, requireWebsite].filter(Boolean).length
                        return n === 0 ? 'None' : `${n} on`
                      })()}
                    </span>
                  </summary>
                  <div className="filter-details-body">
                    <div className="check-col">
                      <label>
                        <input
                          type="checkbox"
                          checked={halalOnly}
                          onChange={(e) => setHalalOnly(e.target.checked)}
                        />
                        <span>
                          <code>diet:halal</code> = yes (food only; shops stay)
                        </span>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={requireImageUrl}
                          onChange={(e) => setRequireImageUrl(e.target.checked)}
                        />
                        <span>
                          Has <code>image</code> URL
                        </span>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={requireWebsite}
                          onChange={(e) => setRequireWebsite(e.target.checked)}
                        />
                        <span>
                          Has <code>website</code> / contact URL
                        </span>
                      </label>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </div>

          <div className="results-bar">
            <span className="results-bar-title">Results</span>
            <span className="results-bar-count">
              <strong>{filteredPois.length}</strong> on map
              {matchedPois.length > MAX_SHOWN
                ? ` · ${matchedPois.length} match (showing first ${MAX_SHOWN})`
                : matchedPois.length > 0
                  ? ` · ${matchedPois.length} match filters`
                  : ''}
            </span>
          </div>

          <ul className="poi-list">
            {filteredPois.map((p) => {
              const imgs = imageUrlsFromTags(p.tags)
              const link = externalUrlFromTags(p.tags)
              const stars = starsFromTags(p.tags)
              const priceLine = formatPriceLine(p.tags)
              const phone = phoneFromTags(p.tags)
              const hours = openingHoursFromTags(p.tags)
              return (
                <li
                  key={p.key}
                  ref={(el) => {
                    if (el) poiListItemRefs.current[p.key] = el
                    else delete poiListItemRefs.current[p.key]
                  }}
                  id={`poi-list-${p.key.replace(/\//g, '-')}`}
                  tabIndex={-1}
                  className={highlightKey === p.key ? 'selected' : ''}
                  onClick={() => setHighlightKey(p.key)}
                >
                  <div className="poi-card-top">
                    <div className="poi-thumbs">
                      {imgs.length === 0 ? (
                        <div className="thumb-ph">No image tag</div>
                      ) : (
                        imgs.slice(0, 2).map((src) => (
                          <img key={src} src={src} alt="" className="poi-thumb" loading="lazy" />
                        ))
                      )}
                    </div>
                    <div className="poi-card-main">
                      <div className="name">{poiDisplayName(p.tags)}</div>
                      <div className="meta">{poiTypeSummary(p.tags)}</div>
                      {hours && <div className="poi-extra">{hours}</div>}
                      {phone && <div className="poi-extra">{phone}</div>}
                      {(stars != null || priceLine) && (
                        <div className="poi-meta-line">
                          {stars != null && <span>Stars tag: {stars}★</span>}
                          {stars != null && priceLine && <span> · </span>}
                          {priceLine && <span className="price">{priceLine}</span>}
                        </div>
                      )}
                      {link && (
                        <a
                          className="menu-link"
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </aside>

        <div className="map-wrap">
          <div className="map-legend" aria-hidden="true">
            <span>
              <i className="map-dot map-dot--food" /> Food
            </span>
            <span>
              <i className="map-dot map-dot--shop" /> Shopping
            </span>
          </div>
          <MapPane
            center={centerTuple}
            zoom={zoom}
            pois={filteredPois}
            highlightKey={highlightKey}
            onCenterMarkerDragEnd={(lat, lng) => setCenter(lat, lng)}
            onPoiListSelect={(key) => setHighlightKey(key)}
          />
        </div>
      </div>

      {lunchPick && (
        <div className="modal-backdrop" role="presentation" onClick={() => setLunchPick(null)}>
          <div className="modal" role="dialog" aria-labelledby="lunch-title" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setLunchPick(null)}>
              ×
            </button>
            <h2 id="lunch-title">Random pick</h2>
            <p className="modal-random">Chosen at random from your filtered list — not a rating service.</p>
            <h3 className="modal-place">{poiDisplayName(lunchPick.tags)}</h3>
            <p className="modal-sub">{poiTypeSummary(lunchPick.tags)}</p>
            <div className="modal-thumbs">
              {lunchImgs.slice(0, 2).map((src) => (
                <img key={src} src={src} alt="" className="modal-img" />
              ))}
              {lunchImgs.length === 0 && <div className="modal-ph">No image URL in OSM tags</div>}
            </div>
            <div className="modal-facts">
              {lunchHours && (
                <div>
                  <strong>Opening hours</strong> (OSM <code>opening_hours</code>): {lunchHours}
                </div>
              )}
              {lunchPhone && (
                <div>
                  <strong>Phone</strong>: {lunchPhone}
                </div>
              )}
              {lunchPrice && (
                <div>
                  <strong>Price text</strong>: {lunchPrice}
                </div>
              )}
              {lunchStars != null && (
                <div>
                  <strong>Stars tag</strong>: {lunchStars}★ (uncommon on food POIs)
                </div>
              )}
              {lunchLink && (
                <div>
                  <strong>Website</strong>:{' '}
                  <a href={lunchLink} target="_blank" rel="noreferrer">
                    {lunchLink}
                  </a>
                </div>
              )}
              {!lunchHours && !lunchPhone && !lunchPrice && lunchStars == null && !lunchLink && lunchImgs.length === 0 && (
                <div className="modal-ph-inline">Few extra tags on this object — only name / type in OSM.</div>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" onClick={suggestRandomPlace}>
                Pick another
              </button>
              <a className="button-link" href={osmBrowseUrl(lunchPick)} target="_blank" rel="noreferrer">
                View on OpenStreetMap
              </a>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        Map data ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap contributors
        </a>
        . Data via Overpass — tags are optional and incomplete.
      </footer>
    </div>
  )
}
