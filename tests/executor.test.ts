import { expect, it } from 'vitest';
import { executeCommand } from '../src/commands/executeCommand';
import type { GisAdapter, GeographicServices } from '../src/gis/adapter';
import type { Place, Route } from '../src/types';

const place: Place = { id: 'test', lat: 18.92, lng: 72.83, name: 'Gateway', label: 'Gateway, Mumbai', source: 'Nominatim' };
function harness() {
  const state = { zoom: 12, markers: [] as string[], location: '', route: null as Route | null };
  const gis: GisAdapter = {
    zoomIn: () => { state.zoom++; }, zoomOut: () => { state.zoom--; }, flyTo: () => {}, showLocations: p => { state.location = p[0].name; },
    addMarker: (_p, name) => { state.markers.push(name); }, removeMarker: () => !!state.markers.pop(), clearMarkers: () => { state.markers = []; },
    setLayer: () => {}, hideLayer: () => {}, displayPOIs: () => {}, displayRoute: r => { state.route = r; }, clearRoute: () => { state.route = null; }, reset: () => {},
  };
  const services: GeographicServices = { geocode: async () => [place], nearby: async (center, category, radiusM) => ({ center, category, radiusM, results: [] }), route: async (origin, destination) => ({ origin, destination, geometry: [[18.92, 72.83], [18.94, 72.82]], distanceM: 1000, durationS: 120, mode: 'driving' }) };
  return { gis, services, state };
}
it('text/voice independent execution changes the connected GIS', async () => {
  const h = harness();
  await executeCommand({ type: 'ZOOM_IN' }, h.gis, h.services, new AbortController().signal);
  expect(h.state.zoom).toBe(13);
  const result = await executeCommand({ type: 'ADD_MARKER', location: 'Gateway' }, h.gis, h.services, new AbortController().signal);
  expect(result.ok).toBe(true);
  expect(h.state.markers).toEqual(['Gateway']);
});
it('a cancelled slow lookup does not mutate the map', async () => {
  const h = harness(), controller = new AbortController();
  h.services.geocode = async () => { controller.abort(); return [place]; };
  const result = await executeCommand({ type: 'ADD_MARKER', location: 'Gateway' }, h.gis, h.services, controller.signal);
  expect(result.code).toBe('cancelled');
  expect(h.state.markers).toEqual([]);
});
it('an unavailable geocoder reports failure and preserves map state', async () => {
  const h = harness();
  h.services.geocode = async () => { throw new Error('Location service unavailable. Try again.'); };
  const result = await executeCommand({ type: 'ZOOM_TO_LOCATION', location: 'Gateway' }, h.gis, h.services, new AbortController().signal);
  expect(result.ok).toBe(false);
  expect(result.message).toContain('unavailable');
  expect(h.state.location).toBe('');
});
it('missing places never produce markers or invented routes', async () => {
  const h = harness(); h.services.geocode = async () => [];
  const result = await executeCommand({ type: 'PLAN_ROUTE', origin: 'Missing', destination: 'Gateway' }, h.gis, h.services, new AbortController().signal);
  expect(result.ok).toBe(false); expect(h.state.route).toBeNull();
});
it('does not report success until the map movement completes', async () => {
  const h = harness();
  let complete!: () => void, settled = false;
  h.gis.flyTo = () => new Promise<void>(resolve => { complete = resolve; });
  const pending = executeCommand({ type: 'ZOOM_TO_LOCATION', location: 'Ahmedabad' }, h.gis, h.services, new AbortController().signal)
    .then(result => { settled = true; return result; });
  await new Promise<void>(resolve => setImmediate(resolve));
  expect(settled).toBe(false);
  complete();
  expect((await pending).ok).toBe(true);
});
it('reports failed or cancelled map movements instead of success', async () => {
  const h = harness(), controller = new AbortController();
  h.gis.flyTo = async () => { throw new Error('Map movement did not finish. Please retry.'); };
  const failed = await executeCommand({ type: 'ZOOM_TO_LOCATION', location: 'Ahmedabad' }, h.gis, h.services, controller.signal);
  expect(failed.ok).toBe(false);
  expect(failed.message).toContain('Map movement did not finish');
  h.gis.flyTo = async () => { controller.abort(); };
  const cancelled = await executeCommand({ type: 'ZOOM_TO_LOCATION', location: 'Ahmedabad' }, h.gis, h.services, controller.signal);
  expect(cancelled.code).toBe('cancelled');
});
