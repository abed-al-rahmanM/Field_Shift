const DAY = 86400000;
const iso = date => date.toISOString().slice(0,10);
function windowFor(year, month, duration, fullMonths) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  let end = duration ? new Date(start.getTime() + (duration - 1) * DAY) : new Date(Date.UTC(year, month + 2, 0));
  if (fullMonths) end = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth()+1, 0));
  return { start: iso(start), end: iso(end) };
}
export function getClimateAnalysisPeriod({ plantingMonth, plantingYear, cropDurationDays, fullMonths = false, currentDate = new Date() }) {
  const now = new Date(currentDate);
  if (!Number.isInteger(plantingMonth) || plantingMonth < 1 || plantingMonth > 12 || !Number.isInteger(plantingYear) || plantingYear < 1981 || plantingYear > 2100 || !Number.isFinite(now.getTime())) throw new Error('Invalid planting season.');
  if (cropDurationDays != null && (!Number.isInteger(cropDurationDays) || cropDurationDays < 1 || cropDurationDays > 366)) throw new Error('Invalid growing duration.');
  // Yesterday is a request ceiling, not a claim of provider availability.
  const requestCeiling = iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - DAY));
  const requested = windowFor(plantingYear, plantingMonth, cropDurationDays, fullMonths);
  const common = { requestedPlantingSeason: requested.start.slice(0,7), plannedPeriod: requested, requestCeiling, windowBasis: cropDurationDays ? 'documented_duration' : 'three_calendar_month_screening_window' };
  if (requested.start <= requestCeiling) {
    const ongoing = requested.end > requestCeiling;
    return { ...common, start: requested.start, end: ongoing ? requestCeiling : requested.end, periodType: ongoing ? 'ongoing_observations' : 'historical_observation', incompleteSeason: ongoing, reason: ongoing ? 'Selected season is ongoing; request completed dates only and inspect actual NASA availability.' : 'Use the actual selected historical season.' };
  }
  let candidateYear = now.getUTCFullYear();
  let candidate = windowFor(candidateYear, plantingMonth, cropDurationDays, fullMonths);
  while (candidate.end > requestCeiling) candidate = windowFor(--candidateYear, plantingMonth, cropDurationDays, fullMonths);
  return { ...common, ...candidate, periodType: 'historical_baseline', incompleteSeason: false, reason: 'Most recent completed corresponding season; a single-season historical baseline, not a forecast.' };
}

