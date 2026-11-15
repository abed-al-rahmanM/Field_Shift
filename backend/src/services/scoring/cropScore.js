import { aggregateClimate } from '../nasaPower.js';
import { CROP_WEIGHTS } from '../../config.js';
import { weightedAvailable } from '../../utils/math.js';
import { calculateClimateScore } from './climateScore.js';
import { evaluateHardConstraints } from './hardConstraints.js';
import { calculateSoilScore } from './soilScore.js';
import { calculateWaterScore } from './waterScore.js';

export function scoreCrop(crop, input, climate) {
  const soil = calculateSoilScore(crop, input.soil);
  const duration=crop.waterRequirements?.stageDays?.reduce((a,b)=>a+b,0);
  const cropDays=duration&&climate.daily?.length?climate.daily.filter(r=>r.date>=climate.period.start&&Date.parse(r.date)<Date.parse(climate.period.start)+duration*86400000):null;
  const matchedClimate=cropDays?{...climate,daily:cropDays,summary:aggregateClimate(cropDays)}:climate;
  const climateFit = calculateClimateScore(crop, matchedClimate, input.farm.plantingMonth);
  const water = calculateWaterScore(crop, climate, input.priorities);
  const weighted = weightedAvailable({ soil: soil.score, climate: climateFit.score, water: water.score }, CROP_WEIGHTS);
  const constraints = evaluateHardConstraints({ soil, climate: climateFit });
  const sameCrop = input.farm.previousCrop === crop.id;
  const warnings = [
    ...soil.warnings, ...climateFit.warnings, ...water.warnings,
    ...(sameCrop ? ['The previous crop is the same crop; local pest and disease return intervals require review.'] : []),
    ...(weighted.coverage < 100 ? [`The partial score uses ${weighted.coverage}% of configured model weight and is normalized over available components.`] : []),
  ];
  const reason = constraints.excluded ? constraints.reasons[0] : soil.score !== null && climateFit.score !== null ? `Soil ${soil.score}/100 and climate ${climateFit.score}/100 under the current screening model.` : 'The available inputs support only a partial comparison.';
  return {
    crop: { id: crop.id, name: crop.commonName, scientificName: crop.scientificName, family: crop.family, category: crop.category },
    score: weighted.score, scoreCoverage: weighted.coverage, scoreStatus: weighted.coverage === 100 ? 'complete' : 'partial', formula: 'weighted-available-components-v1',
    components: { soil, climate: climateFit, water }, excluded: constraints.excluded, hardConstraints: constraints.reasons, unknownConstraints: constraints.unknown,
    reason, warnings: [...new Set(warnings)], sources: crop.dataSources.map(source => ({ label: `${source.organization} ${source.context}`, url: source.url, sourceId: source.id })), appliedWeights: weighted.appliedWeights,
  };
}

export function rankCrops(crops, input, climate) {
  const category = input.priorities.category;
  return crops.map(crop => scoreCrop(crop, input, climate))
    .filter(result => !result.excluded && Number.isFinite(result.score) && (category === 'any' || result.crop.category === category))
    .sort((a,b) => (b.score ?? -1) - (a.score ?? -1) || b.scoreCoverage - a.scoreCoverage || a.crop.name.localeCompare(b.crop.name));
}
