import type { Command } from './types';
import type { Basemap, Category } from '../types';

const categoryNames: Record<string, Category> = {
  cafe: 'cafe', cafes: 'cafe', 'coffee shop': 'cafe', 'coffee shops': 'cafe',
  restaurant: 'restaurant', restaurants: 'restaurant', hospital: 'hospital', hospitals: 'hospital',
  park: 'park', parks: 'park', hotel: 'hotel', hotels: 'hotel',
  attraction: 'attraction', attractions: 'attraction', 'tourist attractions': 'attraction',
};
const unknown = (reason = 'Try “Zoom to Ahmedabad”, “Add marker at Pune”, or “Find cafes near Marine Drive”.'): Command => ({ type: 'UNKNOWN_COMMAND', reason });

export function parseCommand(input: string): Command {
  const text = input.trim().replace(/^please\s+/i, '').replace(/[.!?]+$/, '').replace(/\s+/g, ' ').trim();
  if (!text) return unknown('Enter a map command, or choose one of the examples below.');
  if (text.length > 400) return unknown('Keep commands under 400 characters.');
  const simple: Record<string, Command> = {
    'zoom in': { type: 'ZOOM_IN' }, 'zoom out': { type: 'ZOOM_OUT' },
    'remove marker': { type: 'REMOVE_MARKER' }, 'clear markers': { type: 'CLEAR_MARKERS' },
    'clear route': { type: 'CLEAR_ROUTE' }, 'reset map': { type: 'RESET_MAP' },
  };
  if (Object.hasOwn(simple, text.toLowerCase())) return simple[text.toLowerCase()];
  const layer = text.match(/^(show|hide) (.+)$/i);
  if (layer) {
    const layers: Record<string, Basemap> = { street: 'street', 'street map': 'street', 'road layer': 'street', roads: 'street', 'topographic map': 'topographic', topographic: 'topographic', terrain: 'topographic', 'terrain map': 'topographic' };
    const name = layer[2].toLowerCase();
    if (Object.hasOwn(layers, name)) return { type: layer[1].toLowerCase() === 'show' ? 'SHOW_LAYER' : 'HIDE_LAYER', layer: layers[name] };
    if (/highway|satellite/.test(name)) return unknown('Available basemaps are street and topographic. A separate highway overlay and satellite imagery are not included.');
  }
  const nearby = text.match(/^(?:find|show) (.+?) (?:near (.+)|within (\S+)\s*(km|m) of (.+))$/i);
  if (nearby) {
    if (!Object.hasOwn(categoryNames, nearby[1].toLowerCase())) return unknown('Nearby categories are cafes, restaurants, hospitals, parks, hotels and tourist attractions.');
    const radiusM = nearby[3] ? Number(nearby[3]) * (nearby[4].toLowerCase() === 'km' ? 1000 : 1) : 3000;
    if (!Number.isFinite(radiusM) || radiusM < 100 || radiusM > 10000) return unknown('Choose a nearby search radius between 100 m and 10 km.');
    return { type: 'FIND_NEARBY', category: categoryNames[nearby[1].toLowerCase()], location: nearby[2] || nearby[5], radiusM };
  }
  if (/^(find|show) (cafes?|coffee shops?|restaurants?|hospitals?|parks?|hotels?|(?:tourist )?attractions?)\b/i.test(text)) return unknown('Add a location: “Find cafes near Marine Drive” or “Find parks within 3 km of Powai”.');
  const route = text.match(/^(?:plan (?:a )?route|route|directions) from (.+?) to (.+)$/i);
  if (route) {
    if (/ by (walking|cycling|bike|bicycle|bus|transit|foot)$/i.test(route[2])) return unknown('Live routes support driving only. Walking, cycling and bus are illustrative emissions comparisons, not available route modes.');
    return { type: 'PLAN_ROUTE', origin: route[1], destination: route[2].replace(/ by (car|driving)$/i, '') };
  }
  const patterns: [RegExp, 'ZOOM_TO_LOCATION' | 'PAN_TO_LOCATION' | 'SEARCH_LOCATION' | 'ADD_MARKER'][] = [
    [/^zoom (?:in to|into|to) (.+)$/i, 'ZOOM_TO_LOCATION'], [/^(?:go|pan|navigate) to (.+)$/i, 'PAN_TO_LOCATION'],
    [/^(?:find|search(?: for)?|locate) (.+)$/i, 'SEARCH_LOCATION'], [/^(?:add|place|drop)(?: a)? marker (?:at|in) (.+)$/i, 'ADD_MARKER'],
  ];
  for (const [pattern, type] of patterns) {
    const match = text.match(pattern);
    if (match) return { type, location: match[1] };
  }
  const remove = text.match(/^remove(?: the)? marker (?:at|in) (.+)$/i);
  if (remove) return { type: 'REMOVE_MARKER', location: remove[1] };
  return unknown();
}
