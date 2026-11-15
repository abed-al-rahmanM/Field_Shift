import { lazy, Suspense, useState } from 'react';
import { validLocation } from '../../utils/location';
const FarmMap=lazy(()=>import('./FarmMap'));
export default function FarmLocationPicker({value,onChange,error='',readOnly=false}) {
  const [message,setMessage]=useState('');
  const [locating,setLocating]=useState(false);
  const [tileError,setTileError]=useState(false);
  function locate() {
    if(!navigator.geolocation){setMessage('Location is unavailable. Select your land on the map.');return;}
    setLocating(true);setMessage('');
    navigator.geolocation.getCurrentPosition(position=>{onChange({latitude:position.coords.latitude,longitude:position.coords.longitude});setLocating(false);},()=>{setMessage('Could not access your location. Select it on the map or enter coordinates.');setLocating(false);},{timeout:10000,enableHighAccuracy:false});
  }
  return <div className="location-picker" role="group" aria-label="Farm location" aria-describedby={error?'location-error':undefined}>
    {!readOnly && <><h3>Where is your farm?</h3><p className="field-note">Click the map to select your land.</p></>}
    {typeof window!=='undefined' && <Suspense fallback={<div className="farm-map map-placeholder">Loading map…</div>}><FarmMap value={value} onChange={onChange} readOnly={readOnly} onTileError={()=>setTileError(true)}/></Suspense>}
    {tileError && <p className="field-note">Map tiles could not load. You can still enter coordinates below.</p>}
    <div className="location-summary" aria-live="polite"><p>{validLocation(value)?`✓ Location selected: ${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`:'No location selected'}</p></div>
    {error && <p id="location-error" className="location-error" role="alert" tabIndex={-1}>{error}</p>}
    {!readOnly && <><button className="text-button" type="button" disabled={locating} onClick={locate}>{locating?'Locating…':'Use My Location'}</button>{message && <p className="field-note" role="status">{message}</p>}
      <details className="coordinates-fallback"><summary>Enter coordinates manually</summary><div className="form-grid">
        <label>Latitude<input aria-label="Latitude" type="number" step="any" min="-90" max="90" value={value?.latitude ?? ''} onChange={e=>onChange({...value,latitude:e.target.value===''?null:Number(e.target.value)})}/></label>
        <label>Longitude<input aria-label="Longitude" type="number" step="any" min="-180" max="180" value={value?.longitude ?? ''} onChange={e=>onChange({...value,longitude:e.target.value===''?null:Number(e.target.value)})}/></label>
      </div></details></>}
  </div>;
}

