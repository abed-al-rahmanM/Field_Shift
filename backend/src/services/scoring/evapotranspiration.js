/** FAO-56 equations 6-8, 11-13, 19, 21-25, 37-40. Daily grass reference. */
export const saturationPressure = t => .6108 * Math.exp(17.27*t/(t+237.3));
export function penmanMonteith({temperatureC:t, pressureKpa:p, wind2mMs:u, netRadiation:r, actualVapourPressure:ea, saturationVapourPressure:es}) {
  if (![t,p,u,r,ea,es].every(Number.isFinite) || p<=0 || u<0 || ea<0 || es<ea) return null;
  const delta=4098*saturationPressure(t)/(t+237.3)**2, gamma=.000665*p;
  return Math.max(0,(.408*delta*r+gamma*900/(t+273)*u*(es-ea))/(delta+gamma*(1+.34*u)));
}
export function calculateReferenceET0(records,{latitude,elevationM}={}) {
  const daily=records.map(row=>{
    const {minC:lo,maxC:hi,humidityPct:rh,solarRadiationMJ:rs,wind2mMs:u,pressureKpa:p}=row;
    let value=null;
    if ([lo,hi,rh,rs,u,p,latitude,elevationM].every(Number.isFinite) && lo<=hi && rh>=0 && rh<=100 && rs>=0 && u>=0 && p>0 && Math.abs(latitude)<90) {
      const t=(lo+hi)/2, es=(saturationPressure(lo)+saturationPressure(hi))/2;
      // FAO eq19: mean RH approximation, less accurate than paired daily RH extrema.
      const ea=es*rh/100;
      const date=new Date(row.date), j=1+(date-Date.UTC(date.getUTCFullYear(),0,1))/86400000;
      const phi=latitude*Math.PI/180, dr=1+.033*Math.cos(2*Math.PI*j/365), dec=.409*Math.sin(2*Math.PI*j/365-1.39);
      const ws=Math.acos(Math.max(-1,Math.min(1,-Math.tan(phi)*Math.tan(dec))));
      const ra=24*60/Math.PI*.0820*dr*(ws*Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.sin(ws));
      const rso=(.75+2e-5*elevationM)*ra;
      if (rso>0) {
        const ratio=Math.max(.3,Math.min(1,rs/rso));
        // ASCE standardized reference ET cloudiness bounds: 0.3 <= Rs/Rso <= 1.
        if (ratio>=.3) {
          const rnl=4.903e-9*((hi+273.16)**4+(lo+273.16)**4)/2*(.34-.14*Math.sqrt(ea))*(1.35*ratio-.35);
          value=penmanMonteith({temperatureC:t,pressureKpa:p,wind2mMs:u,netRadiation:.77*rs-rnl,actualVapourPressure:ea,saturationVapourPressure:es});
        }
      }
    }
    return {date:row.date,value};
  });
  const validDays=daily.filter(d=>Number.isFinite(d.value)).length;
  return {daily,unit:'mm/day',method:'FAO-56 Penman-Monteith',period:{start:records[0]?.date,end:records.at(-1)?.date},sourceParameters:['T2M_MIN','T2M_MAX','RH2M','WS2M','PS','ALLSKY_SFC_SW_DWN'],validDays,coverage:records.length?100*validDays/records.length:0,status:validDays===records.length&&records.length?'complete':'incomplete',warnings:validDays===records.length?[]:['ET0 input unavailable or radiation outside supported daily conditions.'],assumptions:['Daily soil heat flux G=0; grass albedo 0.23; ASCE cloudiness ratio bounded to 0.3-1.', 'Mean RH estimates actual vapour pressure (FAO eq19); no local calibration.']};
}
