import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Basemap, Coordinates, Place, PoiSearch, Route, UserMarker } from '../types';
import { MUMBAI } from '../gis/leafletAdapter';

const icons = {
  user: L.divIcon({ className: 'map-marker', html: '<span class="pin pin-user"><span></span></span>', iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -30] }),
  place: L.divIcon({ className: 'map-marker', html: '<span class="pin pin-place"><span></span></span>', iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -30] }),
  poi: L.divIcon({ className: 'poi-marker', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] }),
};
function MapBridge({ onReady, onPosition, onClick }: { onReady(map: L.Map): void; onPosition(center: Coordinates, zoom: number): void; onClick(point: Coordinates): void }) {
  const map = useMap();
  useMapEvents({ moveend: () => onPosition(map.getCenter(), map.getZoom()), click: event => onClick(event.latlng) });
  useEffect(() => {
    onReady(map); onPosition(map.getCenter(), map.getZoom());
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(map.getContainer()); return () => observer.disconnect();
  }, [map, onReady, onPosition]);
  return null;
}
type Props = {
  layer: Basemap; markers: UserMarker[]; places: Place[]; poi: PoiSearch | null; route: Route | null; selectedId: string | null;
  onReady(map: L.Map): void; onPosition(point: Coordinates, zoom: number): void;
  onMapClick(point: Coordinates): void; onRemove(id: string): void;
};
export function MapView(props: Props) {
  const [tileFailure, setTileFailure] = useState(false);
  useEffect(() => setTileFailure(false), [props.layer]);
  return <>
    <MapContainer center={MUMBAI} zoom={12} minZoom={3} maxZoom={19} zoomControl={false} scrollWheelZoom className="gis-map" aria-label="Interactive geographic map">
      {props.layer === 'street' ? <TileLayer key="street" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'} eventHandlers={{ tileerror: () => setTileFailure(true) }} /> : <TileLayer key="topographic" url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" maxNativeZoom={17} maxZoom={19} attribution={'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'} eventHandlers={{ tileerror: () => setTileFailure(true) }} />}
      <MapBridge onReady={props.onReady} onPosition={props.onPosition} onClick={props.onMapClick} />
      {props.markers.map(marker => <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={icons.user}><Popup><strong>{marker.name}</strong><p>User marker · {marker.source === 'click' ? 'Map click' : 'Command'}</p><p>{marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}</p><button className="popup-remove" onClick={() => props.onRemove(marker.id)}>Remove marker</button></Popup></Marker>)}
      {props.places.map(place => <Marker key={place.id} position={[place.lat, place.lng]} icon={icons.place}><Popup><strong>{place.name}</strong><p>{place.label}</p><p>{place.source}</p></Popup></Marker>)}
      {props.poi && <Circle center={[props.poi.center.lat, props.poi.center.lng]} radius={props.poi.radiusM} pathOptions={{ color: '#178d7c', weight: 1, dashArray: '5 6', fillOpacity: 0.035 }} />}
      {props.poi?.results.map(poi => <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={icons.poi}><Popup><strong>{poi.name}</strong><p>{poi.category} · {Math.round(poi.distanceM)} m from center</p><p>{poi.address || `${poi.lat.toFixed(5)}, ${poi.lng.toFixed(5)}`}</p></Popup></Marker>)}
      {props.selectedId && [...props.places, ...(props.poi?.results || [])].filter(p => p.id === props.selectedId).map(point => <CircleMarker key={`selected-${point.id}`} center={[point.lat, point.lng]} radius={17} pathOptions={{ color: '#155e75', fillColor: '#2dd4bf', fillOpacity: 0.2, weight: 2 }} />)}
      {props.route && <><Polyline positions={props.route.geometry} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.95 }} /><Polyline positions={props.route.geometry} pathOptions={{ color: '#137d73', weight: 5, opacity: 1 }} />{[props.route.origin, props.route.destination].map((point, i) => <CircleMarker key={i} center={[point.lat, point.lng]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: i ? '#153443' : '#159785', fillOpacity: 1 }}><Popup>{i ? 'Destination' : 'Origin'}: {point.label}</Popup></CircleMarker>)}</>}
    </MapContainer>
    {tileFailure && <div className="tile-warning" role="status">Some map tiles are unavailable. Try the other basemap or check your connection.</div>}
  </>;
}
