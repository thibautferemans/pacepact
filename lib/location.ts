import polylineDecode from '@mapbox/polyline'

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function polylineIntersectsLocation(
  encodedPolyline: string,
  targetLat: number,
  targetLng: number,
  radiusM: number
): boolean {
  try {
    const points = polylineDecode.decode(encodedPolyline)
    return points.some(([lat, lng]) => haversineDistance(lat, lng, targetLat, targetLng) <= radiusM)
  } catch {
    return false
  }
}

export function startPointInRadius(
  startLat: number,
  startLng: number,
  targetLat: number,
  targetLng: number,
  radiusM: number
): boolean {
  return haversineDistance(startLat, startLng, targetLat, targetLng) <= radiusM
}

export function activityMatchesLocation(
  activity: {
    polyline?: string | null
    start_lat?: number | null
    start_lng?: number | null
  },
  targetLat: number,
  targetLng: number,
  radiusM: number,
  matchLogic: string
): boolean {
  if (matchLogic === 'route' && activity.polyline) {
    return polylineIntersectsLocation(activity.polyline, targetLat, targetLng, radiusM)
  }
  if (activity.start_lat != null && activity.start_lng != null) {
    return startPointInRadius(activity.start_lat, activity.start_lng, targetLat, targetLng, radiusM)
  }
  return false
}
