import test from 'node:test';
import assert from 'node:assert/strict';
import { getClimateAnalysisPeriod } from '../src/services/climatePeriod.js';
import { getClimate, clearClimateCache, normalizeNasaResponse, buildNasaUrl } from '../src/services/nasaPower.js';
const now=new Date('2026-11-14T12:00:00Z');
test('actual historical season is not shifted back a year',()=>{const p=getClimateAnalysisPeriod({plantingMonth:3,plantingYear:2025,currentDate:now});assert.equal(p.start,'2025-03-01');assert.equal(p.end,'2025-05-31');assert.equal(p.periodType,'historical_observation');});
test('future spring 2027 includes completed spring 2026',()=>{const p=getClimateAnalysisPeriod({plantingMonth:3,plantingYear:2027,currentDate:now});assert.equal(p.start,'2026-03-01');assert.equal(p.end,'2026-05-31');assert.equal(p.periodType,'historical_baseline');});
test('ongoing season truncates request but retains full planned period',()=>{const p=getClimateAnalysisPeriod({plantingMonth:10,plantingYear:2026,currentDate:now});assert.equal(p.end,'2026-11-13');assert.equal(p.plannedPeriod.end,'2026-12-31');assert.equal(p.incompleteSeason,true);});
test('baseline spans year boundaries correctly',()=>{const p=getClimateAnalysisPeriod({plantingMonth:12,plantingYear:2026,currentDate:now});assert.equal(p.start,'2025-12-01');assert.equal(p.end,'2026-02-28');});
test('documented duration and leap years use inclusive days',()=>{const p=getClimateAnalysisPeriod({plantingMonth:2,plantingYear:2024,cropDurationDays:29,currentDate:now});assert.equal(p.end,'2024-02-29');assert.throws(()=>getClimateAnalysisPeriod({plantingMonth:13,plantingYear:2027,currentDate:now}));});
const request={latitude:34.53,longitude:36.05,start:'2026-03-01',end:'2026-03-02'};
const raw={parameters:{T2M:{units:'C'},T2M_MIN:{units:'C'},T2M_MAX:{units:'C'},RH2M:{units:'%'},PRECTOTCORR:{units:'mm/day'}},properties:{parameter:{T2M:{20260301:-12.4,20260302:0},T2M_MIN:{20260301:-15,20260302:-2},T2M_MAX:{20260301:-8,20260302:5},RH2M:{20260301:70,20260302:65},PRECTOTCORR:{20260301:2,20260302:0}}}};
test('negative Celsius observations are preserved exactly, never converted or fabricated',()=>{const c=normalizeNasaResponse(raw,request,buildNasaUrl(request));assert.deepEqual(c.daily.map(d=>d.temperatureC),[-12.4,0]);assert.equal(c.summary.averageTemperatureC,-6.2);assert.equal(c.provenance.units.T2M,'C');});
test('Kelvin is rejected rather than silently converted',()=>{assert.throws(()=>normalizeNasaResponse({...raw,parameters:{...raw.parameters,T2M:{units:'K'}}},request,''),/temperature units/);});
test('cache keys include location, date and time standard and expire',async()=>{
 clearClimateCache();let calls=0;
 const fetcher=async()=>{calls++;return {ok:true,json:async()=>raw};};
 const start=Date.parse('2026-11-14');
 assert.equal((await getClimate(request,{fetcher,now:start})).dataStatus,'live_nasa');
 assert.equal((await getClimate(request,{fetcher,now:start+100})).dataStatus,'cached_nasa');
 assert.equal(calls,1);
 await getClimate({...request,latitude:35},{fetcher,now:start});
 await getClimate({...request,timeStandard:'UTC'},{fetcher,now:start});
 await getClimate(request,{fetcher,now:start+25*3600000});
 assert.equal(calls,4);
});
test('provider failure is not replaced by demo data',async()=>{clearClimateCache();await assert.rejects(()=>getClimate(request,{fetcher:async()=>({ok:false,status:429})}),/HTTP 429/);});

