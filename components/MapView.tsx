'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix default marker icons broken by webpack
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function FitBounds({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => { map.setView(center, zoom) }, [map, center, zoom])
  return null
}

export interface ActivityMarker {
  lat: number
  lng: number
  label: string
}

export default function MapView({
  center,
  radius,
  zoom = 14,
  markers = [],
  height = 300,
  interactive = true,
  onMapClick,
}: {
  center: [number, number]
  radius?: number
  zoom?: number
  markers?: ActivityMarker[]
  height?: number
  interactive?: boolean
  onMapClick?: (lat: number, lng: number) => void
}) {
  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={interactive}
        dragging={interactive}
        scrollWheelZoom={false}
        {...(onMapClick ? {
          eventHandlers: {
            click: (e: any) => onMapClick(e.latlng.lat, e.latlng.lng),
          }
        } : {})}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds center={center} zoom={zoom} />

        {radius && (
          <Circle
            center={center}
            radius={radius}
            pathOptions={{ color: '#185FA5', fillColor: '#E6F1FB', fillOpacity: 0.4, weight: 2 }}
          />
        )}

        {markers.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]}>
            <Popup>{m.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
