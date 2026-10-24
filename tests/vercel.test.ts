import { createServer } from 'node:http';
import type { RequestListener } from 'node:http';
import { afterEach, expect, it, vi } from 'vitest';

const nativeFetch = globalThis.fetch;
afterEach(() => {
  vi.doUnmock('node:fs/promises');
  vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules();
});

async function withServer(handler: RequestListener, check: (base: string) => Promise<void>) {
  const server = createServer(handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address');
    await check(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

it('serves the existing geographic API through Vercel entry points on an HTTPS origin', async () => {
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('GEOCODING_URL', 'https://geocode-test.invalid/search');
  vi.stubEnv('OVERPASS_URL', 'https://poi-test.invalid/interpreter');
  vi.stubEnv('ROUTING_URL', 'https://route-test.invalid/route/v1/driving');
  vi.stubGlobal('fetch', async (input: string | URL) => {
    const url = new URL(String(input));
    if (url.hostname === 'geocode-test.invalid' && url.searchParams.get('q') === 'Ahmedabad') return Response.json([{ osm_type: 'node', osm_id: 1, name: 'Ahmedabad', display_name: 'Ahmedabad, Gujarat, India', lat: '23.0215', lon: '72.5801' }]);
    if (url.hostname === 'poi-test.invalid') return Response.json({ elements: [{ type: 'node', id: 2, lat: 23.0215, lon: 72.5801, tags: { amenity: 'cafe', name: 'Provider cafe' } }] });
    if (url.hostname === 'route-test.invalid' && url.pathname.endsWith('/72.5801,23.0215;72.59,23.03')) return Response.json({ code: 'Ok', routes: [{ distance: 1200, duration: 180, geometry: { type: 'LineString', coordinates: [[72.5801, 23.0215], [72.59, 23.03]] } }] });
    throw new Error('Unexpected upstream request');
  });
  const { default: health } = await import('../api/health');
  const { default: geocode } = await import('../api/geocode');
  const { default: poi } = await import('../api/poi');
  const { default: route } = await import('../api/route');
  const handlers: Record<string, RequestListener> = { health, geocode, poi, route };
  await withServer((req, res) => { handlers[new URL(req.url!, 'https://geovoice.example').pathname.slice(5)](req, res); }, async base => {
    // Model HTTPS termination while the test transport itself uses loopback HTTP.
    const headers = { origin: `https://${new URL(base).host}` };
    const status = await nativeFetch(`${base}/api/health`, { headers });
    expect(status.status).toBe(200);
    expect(await status.json()).toMatchObject({ status: 'ok', routingMode: 'driving' });
    const location = await nativeFetch(`${base}/api/geocode?q=Ahmedabad`, { headers });
    expect(location.status).toBe(200);
    expect((await location.json()).data[0]).toMatchObject({ name: 'Ahmedabad', lat: 23.0215, lng: 72.5801 });
    const nearby = await nativeFetch(`${base}/api/poi?lat=23.0215&lng=72.5801&category=cafe&radius=3000`, { headers });
    expect(nearby.status).toBe(200);
    expect((await nearby.json()).data.results[0]).toMatchObject({ name: 'Provider cafe', distanceM: 0 });
    const journey = await nativeFetch(`${base}/api/route?from_lat=23.0215&from_lng=72.5801&to_lat=23.03&to_lng=72.59&origin=Ahmedabad&destination=Destination`, { headers });
    expect(journey.status).toBe(200);
    expect((await journey.json()).data).toMatchObject({ distanceM: 1200, mode: 'driving', geometry: [[23.0215, 72.5801], [23.03, 72.59]] });
    expect((await nativeFetch(`${base}/api/health`, { headers, method: 'POST' })).status).toBe(405);
    expect((await nativeFetch(`${base}/api/health`, { headers: { ...headers, origin: 'https://another.example' } })).status).toBe(403);
  });
});

it('uses the warm-instance memory cache on Vercel without accessing the deployment filesystem', async () => {
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('GEOCODING_URL', 'https://readonly-test.invalid/search');
  let filesystemAttempts = 0, providerRequests = 0;
  const readOnly = async () => { filesystemAttempts++; throw Object.assign(new Error('Read-only deployment'), { code: 'EROFS' }); };
  vi.doMock('node:fs/promises', async () => ({
    ...await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises'),
    readFile: readOnly, mkdir: readOnly, writeFile: readOnly, rename: readOnly,
  }));
  vi.stubGlobal('fetch', async () => {
    providerRequests++;
    return Response.json([{ osm_type: 'node', osm_id: 3, name: 'Pune', display_name: 'Pune, India', lat: '18.52', lon: '73.85' }]);
  });
  const { handleApi } = await import('../server/api');
  await withServer((req, res) => { void handleApi(req, res); }, async base => {
    const first = await nativeFetch(`${base}/api/geocode?q=Pune`);
    expect(first.status).toBe(200);
    expect((await first.json()).data[0].name).toBe('Pune');
    const second = await nativeFetch(`${base}/api/geocode?q=Pune`);
    expect((await second.json()).cached).toBe(true);
    expect(providerRequests).toBe(1);
    expect(filesystemAttempts).toBe(0);
  });
});
