import { NASA_PARAMETERS } from '../config.js';
import { average, round } from '../utils/math.js';
import { getClimateAnalysisPeriod } from './climatePeriod.js';

const API = 'https://power.larc.nasa.gov/api/temporal/daily/point';
const DAY = 86400000;
const cache = new Map();
export function clearClimateCache() { cache.clear(); }
const finiteValues = (records, key) => records.map(row => row[key]).filter(Number.isFinite);
export function aggregateClimate(records) {
  const temp = finiteValues(records, 'temperatureC'), low = finiteValues(records, 'minC'), high = finiteValues(records, 'maxC'), rain = finiteValues(records, 'rainfallMm'), humidity = finiteValues(records, 'humidityPct');
  return { averageTemperatureC: temp.length ? round(average(temp)) : null, minimumTemperatureC: low.length ? round(Math.min(...low)) : null, maximumTemperatureC: high.length ? round(Math.max(...high)) : null, totalRainfallMm: rain.length ? round(rain.reduce((a,b)=>a+b,0)) : null, averageHumidityPct: humidity.length ? round(average(humidity)) : null };
}
export function calculateSeasonalClimateFeatures(records, { heatThresholdC = null, frostThresholdC = null } = {}) {
  return { heatEvents: Number.isFinite(heatThresholdC) ? records.filter(day => Number.isFinite(day.maxC) && day.maxC > heatThresholdC).length : null, frostEvents: Number.isFinite(frostThresholdC) ? records.filter(day => Number.isFinite(day.minC) && day.minC < frostThresholdC).length : null, formula: 'daily-threshold-event-count-v1', warnings: [!Number.isFinite(heatThresholdC) && 'Heat events unavailable without a verified crop-specific threshold.', !Number.isFinite(frostThresholdC) && 'Frost events unavailable without a verified crop-specific threshold.'].filter(Boolean) };
}
export function buildNasaUrl({ latitude, longitude, start, end, timeStandard = 'LST' }) {
  if (!Number.isFinite(latitude) || Math.abs(latitude)>90 || !Number.isFinite(longitude) || Math.abs(longitude)>180) throw Object.assign(new Error('Choose a valid farm location.'), { status:400 });
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  if (!validDate(start) || !validDate(end) || start>end || start<'1981-01-01' || (Date.parse(end)-Date.parse(start))/DAY>366 || end>=new Date().toISOString().slice(0,10) || !['LST','UTC'].includes(timeStandard)) throw Object.assign(new Error('Choose a valid completed observation period of at most one year.'), { status:400 });
  return API + '?' + new URLSearchParams({ parameters: NASA_PARAMETERS.join(','), community:'AG', latitude:String(latitude), longitude:String(longitude), start:start.replaceAll('-',''), end:end.replaceAll('-',''), format:'JSON', 'time-standard':timeStandard });
}
export function normalizeNasaResponse(raw, request, url, retrievedAt = new Date().toISOString()) {
  const values = raw?.properties?.parameter;
  if (!values) throw Object.assign(new Error('NASA returned no usable observations.'), {status:502,expose:true,code:'NASA_UNAVAILABLE'});
  const units = Object.fromEntries(NASA_PARAMETERS.map(code=>[code,raw.parameters?.[code]?.units ?? 'unknown']));
  for (const code of ['T2M','T2M_MIN','T2M_MAX']) if (!['C','°C','degC'].includes(units[code])) throw Object.assign(new Error('NASA returned unsupported temperature units.'), {status:502,expose:true,code:'NASA_UNITS'});
  if (!['mm/day','mm d-1'].includes(units.PRECTOTCORR) || units.RH2M !== '%') throw Object.assign(new Error('NASA returned unsupported observation units.'), {status:502,expose:true,code:'NASA_UNITS'});
  const fill = raw.header?.fill_value ?? -999;
  const read = (code,key) => { const v=values[code]?.[key]; return Number.isFinite(v) && v !== fill && v !== -999 ? v : null; };
  const daily = [];
  for(let d=Date.parse(request.start);d<=Date.parse(request.end);d+=DAY) {
    const date=new Date(d).toISOString().slice(0,10), key=date.replaceAll('-','');
    const row={ date, temperatureC:read('T2M',key), minC:read('T2M_MIN',key), maxC:read('T2M_MAX',key), rainfallMm:read('PRECTOTCORR',key), humidityPct:read('RH2M',key) };
    row.wind2mMs=units.WS2M==='m/s'?read('WS2M',key):null;
    row.pressureKpa=units.PS==='kPa'?read('PS',key):null;
    const solar=read('ALLSKY_SFC_SW_DWN',key);
    row.solarRadiationMJ=solar===null?null:['MJ/m^2/day','MJ/m2/day'].includes(units.ALLSKY_SFC_SW_DWN)?solar:units.ALLSKY_SFC_SW_DWN==='kW-hr/m^2/day'?solar*3.6:null;
    if (row.wind2mMs<0) row.wind2mMs=null;
    if (row.pressureKpa<=0) row.pressureKpa=null;
    if (row.solarRadiationMJ<0) row.solarRadiationMJ=null;
    if (row.rainfallMm<0) row.rainfallMm=null;
    if (row.humidityPct<0 || row.humidityPct>100) row.humidityPct=null;
    if (row.minC!=null && row.maxC!=null && row.minC>row.maxC) { row.minC=null; row.maxC=null; }
    daily.push(row);
  }
  const observed=daily.filter(row=>Number.isFinite(row.temperatureC));
  if(!observed.length) throw Object.assign(new Error('NASA has no valid T2M observations for this period yet. Choose a completed season or try later.'), {status:502,expose:true,code:'NASA_NO_OBSERVATIONS'});
  const parameterCoverage=Object.fromEntries(Object.entries({T2M:'temperatureC',T2M_MIN:'minC',T2M_MAX:'maxC',PRECTOTCORR:'rainfallMm',RH2M:'humidityPct',WS2M:'wind2mMs',PS:'pressureKpa',ALLSKY_SFC_SW_DWN:'solarRadiationMJ'}).map(([code,key])=>[code,finiteValues(daily,key).length]));
  return { source:'NASA POWER Daily API', kind:'historical gridded observations', provider:'NASA POWER', parameter:'T2M', sourceType:'historical_observation', timeStandard:request.timeStandard ?? 'LST', dataStatus:'live_nasa', period:{start:request.start,end:request.end}, retrievedAt, latestObservationDate:observed.at(-1).date, validDays:observed.length, missingDays:daily.length-observed.length, observationCoveragePercent:round(observed.length/daily.length*100), parameterCoverage, summary:aggregateClimate(daily), seasonalFeatures:calculateSeasonalClimateFeatures(daily), daily,
    provenance:{dataset:'NASA POWER meteorological parameters (primarily MERRA-2 assimilation)',apiUrl:url,requestedParameters:NASA_PARAMETERS,units,requestedCoordinates:{latitude:request.latitude,longitude:request.longitude},returnedCoordinates:raw.geometry?.coordinates ?? null,timeStandard:request.timeStandard ?? 'LST',spatialResolution:'Parameter-dependent POWER native grid.',spatialNote:'Regional gridded observations; not field sensors or future weather.'} };
}
async function fetchWithTimeout(url, fetcher, attempt=0) {
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),12000);
  try {
    const response=await fetcher(url,{signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok) {
      if(attempt===0 && [502,503,504].includes(response.status)) return await fetchWithTimeout(url,fetcher,1);
      throw Object.assign(new Error(`NASA observations are unavailable (HTTP ${response.status}). Try again later or choose a completed season.`),{status:502,expose:true,code:'NASA_UNAVAILABLE'});
    }
    return await response.json();
  } catch(error) {
    if(error.name==='AbortError') throw Object.assign(new Error('NASA did not respond in time. Please try again.'),{status:504,expose:true,code:'NASA_TIMEOUT'});
    throw error;
  } finally { clearTimeout(timer); }
}
export async function getClimate(request, { fetcher=globalThis.fetch, now=Date.now() }={}) {
  const url=buildNasaUrl(request), saved=cache.get(url);
  if(saved && now-saved.savedAt<saved.ttl) return {...saved.value,cache:'memory',dataStatus:'cached_nasa'};
  const value=normalizeNasaResponse(await fetchWithTimeout(url,fetcher),request,url,new Date(now).toISOString());
  // Recent or incomplete observations are rechecked quickly; completed archives cache longer.
  const recent=Date.parse(request.end)>now-30*DAY;
  const ttl=(recent || value.missingDays>0) ? 15*60*1000 : 24*60*60*1000;
  if(cache.size>=100) cache.delete(cache.keys().next().value);
  cache.set(url,{value,savedAt:now,ttl});
  return {...value,cache:'fresh'};
}
export async function getSeasonClimate(farm, options={}) {
  const selection=getClimateAnalysisPeriod({plantingMonth:farm.plantingMonth,plantingYear:farm.plantingYear,cropDurationDays:options.cropDurationDays,fullMonths:!!options.cropDurationDays,currentDate:options.currentDate ?? new Date()});
  const result=await getClimate({latitude:farm.latitude,longitude:farm.longitude,start:selection.start,end:selection.end},options);
  return {...result,periodType:selection.periodType,requestedPlantingSeason:selection.requestedPlantingSeason,observationPeriods:[result.period],dateSelectionReason:selection.reason,plannedPeriod:selection.plannedPeriod,incompleteSeason:selection.incompleteSeason,windowBasis:selection.windowBasis,sourceType:selection.periodType==='historical_baseline'?'historical_baseline':'historical_observation'};
}
export async function fetchNASAClimate({ latitude,longitude,startDate,endDate }) { return getClimate({latitude,longitude,start:startDate,end:endDate}); }
export const normalizeNASAResponse=normalizeNasaResponse;
export function historicalWindow(plantingMonth,plantingYear) { const result=getClimateAnalysisPeriod({plantingMonth,plantingYear}); return {...result,label:result.reason}; }

