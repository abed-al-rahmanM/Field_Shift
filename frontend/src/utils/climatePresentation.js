export function temperatureChartData(climate) {
  return (climate?.daily ?? []).filter(day=>/^\d{4}-\d{2}-\d{2}$/.test(day.date)).map(day=>({date:day.date,temperature:Number.isFinite(day.temperatureC)?day.temperatureC:null})).sort((a,b)=>a.date.localeCompare(b.date));
}
export function climateHeading(climate,mode) {
  const format=date=>new Date(date+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
  const start=format(climate.period.start),end=format(climate.period.end);
  const source=mode==='demo'?'Demo climate':climate.periodType==='historical_baseline'?'NASA historical baseline':'NASA climate observations';
  return `${source} · ${start===end?start:`${start} – ${end}`}${climate.periodType==='ongoing_observations'?' · Incomplete season':''}`;
}
export function climateLabel(climate,mode) {
  if(mode==='demo' || climate.dataStatus==='synthetic_demo') return `Demo data - illustrative temperatures - ${climate.period.start} to ${climate.period.end}`;
  const prefix=climate.periodType==='historical_baseline'?'Historical baseline (one season)':climate.periodType==='ongoing_observations'?'NASA observations · incomplete season':'NASA observations';
  const status=climate.dataStatus==='cached_nasa'?'cached':climate.dataStatus==='live_nasa'?'fetched from NASA':'saved snapshot';
  return `${prefix} · ${climate.period.start} to ${climate.period.end} · ${status}`;
}

