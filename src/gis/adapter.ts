import type { Basemap, Coordinates, Place, PoiSearch, Route } from '../types';

/** Implement this interface to connect the command engine to another GIS library. */
export interface GisAdapter {
  zoomIn(signal?: AbortSignal): void | Promise<void>;
  zoomOut(signal?: AbortSignal): void | Promise<void>;
  flyTo(point: Coordinates, zoom?: number, signal?: AbortSignal): void | Promise<void>;
  showLocations(places: Place[]): void;
  addMarker(point: Coordinates, name: string): void;
  removeMarker(nameOrId?: string): boolean;
  clearMarkers(): void;
  setLayer(layer: Basemap): void;
  hideLayer(layer: Basemap): void;
  displayPOIs(search: PoiSearch): void;
  displayRoute(route: Route): void;
  clearRoute(): void;
  reset(): void;
}
export interface GeographicServices {
  geocode(query: string, signal: AbortSignal): Promise<Place[]>;
  nearby(center: Place, category: PoiSearch['category'], radiusM: number, signal: AbortSignal): Promise<PoiSearch>;
  route(origin: Place, destination: Place, signal: AbortSignal): Promise<Route>;
}
