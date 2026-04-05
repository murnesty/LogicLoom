import { useEffect, useRef } from 'react'
import type { LatLngExpression } from 'leaflet'
import L from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import type { FoodPoi } from '../types/poi.ts'
import { poiDisplayName } from '../types/poi.ts'
import { poiMarkerKind } from '../types/placeCategories.ts'
import {
  externalUrlFromTags,
  formatPriceLine,
  imageUrlsFromTags,
  openingHoursFromTags,
  phoneFromTags,
  starsFromTags,
} from '../utils/osmDisplay.ts'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
  popupAnchor: [1, -34],
})

function MapRecenter({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

interface MapPaneProps {
  center: [number, number]
  zoom: number
  pois: FoodPoi[]
  highlightKey: string | null
  onCenterMarkerDragEnd: (lat: number, lng: number) => void
  onPoiListSelect: (key: string) => void
}

export function MapPane({
  center,
  zoom,
  pois,
  highlightKey,
  onCenterMarkerDragEnd,
  onPoiListSelect,
}: MapPaneProps) {
  const poiLayerRefs = useRef<Record<string, L.CircleMarker | null>>({})

  useEffect(() => {
    if (!highlightKey) return
    const t = window.setTimeout(() => {
      poiLayerRefs.current[highlightKey]?.openPopup()
    }, 50)
    return () => window.clearTimeout(t)
  }, [highlightKey, pois])

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="map-pane"
      scrollWheelZoom
      style={{ height: '100%', width: '100%', minHeight: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapRecenter center={center} zoom={zoom} />
      <Marker
        position={center}
        draggable
        icon={defaultIcon}
        eventHandlers={{
          dragend: (e) => {
            const p = e.target.getLatLng()
            onCenterMarkerDragEnd(p.lat, p.lng)
          },
        }}
      >
        <Popup>Search center — drag to adjust</Popup>
      </Marker>
      {pois.map((p) => {
        const imgs = imageUrlsFromTags(p.tags)
        const link = externalUrlFromTags(p.tags)
        const stars = starsFromTags(p.tags)
        const price = formatPriceLine(p.tags)
        const phone = phoneFromTags(p.tags)
        const hours = openingHoursFromTags(p.tags)
        const kind = poiMarkerKind(p.tags)
        const stroke = kind === 'shopping' ? '#0d47a1' : '#b71c1c'
        const fill = kind === 'shopping' ? '#42a5f5' : '#ef5350'
        return (
          <CircleMarker
            key={p.key}
            center={[p.lat, p.lon]}
            radius={highlightKey === p.key ? 11 : 8}
            pathOptions={{
              color: stroke,
              fillColor: fill,
              fillOpacity: 0.9,
              weight: 2,
            }}
            ref={(instance) => {
              poiLayerRefs.current[p.key] = instance
            }}
            eventHandlers={{
              click: () => onPoiListSelect(p.key),
            }}
          >
            <Popup>
              <div className="map-popup">
                {imgs[0] && (
                  <img
                    src={imgs[0]}
                    alt=""
                    style={{ maxWidth: '140px', borderRadius: '4px', marginBottom: '0.35rem' }}
                  />
                )}
                <strong>{poiDisplayName(p.tags)}</strong>
                <div style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}>
                  {p.tags.amenity && <div>Type: {p.tags.amenity.replace(/_/g, ' ')}</div>}
                  {p.tags.shop && <div>Shop: {p.tags.shop.replace(/_/g, ' ')}</div>}
                  {p.tags.cuisine && <div>Cuisine: {p.tags.cuisine}</div>}
                  {stars != null && <div>Stars tag: {stars}★</div>}
                  {price && <div>Price: {price}</div>}
                  {hours && <div>Hours: {hours}</div>}
                  {phone && <div>{phone}</div>}
                  {link && (
                    <div>
                      <a href={link} target="_blank" rel="noreferrer">
                        Website
                      </a>
                    </div>
                  )}
                  {p.tags['addr:street'] && (
                    <div>
                      {p.tags['addr:street']} {p.tags['addr:housenumber'] ?? ''}
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
