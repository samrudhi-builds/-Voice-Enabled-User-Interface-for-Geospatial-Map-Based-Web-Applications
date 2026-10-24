import type { Basemap, Category } from '../types';

export type Command =
  | { type: 'ZOOM_IN' | 'ZOOM_OUT' | 'CLEAR_MARKERS' | 'CLEAR_ROUTE' | 'RESET_MAP' }
  | { type: 'ZOOM_TO_LOCATION' | 'PAN_TO_LOCATION' | 'SEARCH_LOCATION' | 'ADD_MARKER'; location: string }
  | { type: 'REMOVE_MARKER'; location?: string }
  | { type: 'SHOW_LAYER' | 'HIDE_LAYER'; layer: Basemap }
  | { type: 'FIND_NEARBY'; category: Category; location: string; radiusM: number }
  | { type: 'PLAN_ROUTE'; origin: string; destination: string }
  | { type: 'UNKNOWN_COMMAND'; reason: string };
