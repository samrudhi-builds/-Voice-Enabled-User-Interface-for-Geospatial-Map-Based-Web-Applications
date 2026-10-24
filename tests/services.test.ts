import { describe, it, expect } from 'vitest';
import { normalizePhotonPois, normalizePlaces, normalizePois, normalizeRoute, parseCoordinates } from '../server/data';
import type { Place } from '../src/types';

const origin: Place = { lat: 18.922, lng: 72.835, name: 'Origin', label: 'Origin', id: 'o', source: 'Nominatim' };
const destination: Place = { ...origin, id: 'd', lat: 18.943, lng: 72.823, name: 'Destination' };

describe('geographic data boundaries', () => {
  it('parses literal coordinates without any geocoding request', () => expect(parseCoordinates('19.076, 72.8777')).toEqual({ lat: 19.076, lng: 72.8777 }));
  it('leaves arbitrary geographic names for geocoding', () => expect(parseCoordinates('Ahmedabad')).toBeNull());
  it.each(['91, 72', '19, 181', 'NaN, 72', '19, Infinity'])('rejects invalid numeric coordinate input %s', text => expect(() => parseCoordinates(text)).toThrow());
  it('drops invalid geocoding coordinates and preserves the real display label', () => {
    expect(normalizePlaces([{ osm_type: 'node', osm_id: 1, lat: '18.922', lon: '72.835', display_name: 'Gateway of India, Mumbai, India', name: 'Gateway of India' }, { lat: '999', lon: '1', display_name: 'Invalid' }])).toEqual([{ ...origin, id: 'node/1', name: 'Gateway of India', label: 'Gateway of India, Mumbai, India' }]);
  });
  it('rejects malformed geocoding payloads', () => expect(() => normalizePlaces({ error: 'unavailable' })).toThrow());
  it.each(['', ' ', false, null])('never converts malformed geocoding coordinates to zero: %s', value => {
    expect(normalizePlaces([{ lat: value, lon: value, display_name: 'Malformed' }])).toEqual([]);
  });
  it('does not create POIs from malformed blank coordinates', () => {
    expect(normalizePois({ elements: [{ type: 'node', id: 1, lat: '', lon: '', tags: { name: 'Malformed' } }] }, 'cafe', { lat: 0, lng: 0 }, 3000)).toEqual([]);
  });
  it('prefers an exact city name over a locally biased partial-name match', () => {
    const places = normalizePlaces([
      { osm_type: 'way', osm_id: 1, lat: '19.1', lon: '72.95', name: 'Mumbai–Ahmedabad High-speed Rail', display_name: 'Railway, Mumbai' },
      { osm_type: 'node', osm_id: 2, lat: '23.02', lon: '72.58', name: 'Ahmedabad', display_name: 'Ahmedabad, Gujarat, India' },
    ], 'Ahmedabad');
    expect(places[0].name).toBe('Ahmedabad');
  });
  it('normalizes nodes and ways, sorts by distance, and omits invented addresses', () => {
    const result = normalizePois({ elements: [
      { type: 'way', id: 2, center: { lat: 18.923, lon: 72.835 }, tags: { name: 'Second cafe' } },
      { type: 'node', id: 1, lat: 18.922, lon: 72.835, tags: { name: 'First cafe' } },
      { type: 'node', id: 3, lat: 0, lon: 0, tags: { name: 'Outside radius' } },
    ] }, 'cafe', origin, 3000);
    expect(result.map(p => p.name)).toEqual(['First cafe', 'Second cafe']);
    expect(result[0].distanceM).toBe(0);
    expect(result[0].address).toBeUndefined();
    expect(result[1].distanceM).toBeCloseTo(111.2, 0);
  });
  it('rejects a partial Overpass response instead of claiming a complete result', () => expect(() => normalizePois({ remark: 'runtime error: Query timed out', elements: [] }, 'park', origin, 3000)).toThrow());
  it('normalizes Photon fallback features and enforces category and radius itself', () => {
    const result = normalizePhotonPois({ type: 'FeatureCollection', features: [
      { type: 'Feature', properties: { osm_type: 'N', osm_id: 1, osm_key: 'amenity', osm_value: 'cafe', name: 'Cafe', street: 'Real street' }, geometry: { type: 'Point', coordinates: [72.835, 18.922] } },
      { type: 'Feature', properties: { osm_type: 'N', osm_id: 2, osm_key: 'amenity', osm_value: 'restaurant', name: 'Wrong category' }, geometry: { type: 'Point', coordinates: [72.835, 18.922] } },
      { type: 'Feature', properties: { osm_type: 'N', osm_id: 3, osm_key: 'amenity', osm_value: 'cafe', name: 'Too far' }, geometry: { type: 'Point', coordinates: [0, 0] } },
    ] }, 'cafe', origin, 3000);
    expect(result).toEqual([{ id: 'N/1', lat: 18.922, lng: 72.835, category: 'cafe', name: 'Cafe', distanceM: 0, address: 'Real street' }]);
  });
  it('converts GeoJSON longitude/latitude into map latitude/longitude', () => {
    const result = normalizeRoute({ code: 'Ok', routes: [{ distance: 4200, duration: 700, geometry: { type: 'LineString', coordinates: [[72.835, 18.922], [72.823, 18.943]] } }] }, origin, destination);
    expect(result.geometry).toEqual([[18.922, 72.835], [18.943, 72.823]]);
    expect(result.distanceM).toBe(4200);
    expect(result.mode).toBe('driving');
  });
  it.each([{ code: 'NoRoute', routes: [] }, { code: 'Ok', routes: [{ distance: -1, duration: 2, geometry: { coordinates: [] } }] }])('rejects empty or invalid routes', data => expect(() => normalizeRoute(data, origin, destination)).toThrow());
  it.each([null, false, ''])('rejects malformed route coordinates: %s', value => {
    expect(() => normalizeRoute({ code: 'Ok', routes: [{ distance: 1, duration: 1, geometry: { type: 'LineString', coordinates: [[value, value], [value, value]] } }] }, origin, destination)).toThrow();
  });
  it.each([false, ''])('rejects malformed route distance and duration: %s', value => {
    expect(() => normalizeRoute({ code: 'Ok', routes: [{ distance: value, duration: value, geometry: { type: 'LineString', coordinates: [[72.835, 18.922], [72.823, 18.943]] } }] }, origin, destination)).toThrow();
  });
});
