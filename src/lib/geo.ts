import { FamilySavedPlace } from '@/types';

/**
 * Calculates great-circle distance between two points on the Earth
 * using the Haversine formula in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Finds if the given coordinates fall within the radius of any saved family places.
 */
export function matchSavedPlace(
  lat: number,
  lon: number,
  places: FamilySavedPlace[]
): { matchedPlace: FamilySavedPlace | null; distanceMeters: number | null } {
  let closestPlace: FamilySavedPlace | null = null;
  let minDistance = Infinity;

  for (const place of places) {
    if (!place.active) continue;
    const dist = calculateDistanceMeters(lat, lon, place.latitude, place.longitude);
    if (dist <= place.radius_meters) {
      if (dist < minDistance) {
        minDistance = dist;
        closestPlace = place;
      }
    }
  }

  return {
    matchedPlace: closestPlace,
    distanceMeters: closestPlace ? minDistance : null,
  };
}

/**
 * Human-readable accuracy string in Thai.
 */
export function formatAccuracyThai(accuracyMeters?: number): string {
  if (accuracyMeters === undefined || accuracyMeters === null || accuracyMeters <= 0) {
    return 'ไม่ทราบความแม่นยำ';
  }
  const acc = Math.round(accuracyMeters);
  if (acc > 150) {
    return `ความแม่นยำต่ำ (±${acc} ม.)`;
  }
  return `ความแม่นยำประมาณ ±${acc} เมตร`;
}

/**
 * Calculates humanized stale status for location updates.
 */
export function getStaleStatus(recordedAtIso?: string | null): 'LIVE' | 'RECENT' | 'STALE' | 'OFFLINE' {
  if (!recordedAtIso) return 'OFFLINE';
  const recTime = new Date(recordedAtIso).getTime();
  const now = Date.now();
  const diffMinutes = (now - recTime) / (1000 * 60);

  if (diffMinutes <= 5) return 'LIVE';
  if (diffMinutes <= 30) return 'RECENT';
  return 'STALE';
}

/**
 * Format relative time in Thai for location updates.
 */
export function formatLocationTimeThai(recordedAtIso?: string | null): string {
  if (!recordedAtIso) return 'ไม่มีข้อมูล';
  const recDate = new Date(recordedAtIso);
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - recDate.getTime()) / 1000));

  if (diffSeconds < 60) {
    return 'เมื่อสักครู่';
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `เมื่อ ${diffMinutes} นาทีที่แล้ว`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `เมื่อ ${diffHours} ชั่วโมงที่แล้ว`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `เมื่อ ${diffDays} วันที่แล้ว`;
}

/**
 * Generates an external navigation URL to Google Maps or Apple Maps.
 */
export function getDirectionsUrl(lat: number, lon: number, label?: string): string {
  const q = label ? `${lat},${lon}(${encodeURIComponent(label)})` : `${lat},${lon}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}
