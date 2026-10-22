import L from 'leaflet';
import type { GisAdapter } from './adapter';
import type { Basemap, Place, PoiSearch, Route, UserMarker } from '../types';

export const MUMBAI: [number, number] = [19.076, 72.8777];
export function createLeafletAdapter(getMap: () => L.Map | null, store: {
  getMarkers(): UserMarker[];
  setMarkers(markers: UserMarker[]): void;
  showLocations(places: Place[]): void;
  setLayer(layer: Basemap): void;
  getLayer(): Basemap;
  showPOIs(search: PoiSearch): void;
  showRoute(route: Route): void;
  clearRoute(): void;
  reset(): void;
}): GisAdapter {
  const map = () => { const value = getMap(); if (!value) throw new Error('The map is still loading. Please retry.'); return value; };
  const move = (action: (current: L.Map) => void, signal?: AbortSignal) => {
    signal?.throwIfAborted();
    const current = map().stop();
    return new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      const cleanup = () => { clearTimeout(timer); current.off('moveend', complete); signal?.removeEventListener('abort', abort); };
      const complete = () => { cleanup(); resolve(); };
      const fail = (error: unknown) => { cleanup(); current.stop(); reject(error); };
      const abort = () => fail(signal?.reason);
      current.once('moveend', complete);
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => fail(new Error('Map movement did not finish. Please retry.')), 5000);
      try { action(current); } catch (error) { fail(error); }
    });
  };
  const fit = (points: [number, number][]) => {
    const size = map().getSize(), mobile = window.matchMedia('(max-width: 760px)').matches;
    map().fitBounds(L.latLngBounds(points), {
      paddingTopLeft: mobile ? [24, 80] : [35, 95],
      paddingBottomRight: mobile ? [24, Math.min(size.y * .48 + 125, size.y - 150)] : [Math.min(380, size.x * .45), 45],
      maxZoom: 16, animate: false,
    });
  };
  return {
    zoomIn: signal => move(current => { current.zoomIn(); }, signal), zoomOut: signal => move(current => { current.zoomOut(); }, signal),
    flyTo: (point, zoom, signal) => move(current => { current.flyTo([point.lat, point.lng], zoom ?? current.getZoom(), { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, duration: 0.6 }); }, signal),
    showLocations: store.showLocations,
    addMarker: (point, name) => store.setMarkers([...store.getMarkers(), { ...point, name, id: crypto.randomUUID(), source: 'command' }]),
    removeMarker: nameOrId => {
      const markers = store.getMarkers();
      const index = nameOrId ? markers.findLastIndex(marker => marker.id === nameOrId || marker.name.toLocaleLowerCase() === nameOrId.toLocaleLowerCase()) : markers.length - 1;
      if (index < 0) return false;
      store.setMarkers(markers.filter((_, i) => i !== index)); return true;
    },
    clearMarkers: () => store.setMarkers([]), setLayer: store.setLayer,
    hideLayer: layer => { if (store.getLayer() === layer) store.setLayer(layer === 'street' ? 'topographic' : 'street'); },
    displayPOIs: search => { store.showPOIs(search); const bounds = L.latLng(search.center.lat, search.center.lng).toBounds(search.radiusM * 2); fit([[bounds.getSouth(), bounds.getWest()], [bounds.getNorth(), bounds.getEast()]]); },
    displayRoute: route => { store.showRoute(route); fit(route.geometry); }, clearRoute: store.clearRoute,
    reset: () => { store.reset(); map().setView(MUMBAI, 12, { animate: false }); },
  };
}
