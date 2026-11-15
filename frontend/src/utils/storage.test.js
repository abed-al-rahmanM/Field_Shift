import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteAnalysis, getHistory, saveAnalysis } from './storage';

describe('browser history', () => {
  beforeEach(() => { const values = new Map(); globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem:key=>values.delete(key) }; });
  it('saves and deletes an analysis', () => { expect(saveAnalysis({analysisId:'1',farm:{name:'A'}})).toBe(true); expect(getHistory()).toHaveLength(1); expect(deleteAnalysis('1')).toBe(true); expect(getHistory()).toHaveLength(0); });
  it('handles storage failure without crashing', () => { globalThis.localStorage.setItem = vi.fn(() => { throw new Error('full'); }); expect(saveAnalysis({analysisId:'1'})).toBe(false); });
});
