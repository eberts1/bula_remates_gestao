export interface MapAreaBounds {
  type: 'bounds';
  south: number;
  north: number;
  west: number;
  east: number;
}

export interface MapAreaCircle {
  type: 'circle';
  lat: number;
  lng: number;
  radiusKm: number;
}

export type MapAreaSelection = MapAreaBounds | MapAreaCircle;

export function mapAreaToParams(area: MapAreaSelection): URLSearchParams {
  const params = new URLSearchParams();
  if (area.type === 'bounds') {
    params.set('boundsSouth', String(area.south));
    params.set('boundsNorth', String(area.north));
    params.set('boundsWest', String(area.west));
    params.set('boundsEast', String(area.east));
  } else {
    params.set('areaCenterLat', String(area.lat));
    params.set('areaCenterLng', String(area.lng));
    params.set('areaRadiusKm', String(area.radiusKm));
  }
  return params;
}

export function appendMapAreaToParams(
  params: URLSearchParams,
  area: MapAreaSelection | null,
) {
  if (!area) return;
  const areaParams = mapAreaToParams(area);
  areaParams.forEach((value, key) => params.set(key, value));
}

export function isPointInMapArea(
  lat: number,
  lng: number,
  area: MapAreaSelection,
): boolean {
  if (area.type === 'bounds') {
    return (
      lat >= area.south &&
      lat <= area.north &&
      lng >= area.west &&
      lng <= area.east
    );
  }

  const R = 6371;
  const dLat = ((area.lat - lat) * Math.PI) / 180;
  const dLng = ((area.lng - lng) * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lat2 = (area.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const distanceKm = 2 * R * Math.asin(Math.sqrt(h));
  return distanceKm <= area.radiusKm;
}
