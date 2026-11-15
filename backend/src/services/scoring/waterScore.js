import { calculateReferenceET0 } from './evapotranspiration.js';
const DAY=86400000, finite=Number.isFinite;
const sum=v=>v.reduce((a,b)=>a+b,0);
/** One-based growth day, FAO-56 eq66 linear development and late-stage interpolation. */
export function calculateDailyCropCoefficient(crop,day) {
  const p=crop.waterRequirements, stages=p?.stageDays;
  if (!stages || stages.length!==4 || !stages.every(v=>Number.isInteger(v)&&v>0) || ![p.kcInitial,p.kcMid,p.kcEnd].every(finite) || !p.sourceId || !Number.isInteger(day) || day<1 || day>sum(stages)) return null;
  const [a,b,c,d]=stages;
  return day<=a?p.kcInitial:day<=a+b?p.kcInitial+(p.kcMid-p.kcInitial)*(day-a)/b:day<=a+b+c?p.kcMid:p.kcMid+(p.kcEnd-p.kcMid)*(day-a-b-c)/d;
}
export const calculateDailyETc=(et0,kc)=>finite(et0)&&et0>=0&&finite(kc)&&kc>=0?et0*kc:null;
export const calculateSeasonalETc=values=>values.length&&values.every(v=>finite(v)&&v>=0)?sum(values):null;
export function calculateSeasonalPrecipitation(records) {
  const valid=records.filter(r=>finite(r.rainfallMm)&&r.rainfallMm>=0);
  return {value:records.length&&valid.length===records.length?sum(valid.map(r=>r.rainfallMm)):null,observedSubtotalMm:valid.length?sum(valid.map(r=>r.rainfallMm)):null,validDays:valid.length,expectedDays:records.length,coverage:records.length?100*valid.length/records.length:0,unit:'mm',source:'NASA POWER PRECTOTCORR',period:{start:records[0]?.date,end:records.at(-1)?.date}};
}
/** FAO irrigation training manual chapter 4: MONTHLY rainfall, gentle slopes only. */
export function calculateEffectiveRainfall(p,{gentleSlope=false}={}) {
  return gentleSlope&&finite(p)&&p>=0?Math.max(0,p<=75?.6*p-10:.8*p-25):null;
}
/** Irrigation means usable water delivered to the field; no assumed efficiency. */
export function calculateAvailableIrrigation(inputs={}) {
  if(inputs.irrigation==='rain-fed') return 0;
  if(!['limited','irrigated'].includes(inputs.irrigation)) return null;
  if(finite(inputs.seasonalLimitMm)&&inputs.seasonalLimitMm>=0) return inputs.seasonalLimitMm;
  return finite(inputs.irrigationVolumeM3)&&inputs.irrigationVolumeM3>=0&&finite(inputs.areaM2)&&inputs.areaM2>0?inputs.irrigationVolumeM3*1000/inputs.areaM2:null;
}
export const calculateWaterDeficit=(d,s)=>finite(d)&&d>0&&finite(s)&&s>=0?Math.max(0,d-s):null;
export const waterCoverageScore=(d,s)=>finite(d)&&d>0&&finite(s)&&s>=0?100*Math.max(0,Math.min(1,s/d)):null;
export function calculateWaterScore(crop,climate,priorities={}) {
  const missing=[], stages=crop.waterRequirements?.stageDays;
  const duration=stages?.length===4 && stages.every(v=>Number.isInteger(v)&&v>0) && sum(stages)<=366 && finite(Date.parse(climate?.period?.start))?sum(stages):0;
  if(calculateDailyCropCoefficient(crop,1)===null) missing.push('Verified crop coefficient and growth-stage profile unavailable');
  const start=climate?.period?.start, first=Date.parse(start);
  const byDate=new Map((climate?.daily??[]).map(r=>[r.date,r]));
  const records=Array.from({length:duration},(_,i)=>{const date=new Date(first+i*DAY).toISOString().slice(0,10);return byDate.get(date)??{date};});
  const period={start,end:records.at(-1)?.date};
  const et0=calculateReferenceET0(records,{latitude:climate?.provenance?.requestedCoordinates?.latitude,elevationM:climate?.provenance?.returnedCoordinates?.[2]});
  const daily=et0.daily.map((r,i)=>({...r,kc:calculateDailyCropCoefficient(crop,i+1),etcMm:calculateDailyETc(r.value,calculateDailyCropCoefficient(crop,i+1))}));
  const demand=calculateSeasonalETc(daily.map(r=>r.etcMm));
  if(!finite(demand)||demand<=0) missing.push('Complete daily ET0 inputs and a positive crop water demand');
  const rainfall=calculateSeasonalPrecipitation(records), months=[];
  for(const key of new Set(records.map(r=>r.date.slice(0,7)))) {
    const [year,month]=key.split('-').map(Number), days=new Date(Date.UTC(year,month,0)).getUTCDate();
    const monthRecords=Array.from({length:days},(_,i)=>byDate.get(key+'-'+String(i+1).padStart(2,'0'))??{});
    const precipitation=calculateSeasonalPrecipitation(monthRecords);
    const pe=calculateEffectiveRainfall(precipitation.value,{gentleSlope:priorities.slope==='gentle'});
    const cropDays=records.filter(r=>r.date.startsWith(key)).length;
    months.push({month:key,precipitationMm:precipitation.value,effectiveRainfallMm:pe,cropDays,calendarDays:days,allocatedMm:finite(pe)?pe*cropDays/days:null});
  }
  const effectiveRainfall=months.length&&months.every(m=>finite(m.allocatedMm))?sum(months.map(m=>m.allocatedMm)):null;
  if(priorities.slope!=='gentle') missing.push('Effective-rainfall model needs confirmation of level or gently sloping land (up to 5%)');
  if(!months.length||months.some(m=>m.precipitationMm===null)) missing.push('Complete calendar-month rainfall observations');
  const irrigation=calculateAvailableIrrigation(priorities);
  if(irrigation===null) missing.push('Usable seasonal irrigation amount not provided');
  const supply=finite(effectiveRainfall)&&finite(irrigation)?effectiveRainfall+irrigation:null;
  const score=missing.length?null:waterCoverageScore(demand,supply);
  const deficit=calculateWaterDeficit(demand,supply);
  const assumptions=['Initial soil-water storage is omitted (zero contribution); no root-zone simulation.', 'Monthly effective rain is allocated to partial crop months by days, assuming uniform distribution.', 'Reference Kc and stage durations are not locally calibrated: '+(crop.waterRequirements?.context??'unavailable'), 'Season starts on the first day of the selected month. Irrigation is usable field-delivered water.'];
  return {score,status:score===null?'incomplete':'seasonal_screening',formula:'100 * clamp((effective rainfall + usable irrigation) / ETc, 0, 1)',unit:'score 0-100',coverage:score===null?0:100,missing,period,durationDays:duration,waterDemandMm:demand,effectiveRainfallMm:effectiveRainfall,irrigationMm:irrigation,waterSupplyMm:supply,deficitMm:deficit,rainOnlyScore:waterCoverageScore(demand,effectiveRainfall),rainfall,et0,daily,monthlyRainfall:months,kcSource:crop.waterRequirements?.sourceId,assumptions,warnings:[...missing,...(deficit>0?['Estimated seasonal water shortfall: review irrigation availability before choosing this crop.']:[]),'Seasonal water coverage is preliminary; rainfall timing and local crop stages can change actual water stress.'],requiredInputs:['Daily temperature, humidity, solar radiation, wind, pressure, elevation','Crop Kc and stages','Complete monthly rain','Land slope','Usable irrigation amount'],sources:['https://www.fao.org/4/X0490E/x0490e0b.htm','https://www.fao.org/4/s2022e/s2022e08.htm']};
}
