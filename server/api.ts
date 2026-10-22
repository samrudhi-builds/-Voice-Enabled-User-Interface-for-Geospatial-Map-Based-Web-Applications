import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { categories } from '../src/types';
import type { Category, Place, PoiLookup } from '../src/types';
import { RequestCache, SerialGate } from './cache';
import { normalizePhotonPois, normalizePlaces, normalizePois, normalizeRoute, parseCoordinates, ServiceError, validCoordinates } from './data';

const root = resolve(import.meta.dirname, '..');
const cache = new RequestCache(resolve(root, '.cache/service-cache.json'));
const geocodingGate = new SerialGate(1100), poiGate = new SerialGate(1500);
const endpoints = {
  geocode: process.env.GEOCODING_URL || 'https://nominatim.openstreetmap.org/search',
  poi: process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter',
  photon: process.env.PHOTON_URL || 'https://photon.komoot.io/reverse',
  routing: process.env.ROUTING_URL || 'https://router.project-osrm.org/route/v1/driving',
};
let retryOverpassAfter = 0;
async function upstream(url: string, provider: string, options: RequestInit = {}, timeout = 18000): Promise<unknown> {
  try {
    const response = await fetch(url, { ...options, headers: { 'User-Agent': 'GeoVoiceMVP/1.0 (local personal GIS prototype)', Accept: 'application/json', ...options.headers }, signal: AbortSignal.timeout(timeout) });
    if (response.status === 429) throw new ServiceError(`${provider} is rate limiting requests. Wait a minute before retrying.`, 429);
    if (!response.ok) throw new ServiceError(`${provider} is unavailable right now. Please retry later.`);
    return await response.json();
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) throw new ServiceError(`${provider} took too long to respond. Please retry or use a smaller search.`, 504);
    throw new ServiceError(`Could not reach ${provider}. Check your connection and retry.`);
  }
}
function queryText(params: URLSearchParams, key: string): string {
  const value = params.get(key)?.trim();
  if (!value || value.length > 200) throw new ServiceError('Enter a place name between 1 and 200 characters.', 400);
  return value;
}
function coordinate(params: URLSearchParams, prefix = '') {
  const latText = params.get(`${prefix}lat`), lngText = params.get(`${prefix}lng`);
  const lat = Number(latText), lng = Number(lngText);
  if (!latText?.trim() || !lngText?.trim() || !validCoordinates(lat, lng)) throw new ServiceError('The selected location has invalid coordinates. Search for it again.', 400);
  return { lat, lng };
}
export async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || '/', 'http://localhost');
  if (!url.pathname.startsWith('/api/')) return false;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (req.method !== 'GET') throw new ServiceError('Use a GET request for this endpoint.', 405);
    if (req.headers.origin && ![`http://${req.headers.host}`, `https://${req.headers.host}`].includes(req.headers.origin)) throw new ServiceError('Cross-origin API access is not enabled.', 403);
    const p = url.searchParams;
    let result: unknown;
    if (url.pathname === '/api/health') result = { status: 'ok', app: 'GeoVoice', routingMode: 'driving' };
    else if (url.pathname === '/api/geocode') {
      const query = queryText(p, 'q'), coordinates = parseCoordinates(query);
      if (coordinates) result = { data: [{ ...coordinates, id: `coordinates/${query}`, name: query, label: query, source: 'Coordinates' }], cached: false, fetchedAt: new Date().toISOString() };
      else result = await cache.get(`geo:v2:${endpoints.geocode}:${query.toLocaleLowerCase()}`, 7 * 86400000, () => geocodingGate.run(async () => {
        const endpoint = new URL(endpoints.geocode);
        endpoint.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5', addressdetails: '1', 'accept-language': 'en', viewbox: '72.75,19.30,73.10,18.85', bounded: '0' }).toString();
        return normalizePlaces(await upstream(endpoint.toString(), 'Nominatim'), query);
      }));
    } else if (url.pathname === '/api/poi') {
      const center = coordinate(p), category = p.get('category') as Category, radiusM = Number(p.get('radius'));
      if (!categories.includes(category) || !Number.isFinite(radiusM) || radiusM < 100 || radiusM > 10000) throw new ServiceError('Choose a supported category and a radius from 100 m to 10 km.', 400);
      const tags: Record<Category, string> = { cafe: 'amenity=cafe', restaurant: 'amenity=restaurant', hospital: 'amenity=hospital', park: 'leisure=park', hotel: 'tourism=hotel', attraction: 'tourism=attraction' };
      const [key, value] = tags[category].split('=');
      const query = `[out:json][timeout:10];nwr["${key}"="${value}"](around:${radiusM},${center.lat},${center.lng});out center 100;`;
      result = await cache.get<PoiLookup>(`poi:v2:${endpoints.poi}:${endpoints.photon}:${query}`, 600000, () => poiGate.run(async () => {
        if (Date.now() >= retryOverpassAfter) {
          try {
            const data = await upstream(endpoints.poi, 'Overpass', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: query }).toString() }, 12000);
            return { results: normalizePois(data, category, center, radiusM), provider: 'Overpass' };
          } catch { retryOverpassAfter = Date.now() + 60000; }
        }
        try {
          const fallback = new URL(endpoints.photon);
          fallback.search = new URLSearchParams({ lat: String(center.lat), lon: String(center.lng), radius: String(radiusM / 1000), limit: '40', osm_tag: `${key}:${value}`, lang: 'en' }).toString();
          return { results: normalizePhotonPois(await upstream(fallback.toString(), 'Photon', {}, 15000), category, center, radiusM), provider: 'Photon', note: 'Overpass is unavailable. Showing Photon fallback results; coverage may differ.' };
        } catch { throw new ServiceError('Nearby place search is unavailable right now. Please retry later.'); }
      }));
    } else if (url.pathname === '/api/route') {
      const a = coordinate(p, 'from_'), b = coordinate(p, 'to_');
      const origin: Place = { ...a, id: 'origin', name: queryText(p, 'origin'), label: queryText(p, 'origin'), source: 'Coordinates' };
      const destination: Place = { ...b, id: 'destination', name: queryText(p, 'destination'), label: queryText(p, 'destination'), source: 'Coordinates' };
      const key = `route:${endpoints.routing}:${a.lng},${a.lat};${b.lng},${b.lat}`;
      // Cache geometry, but keep this request's labels instead of earlier users' labels.
      const route = await cache.get(key, 600000, async () => normalizeRoute(await upstream(`${endpoints.routing.replace(/\/$/, '')}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=false`, 'OSRM'), origin, destination));
      result = { ...route, data: { ...route.data, origin, destination } };
    } else throw new ServiceError('This API endpoint does not exist.', 404);
    res.end(JSON.stringify(result));
  } catch (error) {
    const known = error instanceof ServiceError;
    res.statusCode = known ? error.status : 500;
    res.end(JSON.stringify({ error: known ? error.message : 'The request could not be completed. Please retry.' }));
  }
  return true;
}
