import { randomUUID } from 'node:crypto';
import { CROP_WEIGHTS, MODEL_VERSION } from '../config.js';
import { readJson } from '../utils/data.js';
import { rankCrops } from './cropScoring.js';
import { generateRotations } from './rotationEngine.js';
import { getSeasonClimate } from './nasaPower.js';
import { templateExplanation } from './aiExplainer.js';
import { rememberAnalysis } from './analysisContext.js';

export async function runAnalysis(input) {
  const crops = await readJson('crops.json');
  const supportedIds = new Set(crops.map(crop => crop.id));
  if (input.mode === 'live') {
    const suppliedIds = [input.farm.previousCrop, ...input.farm.cropHistory].filter(Boolean);
    if (suppliedIds.some(id => !supportedIds.has(id))) throw Object.assign(new Error('Crop history contains an unsupported crop.'), { status: 400 });
    const textureParts = [input.soil.sandPercent, input.soil.siltPercent, input.soil.clayPercent];
    if (textureParts.every(Number.isFinite)) {
      const total = textureParts.reduce((sum, value) => sum + value, 0);
      if (total < 99 || total > 101) throw Object.assign(new Error('Sand, silt and clay percentages must total approximately 100%.'), { status: 400 });
    }
  }
  let working = input;
  let climate;
  let windowNote;
  if (input.mode === 'demo') {
    const demo = await readJson('demoScenario.json');
    working = { mode: 'demo', farm: demo.farm, soil: demo.soil, priorities: demo.priorities };
    climate = { ...demo.climate, dataStatus: 'synthetic_demo', periodType: 'synthetic_demo', sourceType: 'synthetic_demo', parameter: 'illustrative temperature', latestObservationDate: null };
    windowNote = 'Illustrative demo values; no external request was made.';
  } else {
    climate = await getSeasonClimate(input.farm, { cropDurationDays: Math.max(...crops.map(c => c.waterRequirements.stageDays.reduce((a,b)=>a+b,0))) });
    windowNote = climate.dateSelectionReason;
  }
  const allRanked = rankCrops(crops, working, climate);
  const topCrops = allRanked.slice(0, 3);
  const rotationPlans = generateRotations(allRanked, working.farm.previousCrop, 3);
  const soilKnown = ['ph','ec','organicMatter','nitrogen','phosphorus','potassium','texture'].filter(key => working.soil[key] !== null && working.soil[key] !== undefined && working.soil[key] !== '').length;
  const warnings = [
    windowNote,
    'Scores are engineering suitability indicators, not probabilities of crop success.',
    ...(topCrops.length < 3 ? ['Fewer than three crops had enough supported evidence for this filter.'] : []),
    ...(working.mode === 'demo' ? ['Demo Mode uses fictional farm, laboratory and climate inputs.'] : []),
  ];
  const result = {
    analysisId: randomUUID(), mode: working.mode, farm: working.farm, soil: working.soil, priorities: working.priorities,
    createdAt: new Date().toISOString(), climate, topCrops, rotationPlans, warnings,
    dataCoverage: { soilInputs: Math.round((soilKnown / 7) * 100), climateDays: climate.validDays, cropEvidence: topCrops.map(item => ({ cropId: item.crop.id, scoreCoverage: item.scoreCoverage })) },
    sources: [...new Map(topCrops.flatMap(item => item.sources).map(source => [source.url, source])).values()],
    methodologyVersion: '1.2', modelVersion: MODEL_VERSION, scoringWeights: CROP_WEIGHTS,
  };
  return rememberAnalysis({ ...result, explanation: templateExplanation(result) });
}
