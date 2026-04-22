'use client'

import { useMapEvents } from 'react-leaflet'
import MapView from './MapView'

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

export default function ClickableMap({
  center,
  radius,
  onMapClick,
}: {
  center: [number, number]
  radius?: number
  onMapClick: (lat: number, lng: number) => void
}) {
  return (
    <MapView
      center={center}
      radius={radius}
      interactive
      onMapClick={onMapClick}
      height={250}
    />
  )
}
