/** Trapezoidal membership indicator. This is a screening score, not a probability. */
export function rangeScore(value, bounds) {
  if (!Number.isFinite(value) || !bounds) return null;
  const { min, optMin, optMax, max } = bounds;
  if (![min, optMin, optMax, max].every(Number.isFinite) || !(min < optMin && optMin <= optMax && optMax < max)) return null;
  if (value <= min || value >= max) return 0;
  if (value >= optMin && value <= optMax) return 100;
  const raw = value < optMin ? ((value - min) / (optMin - min)) * 100 : ((max - value) / (max - optMax)) * 100;
  return Math.round(raw);
}

export const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
export const round = (value, digits = 1) => Number(value.toFixed(digits));

export function weightedAvailable(parts, weights) {
  const available = Object.entries(weights).filter(([key]) => Number.isFinite(parts[key]));
  if (!available.length) return { score: null, coverage: 0, appliedWeights: {} };
  const availableWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
  const score = available.reduce((sum, [key, weight]) => sum + parts[key] * (weight / availableWeight), 0);
  return {
    score: round(score, 1),
    coverage: Math.round(availableWeight * 100),
    appliedWeights: Object.fromEntries(available.map(([key, weight]) => [key, round(weight / availableWeight, 3)])),
  };
}
