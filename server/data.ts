import type { Category, Coordinates, Place, Poi, Route } from '../src/types.js';

export class ServiceError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}
const record = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
function providerNumber(value: unknown, allowString = false): number | null {
  if (typeof value !== 'number' && !(allowString && typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
export function validCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}
export function parseCoordinates(text: string): Coordinates | null {
  const parts = text.trim().split(/\s*,\s*/);
  const numericLike = /^[-+\d.]|^(?:NaN|Infinity)$/i;
  if (parts.length !== 2 || !parts.every(p => numericLike.test(p))) return null;
  const [lat, lng] = parts.map(Number);
  if (!parts.every(p => p.trim()) || !validCoordinates(lat, lng)) throw new ServiceError('Use valid latitude, longitude coordinates (−90 to 90, −180 to 180).', 400);
  return { lat, lng };
}
export function normalizePlaces(data: unknown, query = ''): Place[] {
  if (!Array.isArray(data)) throw new ServiceError('The location provider returned an unreadable response. Please retry.');
  return data.flatMap(value => {
    const item = record(value);
    const lat = providerNumber(item.lat, true), lng = providerNumber(item.lon, true);
    if (lat === null || lng === null || !validCoordinates(lat, lng) || typeof item.display_name !== 'string') return [];
    return [{ id: `${item.osm_type ?? 'place'}/${item.osm_id ?? item.place_id}`, lat, lng, name: typeof item.name === 'string' && item.name ? item.name : item.display_name.split(',')[0], label: item.display_name, source: 'Nominatim' as const }];
  }).sort((a, b) => Number(b.name.localeCompare(query, undefined, { sensitivity: 'base' }) === 0) - Number(a.name.localeCompare(query, undefined, { sensitivity: 'base' }) === 0)).slice(0, 5);
}
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function normalizePois(data: unknown, category: Category, center: Coordinates, radiusM: number): Poi[] {
  const payload = record(data);
  if (!Array.isArray(payload.elements) || payload.remark) throw new ServiceError('The places provider could not finish this search. Try a smaller radius or retry.');
  return payload.elements.flatMap(value => {
    const item = record(value), point = item.center ? record(item.center) : item, tags = record(item.tags);
    const lat = providerNumber(point.lat), lng = providerNumber(point.lon);
    if (lat === null || lng === null || !validCoordinates(lat, lng)) return [];
    const distanceM = distanceMeters(center, { lat, lng });
    if (distanceM > radiusM) return [];
    const address = ['addr:housenumber', 'addr:street', 'addr:suburb', 'addr:city'].map(key => tags[key]).filter(v => typeof v === 'string').join(', ');
    return [{ id: `${item.type}/${item.id}`, lat, lng, category, distanceM, name: typeof tags.name === 'string' ? tags.name : `Unnamed ${category}`, ...(address ? { address } : {}) }];
  }).sort((a, b) => a.distanceM - b.distanceM).slice(0, 40);
}
export function normalizePhotonPois(data: unknown, category: Category, center: Coordinates, radiusM: number): Poi[] {
  const payload = record(data);
  if (!Array.isArray(payload.features)) throw new ServiceError('The fallback places provider returned an unreadable response.');
  const tags: Record<Category, [string, string]> = { cafe: ['amenity', 'cafe'], restaurant: ['amenity', 'restaurant'], hospital: ['amenity', 'hospital'], park: ['leisure', 'park'], hotel: ['tourism', 'hotel'], attraction: ['tourism', 'attraction'] };
  const [key, value] = tags[category];
  const elements = payload.features.flatMap(feature => {
    const item = record(feature), props = record(item.properties), geometry = record(item.geometry);
    if (props.osm_key !== key || props.osm_value !== value || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return [];
    return [{ type: props.osm_type, id: props.osm_id, lat: geometry.coordinates[1], lon: geometry.coordinates[0], tags: { name: props.name, 'addr:housenumber': props.housenumber, 'addr:street': props.street, 'addr:suburb': props.locality, 'addr:city': props.city } }];
  });
  return normalizePois({ elements }, category, center, radiusM);
}
export function normalizeRoute(data: unknown, origin: Place, destination: Place): Route {
  const payload = record(data), route = record(Array.isArray(payload.routes) ? payload.routes[0] : null), shape = record(route.geometry);
  if (payload.code !== 'Ok' || !Array.isArray(shape.coordinates) || shape.coordinates.length < 2 || shape.type !== 'LineString') throw new ServiceError('No driving route was found between those places. Try nearby street addresses.');
  const distanceM = providerNumber(route.distance), durationS = providerNumber(route.duration);
  if (distanceM === null || durationS === null || distanceM < 0 || durationS < 0) throw new ServiceError('The routing provider returned invalid distance or duration. Please retry.');
  const geometry: [number, number][] = shape.coordinates.map(value => {
    if (!Array.isArray(value) || value.length < 2) throw new ServiceError('The routing provider returned invalid route geometry.');
    const lat = providerNumber(value[1]), lng = providerNumber(value[0]);
    if (lat === null || lng === null || !validCoordinates(lat, lng)) throw new ServiceError('The routing provider returned invalid route geometry.');
    return [lat, lng];
  });
  return { origin, destination, distanceM, durationS, geometry, mode: 'driving' };
}
