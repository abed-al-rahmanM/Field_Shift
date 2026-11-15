import { calculateSalinityScore, meanAvailable, rangeSuitability } from './mathUtils.js';

export function calculateSoilScore(crop, soil) {
  const ph = rangeSuitability(soil.ph, crop.soilRequirements?.ph);
  const salinity = calculateSalinityScore({
    ece: soil.ec, method: soil.ecMethod, threshold: crop.soilRequirements?.salinity?.eceThreshold,
    slope: crop.soilRequirements?.salinity?.slopePercentPerDsM, sourceId: crop.soilRequirements?.salinity?.sourceId,
  });
  const score = meanAvailable([ph, salinity]);
  const calculated = [ph, salinity].filter(item => item.status === 'calculated').length;
  return {
    score, status: score === null ? 'incomplete' : calculated === 2 ? 'calculated' : 'partial', formula: 'mean-available-soil-indicators-v1', unit: 'score 0–100',
    subscores: { ph: ph.score, salinity: salinity.score }, calculations: { ph, salinity }, coverage: Math.round(calculated / 2 * 100),
    missing: [...ph.missing, ...salinity.missing], warnings: [...ph.warnings, ...salinity.warnings],
    assumptions: ['Only supported, method-compatible indicators enter the mean.', 'Organic matter, texture and nutrients remain context until compatible targets are verified.'],
  };
}
