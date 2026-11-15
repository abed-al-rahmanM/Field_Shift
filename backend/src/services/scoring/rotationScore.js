export function calculateRotationScore(meanCropScore, transitionCompatibility) {
  if (![meanCropScore, transitionCompatibility].every(Number.isFinite)) return { score: null, status: 'incomplete', formula: 'rotation-prototype-v1', warnings: ['Crop and transition scores are required.'] };
  return {
    score: Math.round(0.85 * meanCropScore + 0.15 * transitionCompatibility), status: 'calculated', formula: 'rotation-prototype-v1', unit: 'score 0–100',
    assumptions: ['Long-term soil change is not modeled.', 'Family transition is a screening indicator, not a pest-safety guarantee.'], warnings: [],
  };
}
