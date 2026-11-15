import test from 'node:test';
import assert from 'node:assert/strict';
import { rangeScore, weightedAvailable } from '../src/utils/math.js';
import { calculateSalinityScore, organicMatterRamp, rangeSuitability } from '../src/services/scoring/mathUtils.js';

test('rangeScore handles tolerance and optimum boundaries', () => {
  const bounds = { min: 4, optMin: 5, optMax: 7, max: 8 };
  assert.equal(rangeScore(4, bounds), 0);
  assert.equal(rangeScore(5, bounds), 100);
  assert.equal(rangeScore(6, bounds), 100);
  assert.equal(rangeScore(7, bounds), 100);
  assert.equal(rangeScore(8, bounds), 0);
  assert.equal(rangeScore(4.5, bounds), 50);
  assert.equal(rangeScore(7.5, bounds), 50);
  assert.equal(rangeScore(null, bounds), null);
});

test('available weights normalize while preserving coverage', () => {
  const result = weightedAvailable({ soil: 80, climate: 60, water: null }, { soil: .5, climate: .3, water: .2 });
  assert.equal(result.score, 72.5);
  assert.equal(result.coverage, 80);
  assert.deepEqual(result.appliedWeights, { soil: .625, climate: .375 });
});

test('structured range contract matches the master synthetic example', () => {
  const bounds = { minimum: 5, optimalLow: 6, optimalHigh: 7.2, maximum: 8.2, sourceId: 'synthetic-test' };
  assert.equal(rangeSuitability(5.6, bounds).score, 60);
  assert.equal(rangeSuitability(5, bounds).score, 0);
  assert.equal(rangeSuitability(6, bounds).score, 100);
  assert.equal(rangeSuitability(7, bounds).score, 100);
  assert.equal(rangeSuitability(8.2, bounds).score, 0);
  assert.equal(rangeSuitability(Infinity, bounds).status, 'unavailable');
  assert.equal(rangeSuitability(6, { ...bounds, sourceId: null }).score, null);
});

test('salinity requires ECe and verified Maas-Hoffman parameters', () => {
  assert.equal(calculateSalinityScore({ ece: 3, method: 'ECe saturated paste', threshold: 1.5, slope: 12, sourceId: 'synthetic-test' }).score, 82);
  assert.equal(calculateSalinityScore({ ece: 3, method: 'EC 1:5', threshold: 1.5, slope: 12, sourceId: 'synthetic-test' }).score, null);
  assert.equal(calculateSalinityScore({ ece: 3, method: 'ECe', threshold: null, slope: null, sourceId: null }).score, null);
});

test('organic matter ramp requires a sourced local target', () => {
  assert.equal(organicMatterRamp({ organicMatter: 2, minimum: 1, targetLow: 3, sourceId: 'synthetic-test' }).score, 50);
  assert.equal(organicMatterRamp({ organicMatter: 2, minimum: 1, targetLow: 3, sourceId: null }).score, null);
});
