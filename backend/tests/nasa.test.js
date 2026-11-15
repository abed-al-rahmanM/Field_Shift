import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNasaUrl, normalizeNasaResponse } from '../src/services/nasaPower.js';

const request = { latitude: 34.5, longitude: 36, start: '2025-03-01', end: '2025-03-02' };
test('NASA URL includes validated coordinates and requested period', () => {
  const url = new URL(buildNasaUrl(request));
  assert.equal(url.searchParams.get('start'), '20250301');
  assert.equal(url.searchParams.get('community'), 'AG');
  assert.throws(() => buildNasaUrl({ ...request, latitude: 100 }));
});

test('missing temperature stays a gap without discarding valid rainfall', () => {
  const raw = { header:{fill_value:-999}, parameters:{T2M:{units:'C'},T2M_MAX:{units:'C'},T2M_MIN:{units:'C'},PRECTOTCORR:{units:'mm/day'},RH2M:{units:'%'}}, properties:{parameter:{
    T2M:{20250301:20,20250302:-999},T2M_MAX:{20250301:25,20250302:26},T2M_MIN:{20250301:10,20250302:11},PRECTOTCORR:{20250301:4,20250302:2},RH2M:{20250301:60,20250302:61}
  }}};
  const value = normalizeNasaResponse(raw, request, buildNasaUrl(request));
  assert.equal(value.validDays, 1);
  assert.equal(value.missingDays, 1);
  assert.equal(value.observationCoveragePercent, 50);
  assert.equal(value.summary.totalRainfallMm, 6);
  assert.equal(value.daily[1].temperatureC, null);
  assert.equal(value.latestObservationDate, '2025-03-01');
  assert.equal(value.summary.averageTemperatureC, 20);
});
