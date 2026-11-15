const KEY = 'field-shift.analyses.v1';
const DRAFT = 'field-shift.draft.v1';

export function getHistory() {
  try { const data = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; }
}
export function saveAnalysis(analysis) {
  // Persist the calculated snapshot locally; reopening it must not silently recalculate scores.
  try {
    const history = getHistory().filter(item => item.analysisId !== analysis.analysisId);
    localStorage.setItem(KEY, JSON.stringify([analysis, ...history].slice(0, 20)));
    return true;
  } catch { return false; }
}
export function deleteAnalysis(id) { try { localStorage.setItem(KEY, JSON.stringify(getHistory().filter(item => item.analysisId !== id))); return true; } catch { return false; } }
export function getAnalysis(id) { return getHistory().find(item => item.analysisId === id) ?? null; }
export function saveDraft(data) { try { localStorage.setItem(DRAFT, JSON.stringify(data)); } catch { /* Form still works without persistence. */ } }
export function consumeDraft() { try { const value = JSON.parse(localStorage.getItem(DRAFT) || 'null'); localStorage.removeItem(DRAFT); return value; } catch { return null; } }
export function exportAnalysis(analysis) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `field-shift-${analysis.farm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`; link.click(); URL.revokeObjectURL(url);
}
