import { createServer } from 'node:http';
import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

it('serves real normalized fallback results when the upstream Overpass provider fails', async () => {
  const nativeFetch = globalThis.fetch;
  const testId = crypto.randomUUID();
  vi.stubEnv('OVERPASS_URL', `https://overpass-test.invalid/${testId}/interpreter`);
  vi.stubEnv('PHOTON_URL', `https://photon-test.invalid/${testId}/reverse`);
  vi.stubGlobal('fetch', async (input: string | URL) => {
    const url = new URL(String(input));
    if (url.hostname === 'overpass-test.invalid') return new Response('At capacity', { status: 503 });
    if (url.hostname !== 'photon-test.invalid' || url.searchParams.get('osm_tag') !== 'amenity:cafe' || url.searchParams.get('radius') !== '3') throw new Error('Unexpected external request');
    return Response.json({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { osm_type: 'N', osm_id: 123, osm_key: 'amenity', osm_value: 'cafe', name: 'Provider cafe' }, geometry: { type: 'Point', coordinates: [72.835, 18.922] } }] });
  });
  const { handleApi } = await import('../server/api');
  const server = createServer((req, res) => { void handleApi(req, res); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('No local address');
    const response = await nativeFetch(`http://127.0.0.1:${address.port}/api/poi?lat=18.922&lng=72.835&category=cafe&radius=3000`);
    const payload = await response.json();
    expect(response.status).toBe(200); expect(payload.data.provider).toBe('Photon');
    expect(payload.data.results[0]).toMatchObject({ name: 'Provider cafe', lat: 18.922, lng: 72.835, distanceM: 0 });
    expect(payload.data.note).toContain('Overpass');
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
