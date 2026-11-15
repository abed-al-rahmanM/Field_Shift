import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {penmanMonteith,calculateReferenceET0} from '../src/services/scoring/evapotranspiration.js';
import {calculateDailyCropCoefficient as kc,calculateDailyETc,calculateSeasonalETc,calculateSeasonalPrecipitation,calculateEffectiveRainfall as pe,calculateAvailableIrrigation as irrigation,calculateWaterDeficit,waterCoverageScore,calculateWaterScore} from '../src/services/scoring/waterScore.js';
import {weightedAvailable} from '../src/utils/math.js';
import {rankCrops} from '../src/services/scoring/cropScore.js';
import {generateRotations} from '../src/services/rotationEngine.js';
import {getClimateAnalysisPeriod} from '../src/services/climatePeriod.js';
const crops=JSON.parse(fs.readFileSync(new URL('../data/crops.json',import.meta.url)));
const bean=crops.find(c=>c.id==='bean');
const near=(a,b,t=.001)=>assert.ok(Math.abs(a-b)<t,a+' != '+b);
const climate={period:{start:'2025-03-01',end:'2025-07-31'},provenance:{requestedCoordinates:{latitude:34},returnedCoordinates:[36,34,100]},daily:Array.from({length:153},(_,i)=>({date:new Date(Date.UTC(2025,2,1)+i*86400000).toISOString().slice(0,10),temperatureC:20,minC:12,maxC:28,humidityPct:60,solarRadiationMJ:20,wind2mMs:2,pressureKpa:100,rainfallMm:1}))};
const input={farm:{plantingMonth:3},soil:{ph:6.5},priorities:{irrigation:'irrigated',seasonalLimitMm:100,slope:'gentle',category:'any'}};
test('FAO-56 published Example 18, Uccle 6 July: 3.9 mm/day',()=>{
 near(penmanMonteith({temperatureC:16.9,pressureKpa:100.1,wind2mMs:2.078,netRadiation:13.28,actualVapourPressure:1.409,saturationVapourPressure:1.997}),3.88,.03);
 // Full radiation path using Example 18 Rs=22.07; RHmean set to reproduce published ea.
 const full=calculateReferenceET0([{date:'1997-07-06',minC:12.3,maxC:21.5,humidityPct:100*1.409/1.997,solarRadiationMJ:22.07,wind2mMs:2.078,pressureKpa:100.1}],{latitude:50.8,elevationM:100});
 near(full.daily[0].value,3.9,.06);
});
test('FAO green bean coefficients cover all stage boundaries',()=>{near(kc(bean,1),.5);near(kc(bean,20),.5);near(kc(bean,35),.775);near(kc(bean,50),1.05);near(kc(bean,80),1.05);near(kc(bean,90),.9);assert.equal(kc(bean,91),null);});
test('daily and seasonal ETc preserve missing values',()=>{near(calculateDailyETc(4,1.05),4.2);near(calculateSeasonalETc([4,5,6]),15);assert.equal(calculateDailyETc(null,1),null);assert.equal(calculateSeasonalETc([4,null]),null);});
test('rainfall zero is observed; missing is never zero',()=>{assert.equal(calculateSeasonalPrecipitation([{rainfallMm:0},{rainfallMm:5}]).value,5);const r=calculateSeasonalPrecipitation([{rainfallMm:5},{rainfallMm:null}]);assert.equal(r.value,null);assert.equal(r.coverage,50);});
test('FAO monthly effective rain worked examples and slope requirement',()=>{near(pe(35,{gentleSlope:true}),11);near(pe(90,{gentleSlope:true}),47);near(pe(75,{gentleSlope:true}),35);assert.equal(pe(5,{gentleSlope:true}),0);assert.equal(pe(90),null);assert.equal(pe(null,{gentleSlope:true}),null);});
test('irrigation volume conversion and unknown quantities',()=>{assert.equal(irrigation({irrigation:'irrigated',irrigationVolumeM3:200,areaM2:1000}),200);assert.equal(irrigation({irrigation:'irrigated'}),null);assert.equal(irrigation({irrigation:'rain-fed',seasonalLimitMm:500}),0);assert.equal(irrigation({irrigation:'irrigated',irrigationVolumeM3:200,areaM2:0}),null);});
test('synthetic 400/240/100 balance, zero and score boundaries',()=>{near(calculateWaterDeficit(400,240+100),60);near(waterCoverageScore(400,340),85);assert.equal(waterCoverageScore(400,800),100);assert.equal(waterCoverageScore(400,0),0);assert.equal(waterCoverageScore(0,100),null);assert.equal(waterCoverageScore(null,100),null);assert.equal(waterCoverageScore(400,null),null);});
test('full 50/30/20 score retains one decimal: 87.3',()=>{near(weightedAvailable({soil:100,climate:81,water:65},{soil:.5,climate:.3,water:.2}).score,87.3);});
test('complete daily input generates score; unknown irrigation only produces baseline',()=>{const r=calculateWaterScore(bean,climate,input.priorities);assert.ok(r.score>0);assert.equal(r.et0.coverage,100);const unknown=calculateWaterScore(bean,climate,{...input.priorities,seasonalLimitMm:null});assert.equal(unknown.score,null);assert.ok(Number.isFinite(unknown.rainOnlyScore));assert.ok(unknown.missing.some(m=>m.includes('irrigation')));});
test('missing coefficient, weather, or partial calendar month refuses score',()=>{assert.equal(calculateWaterScore({...bean,waterRequirements:{}},climate,input.priorities).score,null);const rainGap=structuredClone(climate);rainGap.daily[10].rainfallMm=null;assert.equal(calculateWaterScore(bean,rainGap,input.priorities).score,null);const metGap=structuredClone(climate);metGap.daily[0].wind2mMs=null;assert.equal(calculateWaterScore(bean,metGap,input.priorities).score,null);const short={...climate,daily:climate.daily.slice(0,90)};assert.equal(calculateWaterScore(bean,short,input.priorities).score,null);});
test('water changes crop and rotation rankings using identical soil and temperature',()=>{
 const a={...bean,id:'a',commonName:'A',family:'A'}, b={...bean,id:'b',commonName:'B',family:'B',waterRequirements:{...bean.waterRequirements,kcInitial:1.5,kcMid:2,kcEnd:1.5}};
 const high=rankCrops([a,b],{...input,priorities:{...input.priorities,seasonalLimitMm:1000}},climate);
 const low=rankCrops([a,b],input,climate);assert.ok(low[0].score<high[0].score);assert.ok(low[0].score>low[1].score);assert.equal(low[0].appliedWeights.water,.2);
 const swap=rankCrops([{...a,waterRequirements:b.waterRequirements},{...b,waterRequirements:a.waterRequirements}],input,climate);assert.equal(swap[0].crop.id,'b');assert.notEqual(generateRotations(low,null)[0].id,generateRotations(swap,null)[0].id);
});
test('future baseline includes complete calendar months for longest crop',()=>{const r=getClimateAnalysisPeriod({plantingMonth:3,plantingYear:2027,cropDurationDays:145,fullMonths:true,currentDate:'2026-06-01'});assert.equal(r.start,'2025-03-01');assert.equal(r.end,'2025-07-31');});
