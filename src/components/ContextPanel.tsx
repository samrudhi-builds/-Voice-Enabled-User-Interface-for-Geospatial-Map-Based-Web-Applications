import { ArrowUpRight, Bike, Bus, Car, Footprints, Leaf, MapPin, Navigation, Route as RouteIcon, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { emissionFactors, estimateEmissions } from '../config/emissions';
import type { Place, Poi, PoiSearch, Route, UserMarker } from '../types';

export type Context = 'search' | 'pois' | 'route' | 'markers' | null;
function CarbonComparison({ distanceKm }: { distanceKm: number }) {
  const [factors, setFactors] = useState({ ...emissionFactors });
  const modes = [{ key: 'car' as const, label: 'Car', icon: Car }, { key: 'bus' as const, label: 'Bus', icon: Bus }, { key: 'walking' as const, label: 'Walking', icon: Footprints }, { key: 'cycling' as const, label: 'Cycling', icon: Bike }];
  const max = Math.max(...modes.map(mode => estimateEmissions(distanceKm, factors[mode.key])), 0.001);
  return <section className="carbon-section" aria-label="Estimated carbon emissions">
    <div className="section-heading"><span><Leaf size={15} /> Travel a little lighter</span><span className="tag">ESTIMATES</span></div>
    <p className="muted small">Illustrative CO₂e for the same {(distanceKm).toFixed(1)} km distance.</p>
    <div className="carbon-bars">{modes.map(({ key, label, icon: Icon }) => {
      const kg = estimateEmissions(distanceKm, factors[key]);
      return <div className={`carbon-row ${key}`} key={key}><Icon size={15} /><span>{label}</span><div className="bar-track"><span style={{ width: `${Math.max(kg / max * 100, kg ? 3 : 0)}%` }} /></div><strong>{kg.toFixed(2)} <small>kg</small></strong></div>;
    })}</div>
    <p className="green-note"><Leaf size={14} /> Lowest direct emissions: walking & cycling.</p>
    <details className="methodology"><summary>Methodology & adjustable factors</summary>
      <p>kg CO₂e = distance in km × factor in kg/km. These are illustrative assumptions, not measured emissions.</p>
      <div className="factor-fields">{(['car', 'bus'] as const).map(mode => <label key={mode}>{mode === 'car' ? 'Car (one occupant)' : 'Bus (per passenger)'}<input aria-label={`${mode} emissions factor`} type="number" min="0" max="10" step="0.001" value={factors[mode]} onChange={e => { const value = Number(e.target.value); if (Number.isFinite(value) && value >= 0 && value <= 10) setFactors(previous => ({ ...previous, [mode]: value })); }} /><span>kg/km</span></label>)}</div>
      <p>Walking and cycling use zero direct operational emissions; lifecycle and food emissions are excluded. Traffic, vehicle type and local energy mix are excluded. Default car and bus assumptions are not calibrated to local fleets.</p>
    </details>
    <p className="disclaimer">Driving geometry only. Walking, cycling and bus routes or services have not been checked.</p>
  </section>;
}
type Props = {
  context: Context; places: Place[]; poi: PoiSearch | null; route: Route | null; markers: UserMarker[]; selectedId: string | null;
  onClose(): void; onFocus(place: Place | Poi | UserMarker): void; onRemoveMarker(id: string): void; onClearRoute(): void;
};
export function ContextPanel(props: Props) {
  if (!props.context) return null;
  const title = props.context === 'route' ? 'Your journey' : props.context === 'pois' ? 'Nearby discoveries' : props.context === 'markers' ? 'Your markers' : 'Location results';
  return <aside className="context-panel" aria-label={title}>
    <div className="context-header"><div><span className="eyebrow">ON THE MAP</span><h2>{title}</h2></div><button className="icon-button" onClick={props.onClose} aria-label="Close results"><X size={18} /></button></div>
    <div className="context-scroll">
      {props.context === 'route' && props.route && <>
        <div className="route-stops"><div><i className="stop-dot start" /><span><small>FROM</small><strong>{props.route.origin.name}</strong><span>{props.route.origin.label}</span></span></div><div><i className="stop-dot end" /><span><small>TO</small><strong>{props.route.destination.name}</strong><span>{props.route.destination.label}</span></span></div></div>
        <div className="route-metrics"><div><strong>{(props.route.distanceM / 1000).toFixed(1)}<small> km</small></strong><span>Route distance</span></div><div><strong>{Math.round(props.route.durationS / 60)}<small> min</small></strong><span>Estimated drive</span></div></div>
        <div className="source-line"><Car size={14} /> Driving · OSRM / OpenStreetMap</div>
        <CarbonComparison key={`${props.route.origin.id}:${props.route.destination.id}:${props.route.distanceM}`} distanceKm={props.route.distanceM / 1000} />
        <button className="text-button clear-route" onClick={props.onClearRoute}><Trash2 size={14} /> Clear this route</button>
      </>}
      {props.context === 'pois' && props.poi && <>
        <div className="results-summary"><span className="result-count">{props.poi.results.length}</span><p>{props.poi.category} places within {props.poi.radiusM / 1000} km of <strong>{props.poi.center.name}</strong></p></div>
        <p className="result-origin">Search center: {props.poi.center.label}</p>
        <div className="source-line"><span className="status-dot" /> {props.poi.provider || 'Overpass'}{props.poi.provider === 'Photon' ? ' fallback' : ''} · OpenStreetMap data</div>
        {props.poi.note && <p className="provider-note">{props.poi.note}</p>}
        {!props.poi.results.length && <div className="panel-empty"><MapPin size={24} /><h3>No places found here</h3><p>Try another location or a wider radius, up to 10 km. Map coverage varies.</p></div>}
        <div className="results-list">{props.poi.results.map((poi, i) => <button key={poi.id} className={`result-card ${props.selectedId === poi.id ? 'selected' : ''}`} onClick={() => props.onFocus(poi)}><span className="result-number">{String(i + 1).padStart(2, '0')}</span><span className="result-details"><strong>{poi.name}</strong><span>{poi.address || `${poi.lat.toFixed(4)}, ${poi.lng.toFixed(4)}`}</span><small>{poi.category} · {(poi.distanceM / 1000).toFixed(2)} km from center</small></span><ArrowUpRight size={16} /></button>)}</div>
        <p className="disclaimer">Up to 40 places from a bounded OSM query, live or cached. Distances are straight-line estimates; results may be incomplete.</p>
      </>}
      {props.context === 'search' && <><p className="panel-intro">Select a match to focus the map. Add a city or state to make your search more precise.</p><div className="results-list">{props.places.map(place => <button className={`result-card ${props.selectedId === place.id ? 'selected' : ''}`} key={place.id} onClick={() => props.onFocus(place)}><span className="result-icon"><MapPin size={18} /></span><span className="result-details"><strong>{place.name}</strong><span>{place.label}</span><small>{place.lat.toFixed(5)}, {place.lng.toFixed(5)}</small></span><Navigation size={15} /></button>)}</div><p className="disclaimer">{props.places[0]?.source === 'Coordinates' ? 'Literal coordinates supplied by you.' : 'Nominatim / OpenStreetMap · live or cached provider data.'}</p></>}
      {props.context === 'markers' && <>
        {!props.markers.length ? <div className="panel-empty"><MapPin size={25} /><h3>A place worth remembering</h3><p>Use “Add marker at Pune” or enable the pin tool and click the map.</p></div> : props.markers.map(marker => <div className="marker-list-item" key={marker.id}><button className="marker-focus" onClick={() => props.onFocus(marker)}><MapPin size={18} /><span><strong>{marker.name}</strong><small>{marker.lat.toFixed(4)}, {marker.lng.toFixed(4)} · {marker.source}</small></span></button><button className="icon-button" aria-label={`Remove ${marker.name} marker`} onClick={() => props.onRemoveMarker(marker.id)}><Trash2 size={15} /></button></div>)}
      </>}
      {props.context === 'route' && !props.route && <div className="panel-empty"><RouteIcon size={24} /><h3>Connect two places</h3><p>Enter an origin and destination in the route planner to see a driving route and emissions comparison.</p></div>}
    </div>
  </aside>;
}
