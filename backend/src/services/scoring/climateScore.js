import { meanAvailable, rangeSuitability } from './mathUtils.js';

export function calculateClimateScore(crop, climate, plantingMonth) {
  const temperature = rangeSuitability(climate?.summary?.averageTemperatureC, crop.temperatureRequirements);
  const months = crop.plantingWindow?.months;
  const plantingWindow = Array.isArray(months) ? {
    score: months.includes(plantingMonth) ? 100 : 0, status: 'calculated-assumption', formula: 'prototype-planting-window-v1', unit: 'score 0–100',
    requiredInputs: ['plantingMonth', 'prototype month list'], missing: [], sourceId: crop.plantingWindow.sourceId,
    warnings: ['Prototype calendar assumption; not a verified local hard constraint.'], assumptions: ['Month list is an engineering placeholder.'],
  } : { score: null, status: 'unavailable', formula: 'prototype-planting-window-v1', unit: 'score 0–100', requiredInputs: [], missing: ['planting window'], warnings: ['No planting-window evidence is available.'] };
  const score = meanAvailable([temperature, plantingWindow]);
  return {
    score, status: temperature.score === null ? 'incomplete' : 'partial', formula: 'mean-temperature-window-v1', unit: 'score 0–100',
    subscores: { temperature: temperature.score, plantingWindow: plantingWindow.score }, calculations: { temperature, plantingWindow }, coverage: temperature.score === null ? 25 : 100,
    missing: [...temperature.missing, ...plantingWindow.missing], warnings: [...temperature.warnings, ...plantingWindow.warnings],
    assumptions: ['Historical same-season mean temperature is context, not a forecast.'],
  };
}
