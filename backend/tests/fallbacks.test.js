import test from 'node:test';
import assert from 'node:assert/strict';
import { explain } from '../src/services/aiExplainer.js';
import { extractSoil } from '../src/services/soilExtractor.js';
import { getClimate } from '../src/services/nasaPower.js';

test('missing Gemini key uses deterministic explanation fallback', async () => {
  const prior = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const result = await explain({ topCrops: [], warnings: [] });
  assert.equal(result.source, 'deterministic-template');
  if (prior) process.env.GEMINI_API_KEY = prior;
});

test('missing Gemini key leaves soil extraction available through manual entry', async () => {
  const prior = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(() => extractSoil({}), /Enter soil values manually/);
  if (prior) process.env.GEMINI_API_KEY = prior;
});

test('NASA network failure returns a clean error and no synthetic substitute', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(() => getClimate({ latitude: 1.2345, longitude: 2.3456, start: '2025-01-01', end: '2025-01-02' }), /offline/);
  globalThis.fetch = original;
});
