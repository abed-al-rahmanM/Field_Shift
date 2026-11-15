const API = '/api';

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), path==='/soil/extract'?75000:45000);
  let response;
  try { response = await fetch(`${API}${path}`, {...options,signal:controller.signal});
  const body = await response.json().catch(error => {if(controller.signal.aborted)throw error;return {};});
  if (!response.ok) throw Object.assign(new Error(body.message || body.error || 'Something went wrong. Please try again.'), {code:body.code,retryable:body.retryable,retryAfterSeconds:body.retryAfterSeconds,quotaScope:body.quotaScope});
  return body;
  } catch(error) {
    if(controller.signal.aborted) throw Object.assign(new Error('This is taking longer than expected. Please try again.'),{code:'REQUEST_TIMEOUT',retryable:true});
    if(error instanceof TypeError) throw Object.assign(new Error('The server could not be reached. Check that FieldShift is running.'),{code:'BACKEND_UNAVAILABLE',retryable:true});
    throw error;
  } finally {clearTimeout(timer);}
}

export const analyzeFarm = (data) => request('/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const extractSoil = (file) => { const body = new FormData(); body.append('report', file); return request('/soil/extract', { method: 'POST', body }); };
export const fetchCrops = () => request('/crops');
export const askFarm = (analysis, question, previousQuestion) => request('/ai/ask', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analysisId:analysis.analysisId,question,previousQuestion,snapshot:analysis})});
export const explainFarm = analysis => request('/explain', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analysisId:analysis.analysisId,snapshot:analysis})});
