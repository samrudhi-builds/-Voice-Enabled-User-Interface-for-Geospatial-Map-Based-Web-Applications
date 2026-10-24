import type { GeographicServices } from '../gis/adapter';
import type { PoiLookup, Route } from '../types';

async function request<T>(path: string, params: Record<string, string | number>, signal: AbortSignal): Promise<T> {
  try {
    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    const response = await fetch(`/api/${path}?${query}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(45000)]) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'The geographic service is unavailable. Please retry.');
    return payload.data as T;
  } catch (error) {
    if (signal.aborted) throw error;
    if (error instanceof TypeError) throw new Error('Could not connect to GeoVoice. Check your connection and try again.');
    if (error instanceof Error && error.name === 'TimeoutError') throw new Error('The search took too long. Please retry.');
    throw error;
  }
}
export const geographicServices: GeographicServices = {
  geocode: (q, signal) => request('geocode', { q }, signal),
  nearby: async (center, category, radiusM, signal) => ({ center, category, radiusM, ...await request<PoiLookup>('poi', { lat: center.lat, lng: center.lng, category, radius: radiusM }, signal) }),
  route: async (origin, destination, signal) => {
    const route = await request<Route>('route', { from_lat: origin.lat, from_lng: origin.lng, to_lat: destination.lat, to_lng: destination.lng, origin: origin.label.slice(0, 200), destination: destination.label.slice(0, 200) }, signal);
    return { ...route, origin, destination };
  },
};
