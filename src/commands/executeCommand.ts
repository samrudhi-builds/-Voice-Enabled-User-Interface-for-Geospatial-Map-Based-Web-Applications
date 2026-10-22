import type { Command } from './types';
import type { GeographicServices, GisAdapter } from '../gis/adapter';
export type CommandResult = { ok: boolean; message: string; code?: 'cancelled' | 'error' };
export async function executeCommand(command: Command, gis: GisAdapter, services: GeographicServices, signal: AbortSignal): Promise<CommandResult> {
  const success = (message: string): CommandResult => ({ ok: true, message });
  const resolve = async (query: string) => {
    const places = await services.geocode(query, signal);
    signal.throwIfAborted();
    if (!places.length) throw new Error('Couldn’t find that location. Try adding a city or state.');
    return places;
  };
  try {
    signal.throwIfAborted();
    switch (command.type) {
      case 'UNKNOWN_COMMAND': return { ok: false, code: 'error', message: command.reason };
      case 'ZOOM_IN': await gis.zoomIn(signal); signal.throwIfAborted(); return success('Zoomed in.');
      case 'ZOOM_OUT': await gis.zoomOut(signal); signal.throwIfAborted(); return success('Zoomed out.');
      case 'ZOOM_TO_LOCATION': case 'PAN_TO_LOCATION': case 'SEARCH_LOCATION': {
        const places = await resolve(command.location);
        gis.showLocations(places);
        await gis.flyTo(places[0], command.type === 'PAN_TO_LOCATION' ? undefined : 14, signal);
        signal.throwIfAborted();
        return success(`Showing ${places[0].label}${places.length > 1 ? ' · Other matches are available in results.' : ''}`);
      }
      case 'ADD_MARKER': {
        const [place] = await resolve(command.location);
        gis.addMarker(place, place.name); await gis.flyTo(place, 15, signal);
        signal.throwIfAborted();
        return success(`Marker added at ${place.label}.`);
      }
      case 'REMOVE_MARKER': return gis.removeMarker(command.location) ? success('Marker removed.') : { ok: false, code: 'error', message: 'No matching user marker. “Remove marker” removes the latest marker.' };
      case 'CLEAR_MARKERS': gis.clearMarkers(); return success('User markers cleared.');
      case 'SHOW_LAYER': gis.setLayer(command.layer); return success(`Showing the ${command.layer} basemap.`);
      case 'HIDE_LAYER': gis.hideLayer(command.layer); return success(`The ${command.layer} basemap is hidden; another basemap remains visible.`);
      case 'FIND_NEARBY': {
        const [center] = await resolve(command.location);
        const search = await services.nearby(center, command.category, command.radiusM, signal);
        signal.throwIfAborted(); gis.displayPOIs(search);
        const summary = search.results.length ? `Found ${search.results.length} ${command.category} places within ${command.radiusM / 1000} km of ${center.name}.` : `No ${command.category} places found within ${command.radiusM / 1000} km of ${center.name}. Try a wider radius or another place.`;
        return success(`${summary}${search.note ? ` ${search.note}` : ''}`);
      }
      case 'PLAN_ROUTE': {
        const [origin] = await resolve(command.origin);
        const [destination] = await resolve(command.destination);
        const route = await services.route(origin, destination, signal);
        signal.throwIfAborted(); gis.displayRoute(route);
        return success(`Driving route ready · ${(route.distanceM / 1000).toFixed(1)} km from ${origin.name} to ${destination.name}.`);
      }
      case 'CLEAR_ROUTE': gis.clearRoute(); return success('Route cleared.');
      case 'RESET_MAP': gis.reset(); return success('Map reset to Mumbai. Markers, route and results cleared.');
    }
  } catch (error) {
    if (signal.aborted) return { ok: false, code: 'cancelled', message: 'Command cancelled.' };
    return { ok: false, code: 'error', message: error instanceof Error ? error.message : 'That action could not be completed. Please retry.' };
  }
}
