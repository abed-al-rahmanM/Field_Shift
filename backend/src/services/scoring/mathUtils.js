const scoreMetadata = (score, status, formula, warnings = []) => ({
  score, status, formula, unit: 'score 0–100', warnings,
});

export const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

/**
 * Prototype trapezoidal range-membership indicator.
 * This is not a biological yield-response curve or a success probability.
 */
export function rangeSuitability(value, bounds) {
  const requiredInputs = ['value', 'minimum', 'optimalLow', 'optimalHigh', 'maximum', 'sourceId'];
  if (!Number.isFinite(value)) return { ...scoreMetadata(null, 'unavailable', 'trapezoidal-range-v1', ['A finite measured value is required.']), requiredInputs, missing: ['value'] };
  if (!bounds?.sourceId) return { ...scoreMetadata(null, 'unavailable', 'trapezoidal-range-v1', ['Verified parameter provenance is required.']), requiredInputs, missing: ['sourceId'] };
  const { minimum, optimalLow, optimalHigh, maximum } = bounds;
  if (![minimum, optimalLow, optimalHigh, maximum].every(Number.isFinite) || !(minimum < optimalLow && optimalLow <= optimalHigh && optimalHigh < maximum)) {
    return { ...scoreMetadata(null, 'invalid-parameters', 'trapezoidal-range-v1', ['Range boundaries are missing or incorrectly ordered.']), requiredInputs, missing: [] };
  }
  let raw;
  if (value <= minimum || value >= maximum) raw = 0;
  else if (value >= optimalLow && value <= optimalHigh) raw = 100;
  else if (value < optimalLow) raw = 100 * (value - minimum) / (optimalLow - minimum);
  else raw = 100 * (maximum - value) / (maximum - optimalHigh);
  return {
    ...scoreMetadata(Math.round(clamp(raw)), 'calculated', 'trapezoidal-range-v1'), requiredInputs, missing: [], sourceId: bounds.sourceId,
    assumptions: ['Piecewise linear membership between documented tolerance and optimal bounds.'],
  };
}

/** Maas–Hoffman indicator, only for compatible saturated-paste ECe inputs. */
export function calculateSalinityScore({ ece, method, threshold, slope, sourceId }) {
  const requiredInputs = ['ece', 'method=ECe', 'threshold', 'slope', 'sourceId'];
  if (!Number.isFinite(ece)) return { ...scoreMetadata(null, 'unavailable', 'maas-hoffman-v1', ['A finite EC measurement is required.']), requiredInputs, missing: ['ece'] };
  if (!/^ece\b/i.test(String(method ?? '').trim())) return { ...scoreMetadata(null, 'unavailable', 'maas-hoffman-v1', ['Only saturated-paste ECe is compatible; no EC conversion was assumed.']), requiredInputs, missing: ['compatible ECe method'] };
  if (![threshold, slope].every(Number.isFinite) || !sourceId || threshold < 0 || slope < 0) return { ...scoreMetadata(null, 'unavailable', 'maas-hoffman-v1', ['Verified crop threshold, slope and provenance are required.']), requiredInputs, missing: ['verified threshold/slope'] };
  const score = Math.round(clamp(100 - slope * Math.max(0, ece - threshold)));
  return { ...scoreMetadata(score, 'calculated', 'maas-hoffman-v1', ['Normalized response indicator; do not interpret as a guaranteed field yield.']), requiredInputs, missing: [], sourceId, assumptions: ['EC measurement is compatible saturated-paste ECe in dS/m.'] };
}

export function organicMatterRamp({ organicMatter, minimum, targetLow, sourceId }) {
  const requiredInputs = ['organicMatter', 'minimum', 'targetLow', 'sourceId'];
  if (![organicMatter, minimum, targetLow].every(Number.isFinite) || !(minimum < targetLow) || !sourceId) return { ...scoreMetadata(null, 'unavailable', 'organic-matter-lower-ramp-v1', ['A locally justified target and provenance are required.']), requiredInputs, missing: ['verified local target'] };
  return { ...scoreMetadata(Math.round(clamp(100 * (organicMatter - minimum) / (targetLow - minimum))), 'calculated', 'organic-matter-lower-ramp-v1'), requiredInputs, missing: [], sourceId, assumptions: ['Values at or above the lower target receive 100; high values are not penalized.'] };
}

export function meanAvailable(results) {
  const calculated = results.filter(result => Number.isFinite(result?.score));
  return calculated.length ? Math.round(calculated.reduce((sum, result) => sum + result.score, 0) / calculated.length) : null;
}
