import { getDemoSite } from "../sites.js";

const SITE_COORDINATES: Record<string, { latitude: number; longitude: number }> =
  {
    "demo-sunridge-az": { latitude: 33.4484, longitude: -112.074 },
    "demo-cedar-or": { latitude: 44.0582, longitude: -121.3153 },
    "demo-harbor-ca": { latitude: 32.7157, longitude: -117.1611 },
    "demo-mesa-nv": { latitude: 36.1699, longitude: -115.1398 },
  };

export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getSiteCoordinates(siteId: string): {
  latitude: number;
  longitude: number;
} {
  getDemoSite(siteId);
  const coordinates = SITE_COORDINATES[siteId];
  if (!coordinates) {
    throw new Error(`No weather coordinates for demo site: ${siteId}`);
  }

  return {
    latitude: roundCoordinate(coordinates.latitude),
    longitude: roundCoordinate(coordinates.longitude),
  };
}
