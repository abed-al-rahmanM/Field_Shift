import { describe, expect, it } from 'vitest';
import { canContinueSoil, mapSoilReport } from './soilReview';

describe('soil report review', () => {
  it('blocks an unconfirmed report, a pending request and an extraction failure', () => {
    for (const status of ['loading', 'error', 'ready']) expect(canContinueSoil({ status, reviewed: false })).toBe(false);
    expect(canContinueSoil({ status: 'loading', reviewed: true })).toBe(false);
    expect(canContinueSoil({ status: 'ready', reviewed: true })).toBe(true);
    expect(canContinueSoil({ status: 'idle', reviewed: false })).toBe(true);
  });
  it('keeps unknown values empty and extraction warnings available for review', () => {
    const result = mapSoilReport({ ph: 6.8, ec: null, warnings: ['pH is faint'], missingMeasurements: ['organic matter'] });
    expect(result.soil.ph).toBe(6.8);
    expect(result.soil.organicMatter).toBe(null);
    expect(result.notes.join(' ')).toContain('pH is faint');
    expect(result.notes.join(' ')).toContain('organic matter');
  });
  it('does not silently label incompatible salinity units as dS/m', () => {
    for (const ecUnit of [null, 'µS/cm', 'unknown']) {
      const result = mapSoilReport({ ec: 50, ecUnit });
      expect(result.soil.ec).toBe(null);
      expect(result.context[0].value).toContain('50');
      expect(result.notes[0]).toContain('unit');
    }
    expect(mapSoilReport({ ec: 1.2, ecUnit: 'dS/m' }).soil.ec).toBe(1.2);
    expect(mapSoilReport({ ec: 1.2, ecUnit: 'mS/cm' }).soil.ec).toBe(1.2);
  });
  it('keeps unscored nutrient readings out of submitted soil measurements', () => {
    const result = mapSoilReport({ nitrogen: { value: 14, unit: 'mg/kg', method: 'nitrate-N' } });
    expect(result.soil).not.toHaveProperty('nitrogen');
    expect(result.context[0].value).toContain('14 mg/kg');
  });
});

