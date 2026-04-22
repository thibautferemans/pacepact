'use client'

import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

export default function AboutMapSection({
  lat,
  lng,
  radius,
}: {
  lat: number
  lng: number
  radius: number
}) {
  return (
    <MapView
      center={[lat, lng]}
      radius={radius}
      height={220}
      interactive={false}
    />
  )
}
