import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreCrop } from '../src/services/cropScoring.js';
import { generateRotations } from '../src/services/rotationEngine.js';
import { runAnalysis } from '../src/services/analysis.js';

const crop = { id:'x',commonName:'X',scientificName:'X',family:'A',category:'vegetable',plantingWindow:{months:[3],sourceId:null},soilRequirements:{ph:{minimum:4,optimalLow:5,optimalHigh:7,maximum:8,sourceId:'test-ph'},salinity:{eceThreshold:null,slopePercentPerDsM:null,sourceId:null}},temperatureRequirements:{minimum:5,optimalLow:15,optimalHigh:25,maximum:35,sourceId:'test-temp'},waterRequirements:{kcInitial:null,kcMid:null,kcEnd:null},dataSources:[] };
const input = { farm:{plantingMonth:3,previousCrop:null},soil:{ph:null,ec:null,ecMethod:''},priorities:{profile:'soil-first',category:'any',seasonalLimitMm:null} };
const climate = { summary:{averageTemperatureC:20,totalRainfallMm:80} };
test('missing soil stays missing and is not scored as zero', () => {
  const result = scoreCrop(crop,input,climate);
  assert.equal(result.components.soil.score,null);
  assert.equal(result.components.climate.score,100);
  assert.ok(result.scoreCoverage < 100);
});

test('fixed 50/30/20 weights ignore legacy priority profiles and retain missing water', () => {
  const withSoil = { ...input, soil: { ...input.soil, ph: 4.5 } };
  const result = scoreCrop(crop, withSoil, climate);
  assert.equal(result.components.soil.score, 50);
  assert.equal(result.components.climate.score, 100);
  assert.equal(result.components.water.score, null);
  assert.equal(result.score, 68.8);
  assert.equal(result.scoreCoverage, 80);
  assert.deepEqual(result.appliedWeights, { soil: 0.625, climate: 0.375 });
  for (const profile of ['balanced', 'water-saving', 'invented']) {
    assert.equal(scoreCrop(crop, { ...withSoil, priorities: { ...input.priorities, profile } }, climate).score, result.score);
  }
});

test('rotation plans do not fill gaps with a repeated or unscored crop', () => {
  const ranked = [{ crop: { id: 'a', name: 'A', family: 'A' }, score: 90 }];
  assert.deepEqual(generateRotations(ranked, null), []);
  assert.deepEqual(generateRotations([{ ...ranked[0], score: null }], null), []);
  const plans = generateRotations([...ranked, { crop: { id: 'b', name: 'B', family: 'B' }, score: 80 }], null);
  assert.equal(plans.length, 2);
  assert.ok(plans.every(plan => plan.sequence.every((crop, index) => index === 0 || crop.id !== plan.sequence[index - 1].id)));
});
test('hard pH incompatibility excludes crop with a reason', () => {
  const result = scoreCrop(crop,{...input,soil:{...input.soil,ph:3}},climate);
  assert.equal(result.excluded,true);
  assert.match(result.hardConstraints[0],/pH/);
});
test('rotation plans have distinct first crops and correct arithmetic', () => {
  const ranked = ['a','b','c'].map((id,index)=>({crop:{id,name:id,family:id},score:90-index*5}));
  const plans = generateRotations(ranked,null,3);
  assert.equal(new Set(plans.map(plan=>plan.sequence[0].id)).size,3);
  for(const plan of plans) assert.equal(plan.score,Math.round(.85*plan.breakdown.meanCropScore+.15*plan.breakdown.transitionCompatibility));
});
test('demo calculations are deterministic and internally consistent', async () => {
  const request = { mode:'demo',farm:{name:'Demo',latitude:34.5,longitude:36,plantingMonth:3,plantingYear:2027},soil:{},priorities:{} };
  const first = await runAnalysis(request); const second = await runAnalysis(request);
  assert.deepEqual(first.topCrops,second.topCrops);
  assert.ok(first.topCrops.length > 0);
  assert.equal(first.mode,'demo');
  assert.match(first.climate.provenance.spatialNote,/not NASA/i);
  assert.equal(first.topCrops[0].components.soil.calculations.salinity.status, 'unavailable');
});

test('analysis rejects unsupported crop IDs and impossible texture totals before NASA requests', async () => {
  const base = { mode:'live',farm:{name:'Validation',latitude:34.5,longitude:36,plantingMonth:3,plantingYear:2027,previousCrop:null,cropHistory:[]},soil:{},priorities:{irrigation:'limited',profile:'soil-first',category:'any'} };
  await assert.rejects(() => runAnalysis({ ...base, farm:{ ...base.farm, previousCrop:'invented' } }), /unsupported crop/i);
  await assert.rejects(() => runAnalysis({ ...base, soil:{ sandPercent:70,siltPercent:30,clayPercent:30 } }), /approximately 100/);
});
