import { calculateRotationScore } from './scoring/rotationScore.js';

function permutations(items, length, prefix = []) {
  if (prefix.length === length) return [prefix];
  return items.flatMap(item => permutations(items, length, [...prefix, item]));
}

function transitionScore(previous, next) {
  if (!previous) return 70;
  if (previous.crop.id === next.crop.id) return 45;
  if (previous.crop.family === next.crop.family) return 65;
  return 100;
}

export function generateRotations(ranked, previousCropId, limit = 3) {
  const pool = ranked.filter(item => !item.excluded && Number.isFinite(item.score)).slice(0, 5);
  if (!pool.length) return [];
  const previous = pool.find(item => item.crop.id === previousCropId) ?? null;
  // A repeated single crop is not a rotation. Do not pad sparse results with it.
  const plans = permutations(pool, 3).filter(sequence => sequence.every((item, index) => index === 0 || item.crop.id !== sequence[index - 1].crop.id)).map(sequence => {
    const transitions = [transitionScore(previous, sequence[0]), transitionScore(sequence[0], sequence[1]), transitionScore(sequence[1], sequence[2])];
    const meanCropScore = Math.round(sequence.reduce((sum, item) => sum + (item.score ?? 0), 0) / 3);
    const compatibility = Math.round(transitions.reduce((a,b) => a+b, 0) / 3);
    // Long-term soil change is intentionally not modeled. The plan score uses only crop screening and transparent family transitions.
    const calculation = calculateRotationScore(meanCropScore, compatibility);
    const uniqueFamilies = new Set(sequence.map(item => item.crop.family)).size;
    return {
      id: sequence.map(item => item.crop.id).join('-'), sequence: sequence.map(item => item.crop), score: calculation.score,
      breakdown: { meanCropScore, transitionCompatibility: compatibility, formula: '0.85 × mean crop score + 0.15 × transition compatibility', formulaId: calculation.formula, assumptions: calculation.assumptions },
      benefit: uniqueFamilies === 3 ? 'Three crop families create a varied sequence.' : `${uniqueFamilies} crop families across three opportunities.`,
      risk: compatibility < 80 ? 'Includes a crop or family repetition that needs local review.' : 'Different families can still share pests; local review remains necessary.',
      status: 'preliminary',
      water: 'Uses updated crop water screening where available for the selected observation season only. Later seasons need separate weather and irrigation budgets; this plan does not sum or reuse the irrigation allocation.',
      missing: ['Local sowing dates', 'Pest-specific return intervals', 'Separate water budgets and observations for each future season'],
    };
  }).sort((a,b) => b.score - a.score || a.id.localeCompare(b.id));

  const distinct = [];
  for (const plan of plans) {
    if (!distinct.some(existing => existing.sequence[0].id === plan.sequence[0].id)) distinct.push(plan);
    if (distinct.length === limit) break;
  }
  return distinct;
}
