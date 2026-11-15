import { ArrowLeft, ArrowRight, Upload, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { analyzeFarm, extractSoil, fetchCrops } from '../services/api';
import { consumeDraft } from '../utils/storage';
import { mapSoilReport, canContinueSoil } from '../utils/soilReview';
import FarmLocationPicker from '../components/forms/FarmLocationPicker';
import LoadingStatus from '../components/ui/LoadingStatus';
import { validLocation } from '../utils/location';

const year = new Date().getFullYear();
const emptySoil = { ph: null, phMethod: '', ec: null, ecMethod: '', organicMatter: null, texture: '' };
const blank = { mode: 'live', farm: { name: '', latitude: null, longitude: null, plantingMonth: 3, plantingYear: year + 1, previousCrop: null, cropHistory: [] }, soil: emptySoil, priorities: { irrigation: 'unknown', seasonalLimitMm: null, category: 'any' } };
const numeric = value => value === '' ? null : Number(value);
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Analyze() {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(() => {
    const draft = consumeDraft();
    return draft ? { ...draft, soil: { ...emptySoil, ...draft.soil }, priorities: { irrigation: draft.priorities?.irrigation ?? 'unknown', seasonalLimitMm: draft.priorities?.seasonalLimitMm ?? null, ...draft.priorities, category: 'any' } } : blank;
  });
  const [step, setStep] = useState(1);
  const [locationError, setLocationError] = useState('');
  const [extractionSource, setExtractionSource] = useState(null);
  const [crops, setCrops] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(location.state?.error || '');
  const [soilMode, setSoilMode] = useState(data.soil.ph != null ? 'manual' : 'upload');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [extractionStatus, setExtractionStatus] = useState('idle');
  const [reviewed, setReviewed] = useState(false);
  const [reportNotes, setReportNotes] = useState([]);
  const [reportContext, setReportContext] = useState([]);
  const heading = useRef(null);
  const uploadPending = useRef(false);
  const reportCache = useRef(new Map());
  const [quotaUntil,setQuotaUntil] = useState(0);
  const [clock,setClock] = useState(Date.now());
  useEffect(()=>{if(!quotaUntil)return;const timer=setInterval(()=>setClock(Date.now()),1000);return ()=>clearInterval(timer);},[quotaUntil]);
  useEffect(() => { fetchCrops().then(setCrops).catch(() => setError('Crop list could not load. You can leave previous crop unknown.')); }, []);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function moveTo(next) { setStep(next); setError(''); requestAnimationFrame(() => heading.current?.focus()); }
  function update(group, key, value) {
    setData(current => ({ ...current, [group]: { ...current[group], [key]: value } }));
    if (group === 'soil') setReviewed(false);
  }
  // Extraction fills editable measurements; the user must confirm them before analysis.
  async function upload(report) {
    if (!report || busy || uploadPending.current) return;
    if (quotaUntil>Date.now()) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(report.type) || report.size > 5 * 1024 * 1024) {
      setError('Choose a PDF, JPG or PNG up to 5 MB.'); return;
    }
    uploadPending.current=true;
    setFile(report); setReviewed(false); setExtractionStatus('loading'); setBusy(true); setError('');
    setReportNotes([]); setReportContext([]);
    setExtractionSource(null);
    try {
      const digest=globalThis.crypto?.subtle && report.arrayBuffer ? await crypto.subtle.digest('SHA-256',await report.arrayBuffer()) : null;
      const key=digest?report.type+':'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''):report;
      const result = reportCache.current.has(key) ? structuredClone(reportCache.current.get(key)) : await extractSoil(report);
      if(reportCache.current.size>=3) reportCache.current.delete(reportCache.current.keys().next().value);
      reportCache.current.set(key,structuredClone(result));
      const mapped = mapSoilReport(result);
      setData(current => ({ ...current, soil: { ...emptySoil, ...mapped.soil, ...mapped.nutrients } }));
      setReportNotes(mapped.notes); setReportContext(mapped.context);
      setSoilMode('review'); setExtractionStatus('ready');
      setExtractionSource(result.extraction?.source ?? null);
    } catch (e) { setError(e.message); setExtractionStatus('error'); if(e.code==='GEMINI_RATE_LIMITED'){setClock(Date.now());setQuotaUntil(Date.now()+(e.retryAfterSeconds ?? 60)*1000);} }
    finally { setBusy(false); uploadPending.current=false; }
  }
  function enterManually() {
    setSoilMode('manual'); setFile(null); setExtractionStatus('idle'); setReviewed(false);
    setReportNotes([]); setReportContext([]); setError('');
    setExtractionSource(null);
  }
  function showLocationError() { setLocationError('Select your farm on the map or enter valid coordinates to continue.'); requestAnimationFrame(()=>document.getElementById('location-error')?.focus({preventScroll:true})); }
  async function next(event) {
    event.preventDefault();
    if (!validLocation(data.farm)) { showLocationError(); setStep(1); return; }
    if (step === 2 && !canContinueSoil({ status: extractionStatus, reviewed })) {
      setError('Review and confirm the extracted measurements, or enter them manually.'); return;
    }
    if (step < 3) { moveTo(step + 1); return; }
    if (!canContinueSoil({ status: extractionStatus, reviewed })) { moveTo(2); return; }
    // Submit only the reviewed values. NASA and ranking run on the backend.
    setBusy(true); setError('');
    try {
      const { nitrogen, phosphorus, potassium, nitrogenUnit, phosphorusUnit, potassiumUnit, ...submittedSoil } = data.soil;
      const result = await analyzeFarm({ ...data, soil: submittedSoil, mode: 'live', priorities: { ...data.priorities, seasonalLimitMm: data.priorities.irrigation === 'irrigated' ? data.priorities.seasonalLimitMm : null, category: 'any' } });
      navigate('/results', { state: { analysis: result } });
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const showingFields = soilMode === 'manual' || soilMode === 'review';
  return <section className="section page analyze-page">
    <div className="page-heading"><h1>Let's get to know your land.</h1></div>
    <ol className="stepper" aria-label="Analysis progress">{['Your Land', 'Your Soil', 'Water'].map((label, i) => <li className={step === i + 1 ? 'current' : step > i + 1 ? 'complete' : ''} aria-current={step === i + 1 ? 'step' : undefined} key={label}><span>{step > i + 1 ? <Check size={17}/> : i + 1}</span>{label}</li>)}</ol>
    <form className="form-panel" onSubmit={next} aria-busy={busy}>
      <h2 ref={heading} tabIndex="-1">{['Your land', 'Your soil', 'How is your farm watered?'][step - 1]}</h2>
      {error && <div className="upload-error" role="alert"><p>{step === 2 && extractionStatus === 'error' ? "Couldn't read this report." : ''} {error}</p>{step === 2 && extractionStatus === 'error' && <div className="button-row"><button type="button" className="text-button" onClick={()=>upload(file)} disabled={busy || quotaUntil>clock}>Try Again</button><button type="button" className="text-button" onClick={enterManually}>Enter Manually</button></div>}</div>}
      {quotaUntil>clock && step===2 && <p role="status" className="field-note">Google asked us to wait. Upload retries resume after {new Date(quotaUntil).toLocaleTimeString()}. You can enter values manually now.</p>}
      <fieldset disabled={busy} className="step-fields">
      {step === 1 && <div className="form-grid">
        <label className="wide">Farm name<input required maxLength="80" value={data.farm.name} onChange={e => update('farm', 'name', e.target.value)} placeholder="e.g. North Field"/></label>
        <div className="wide"><FarmLocationPicker value={data.farm} error={locationError} onChange={point=>{setData(current=>({...current,farm:{...current.farm,...point}}));setLocationError(validLocation(point)?'':'Enter valid latitude and longitude.');}}/></div>
        <label>Planting month<select value={data.farm.plantingMonth} onChange={e => update('farm','plantingMonth',Number(e.target.value))}>{months.map((month, i) => <option value={i+1} key={month}>{month}</option>)}</select></label>
        <label>Planting year<input required type="number" min="1981" max="2100" value={data.farm.plantingYear} onChange={e => update('farm','plantingYear',numeric(e.target.value))}/></label>
        <label className="wide">Previous crop<select value={data.farm.previousCrop ?? ''} onChange={e => update('farm','previousCrop',e.target.value || null)}><option value="">Unknown / none</option>{crops.map(crop => <option value={crop.id} key={crop.id}>{crop.commonName}</option>)}</select></label>
      </div>}
      {step === 2 && <>
        <label className="upload-box"><Upload size={26}/><strong>{busy ? 'Reading your report…' : file ? 'Replace soil report' : 'Upload Soil Report'}</strong><span>{file?.name || 'PDF, JPG or PNG · Up to 5 MB'}</span><input aria-label="Upload Soil Report" disabled={quotaUntil>clock} type="file" accept="application/pdf,image/jpeg,image/png" onChange={e => upload(e.target.files?.[0])}/></label>
        {extractionStatus === 'loading' && <LoadingStatus message="Reading your soil report?" detail="Extracting available measurements"/>}
        <button type="button" className="text-button manual-toggle" onClick={enterManually}>Enter soil details manually</button>
        {extractionStatus === 'ready' && <p role="status" className="extraction-success">Soil details extracted.{extractionSource === 'gemini' && <span> Report analyzed with Gemini</span>}</p>}
        {showingFields && <div className={preview ? 'review-layout' : 'manual-fields'}>
          {preview && file && <div className="report-preview"><h3>Your report</h3>{file.type === 'application/pdf' ? <object data={preview} type="application/pdf" aria-label="Original soil report"><p>Preview unavailable.</p></object> : <img src={preview} alt="Uploaded soil report for comparison"/>}<a className="text-link" href={preview} target="_blank" rel="noreferrer">Open original report ↗</a></div>}
          <div className="review-fields"><h3>{soilMode === 'review' ? 'Review the measurements' : 'Soil measurements'}</h3><p className="field-note">{soilMode === 'review' ? 'Compare with your report and correct any errors.' : 'Leave measurements you do not know blank.'}</p>
            <div className="form-grid">
              <label>Soil pH<input type="number" min="0" max="14" step="any" value={data.soil.ph ?? ''} onChange={e => update('soil','ph',numeric(e.target.value))}/></label>
              <label>pH test method<input maxLength="80" value={data.soil.phMethod} onChange={e => update('soil','phMethod',e.target.value)} placeholder="As written on report"/></label>
              <label>Salinity (dS/m)<input type="number" min="0" max="100" step="any" value={data.soil.ec ?? ''} onChange={e => update('soil','ec',numeric(e.target.value))}/></label>
              <label>Salinity test method<input maxLength="80" value={data.soil.ecMethod} onChange={e => update('soil','ecMethod',e.target.value)} placeholder="e.g. ECe"/></label>
              <label>Organic matter (%)<input type="number" min="0" max="100" step="any" value={data.soil.organicMatter ?? ''} onChange={e => update('soil','organicMatter',numeric(e.target.value))}/></label>
              <label>Soil texture<input maxLength="50" value={data.soil.texture} onChange={e => update('soil','texture',e.target.value)} placeholder="e.g. Sandy loam"/></label>
            </div>
            <p className="field-note">Only supported measurements affect the score. Organic matter and texture are kept as context.</p>
            <details className="context-details"><summary>Nutrient readings (optional)</summary><p>Keep the report's units and methods. These readings provide context and do not change crop scores.</p>{['nitrogen','phosphorus','potassium'].map(key=><div className="form-grid" key={key}>
              <label>{key[0].toUpperCase()+key.slice(1)}<input type="number" min="0" max="100000" step="any" value={data.soil[key] ?? ''} onChange={e=>update('soil',key,numeric(e.target.value))}/></label>
              <label>{key} unit<input maxLength="30" value={data.soil[`${key}Unit`] ?? ''} placeholder="Unknown" onChange={e=>update('soil',`${key}Unit`,e.target.value)}/></label>
              <label className="wide">{key} form / method<input maxLength="80" value={data.soil[`${key}Method`] ?? ''} placeholder="Unknown" onChange={e=>update('soil',`${key}Method`,e.target.value)}/></label>
            </div>)}</details>
            {reportNotes.length > 0 && <div className="review-notes"><h4>Check these readings</h4><ul>{reportNotes.map((note, i) => <li key={i}>{note}</li>)}</ul></div>}
            {reportContext.length > 0 && <details className="context-details"><summary>Other report readings</summary><p>Shown for reference; these readings are not used in the crop score.</p><dl>{reportContext.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>}
            {extractionStatus === 'ready' && <label className="review-confirm"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)}/><span>I checked these measurements against my report and corrected any errors.</span></label>}
          </div>
        </div>}
        {soilMode === 'upload' && extractionStatus === 'idle' && <p className="field-note">No report? You can continue with climate data only.</p>}
      </>}
      {step === 3 && <>
        <div className="water-options">{[['rain-fed', 'Rain-fed', 'Rain is the only water source.'], ['irrigated', 'Irrigated', 'Water is supplied to the field.']].map(([value, label, description]) => <label className={data.priorities.irrigation === value ? 'water-option selected' : 'water-option'} key={value}><input type="radio" name="irrigation" value={value} checked={data.priorities.irrigation === value} required onChange={() => update('priorities','irrigation',value)}/><span><strong>{label}</strong><span>{description}</span></span></label>)}</div>
        {data.priorities.irrigation === 'irrigated' && <label className="water-amount">Usable irrigation delivered to the field this season (mm)<span className="field-note">Optional — leave blank if unknown.</span><input type="number" min="0" max="5000" step="any" value={data.priorities.seasonalLimitMm ?? ''} onChange={e => update('priorities','seasonalLimitMm',numeric(e.target.value))}/></label>}
        {data.priorities.irrigation === 'irrigated' && <details><summary>I know the water volume instead</summary><p className="field-note">Leave the mm field blank to use volume. Enter usable water delivered to the field, after system losses.</p><div className="form-grid"><label>Water volume (m3)<input type="number" min="0" max="1000000000" step="any" value={data.priorities.irrigationVolumeM3 ?? ''} onChange={e=>update('priorities','irrigationVolumeM3',numeric(e.target.value))}/></label><label>Farm area (m2)<input type="number" min="0.01" max="1000000000" step="any" value={data.priorities.areaM2 ?? ''} onChange={e=>update('priorities','areaM2',numeric(e.target.value))}/></label></div></details>}
        <label className="water-amount">Is your field mostly level or gently sloping?<select value={data.priorities.slope ?? 'unknown'} onChange={e=>update('priorities','slope',e.target.value)}><option value="unknown">Not sure</option><option value="gentle">Yes - slope up to 5%</option><option value="steep">No - steeper than 5%</option></select><span className="field-note">This helps estimate usable rain. If unsure, water remains unscored.</span></label>
      </>}
      </fieldset>
      <div className="form-actions">{step > 1 ? <button className="button button-ghost" type="button" disabled={busy} onClick={() => moveTo(step-1)}><ArrowLeft size={18}/>Back</button> : <span/>}
        <button className="button button-primary" type="submit" onClick={event=>{if(step===1 && !validLocation(data.farm)){event.preventDefault();showLocationError();}}} disabled={busy || (step === 2 && !canContinueSoil({ status: extractionStatus, reviewed }))}>{busy ? (step === 3 ? 'Analyzing…' : 'Reading report…') : step === 3 ? 'Analyze My Farm' : 'Continue'}{!busy && <ArrowRight size={18}/>}</button>
      </div>
      {busy && step === 3 && <p role="status" className="field-note">Retrieving NASA climate data and comparing crops…</p>}
    </form>
  </section>;
}

