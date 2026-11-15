import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerUrl from 'leaflet/dist/images/marker-icon.png';
import markerRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { validLocation } from '../../utils/location';
const icon=L.icon({iconUrl:markerUrl,iconRetinaUrl:markerRetinaUrl,shadowUrl,iconSize:[25,41],iconAnchor:[12,41],shadowSize:[41,41]});
function Selection({value,onChange,readOnly}) {
  const map=useMap();
  useMapEvents({click:event=>{if(!readOnly){const point=event.latlng.wrap();onChange({latitude:point.lat,longitude:point.lng});}}});
  useEffect(()=>{if(validLocation(value))map.setView([value.latitude,value.longitude],Math.max(map.getZoom(),12),{animate:false});},[value?.latitude,value?.longitude,map]);
  if(!validLocation(value))return null;
  return <Marker position={[value.latitude,value.longitude]} icon={icon} draggable={!readOnly} eventHandlers={{dragend:event=>{const point=event.target.getLatLng().wrap();onChange({latitude:point.lat,longitude:point.lng});}}}/>;
}
export default function FarmMap({value,onChange,readOnly=false,onTileError}) {
  return <MapContainer className="farm-map" center={validLocation(value)?[value.latitude,value.longitude]:[33.9,35.8]} zoom={validLocation(value)?12:7} scrollWheelZoom={false} worldCopyJump>
    <TileLayer url={import.meta.env.VITE_OSM_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' maxZoom={19} eventHandlers={{tileerror:()=>onTileError?.()}}/>
    <Selection value={value} onChange={onChange} readOnly={readOnly}/>
  </MapContainer>;
}

