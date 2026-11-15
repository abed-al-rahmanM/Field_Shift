export function evaluateHardConstraints({ soil, climate }) {
  const reasons = [];
  if (soil.calculations.ph.status === 'calculated' && soil.calculations.ph.score === 0) reasons.push('Entered pH is at or outside the supported crop tolerance bounds.');
  if (climate.calculations.temperature.status === 'calculated' && climate.calculations.temperature.score === 0) reasons.push('Historical mean temperature is at or outside the supported crop tolerance bounds.');
  return { excluded: reasons.length > 0, reasons, formula: 'verified-critical-constraints-v1', unknown: ['Local sowing calendar', 'Crop-specific pest return interval', 'Complete water balance'] };
}
