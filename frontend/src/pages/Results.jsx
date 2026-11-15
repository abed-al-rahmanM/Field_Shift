import { Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ScoreBar from '../components/ScoreBar';
import RotationCard from '../components/RotationCard';
import { exportAnalysis, getAnalysis, saveAnalysis, saveDraft } from '../utils/storage';
import { temperatureChartData, climateLabel, climateHeading } from '../utils/climatePresentation';
import { explainFarm } from '../services/api';
import FarmerAssistant from '../components/FarmerAssistant';
import FarmLocationPicker from '../components/forms/FarmLocationPicker';
import { cropPhotos, cropReason, plantingSeason } from '../utils/presentation';

function CropCard({ item, rank, explanation }) {
  const photo = cropPhotos[item.crop.id];
  const pros = [
    item.components.soil.subscores?.ph >= 80 && 'Soil pH is within a suitable range.',
    item.components.climate.subscores?.temperature >= 80 && 'Historical temperatures are a good fit.',
  ].filter(Boolean);
  const risks = [...new Set([...item.hardConstraints, ...item.warnings])];
  const missing = [...new Set(Object.values(item.components).flatMap(part => part.missing ?? []))];
  return <article className={rank === 0 ? 'crop-card top-crop' : 'crop-card'}>
    {photo && <img className="crop-photo" src={photo.src} alt={photo.alt} width="720" height="460" loading="lazy"/>}
    <div className="crop-content">
      <div className="crop-heading"><h3>{item.crop.name}</h3><div className="crop-score"><strong>{item.score ?? '—'}</strong><span>/100</span></div></div>
      <p className="score-caption">{item.scoreStatus === 'complete' ? 'Suitability score' : 'Suitability score - Limited data'}</p>
      <p className="crop-reason">{explanation?.reason || cropReason(item)}</p>
      <div className="score-list"><ScoreBar label="Soil" value={item.components.soil.score}/><ScoreBar label="Temperature" value={item.components.climate.subscores?.temperature ?? null}/><ScoreBar label="Water" value={item.components.water.score} missing={item.components.water.missing}/></div>
      {item.components.water.deficitMm>0 && <p className="field-note">Water shortfall: {item.components.water.deficitMm.toFixed(1)} mm under this seasonal estimate. Review irrigation before choosing this crop.</p>}
      <details className="crop-details"><summary>View details</summary><div className="detail-content">
        {pros.length > 0 && <><h4>Good fit</h4><ul>{pros.slice(0,3).map(pro => <li key={pro}>{pro}</li>)}</ul></>}
        <h4>Things to consider</h4><ul>{risks.slice(0,3).map(risk => <li key={risk}>{risk}</li>)}</ul>
        {missing.length > 0 && <><h4>Missing information</h4><p>{missing.join('; ')}.</p></>}
        <h4>Water analysis</h4><p>Seasonal screening estimate{item.components.water.period?.end ? ' | '+item.components.water.period.start+' to '+item.components.water.period.end : ''}.</p>
        <dl>{[['Estimated crop water demand','waterDemandMm'],['Total rainfall','rainfall'],['Effective rainfall','effectiveRainfallMm'],['Usable irrigation','irrigationMm'],['Estimated deficit','deficitMm']].map(([label,key])=>{const value=key==='rainfall'?item.components.water.rainfall?.value:item.components.water[key];return Number.isFinite(value)?<div key={key}><dt>{label}</dt><dd>{value.toFixed(1)} mm</dd></div>:null;})}</dl>
        {item.components.water.score==null && Number.isFinite(item.components.water.rainOnlyScore) && <p>Rain-only baseline: {item.components.water.rainOnlyScore.toFixed(1)}/100. Total irrigation supply remains unknown; this is excluded from ranking.</p>}
        {item.components.water.et0 && <p>Source: NASA POWER, FAO-56 crop coefficients and reference evapotranspiration; FAO monthly effective rainfall.</p>}
        {item.components.water.assumptions?.map(note=><p className="field-note" key={note}>{note}</p>)}
        <h4>About this score</h4><p>{item.scoreCoverage}% of the model weight has a score. Missing components are excluded, and the remaining weights are rescaled. This is not a probability of success.</p>
        <p>Climate component: {item.components.climate.score ?? 'not scored'}/100, combining temperature and an unverified planting calendar.</p>
      </div></details>
    </div>
  </article>;
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryId = new URLSearchParams(location.search).get('id');
  const analysis = location.state?.analysis || (queryId ? getAnalysis(queryId) : null);
  const [savedId, setSavedId] = useState(queryId);
  const [message, setMessage] = useState('');
  const [aiExplanation, setAiExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [aiError, setAiError] = useState('');
  useEffect(()=>{setAiExplanation(null);setAiError('');},[analysis?.analysisId]);
  useEffect(() => { setSavedId(queryId); setMessage(''); }, [analysis?.analysisId, queryId]);
  const chart = useMemo(() => temperatureChartData(analysis?.climate), [analysis]);
  if (!analysis) return <section className="section page empty-state"><h1>No analysis selected</h1><p>Analyze your land or open a saved result.</p><div className="button-row"><Link className="button button-primary" to="/analyze">Analyze My Farm</Link><Link className="button button-secondary" to="/history">View History</Link></div></section>;
  const weights = analysis.scoringWeights;
  const demo = analysis.mode === 'demo';
  const saved = savedId === analysis.analysisId;
  async function requestExplanation() {
    setExplaining(true);setAiError('');
    try {setAiExplanation(await explainFarm(analysis));} catch(error){setAiError(error.message);} finally{setExplaining(false);}
  }
  function changeLocation() {saveDraft({mode:'live',farm:analysis.farm,soil:analysis.soil,priorities:analysis.priorities});navigate('/analyze');}
  function save() {
    if (saveAnalysis(analysis)) { setSavedId(analysis.analysisId); setMessage('Saved in this browser.'); }
    else setMessage('Could not save in this browser. Download a copy from the details below.');
  }
  return <section className="section page results-page">
    {demo && <div className="demo-indicator" role="note">Demo Data<span>Fictional farm, soil and climate.</span></div>}
    <div className="results-title"><div><h1>{analysis.farm.name}</h1><p>Planting {plantingSeason(analysis.farm)}</p></div><button className="button button-primary" onClick={save} disabled={saved}>{saved ? 'Saved' : 'Save Analysis'}</button></div>
    {message && <p className="save-message" role="status">{message} {saved && <Link to="/history">View History →</Link>}</p>}
    <dl className="summary-strip"><div><dt>Location</dt><dd>{analysis.farm.latitude.toFixed(2)}, {analysis.farm.longitude.toFixed(2)}</dd></div><div><dt>Soil pH</dt><dd>{analysis.soil.ph ?? 'Unknown'}</dd></div><div><dt>Mean temperature</dt><dd>{analysis.climate.summary.averageTemperatureC}°C</dd></div><div><dt>Season rainfall</dt><dd>{analysis.climate.summary.totalRainfallMm} mm</dd></div></dl>
    {demo && <details className="demo-location"><summary>View sample farm location</summary><FarmLocationPicker value={analysis.farm} readOnly/><p className="field-note">Synthetic data belong to this sample location. Choose another location in a new live analysis.</p><button className="text-button" onClick={changeLocation}>Analyze another location</button></details>}
    <section className="result-section"><div className="section-heading"><h2>Crops for your land</h2><div className="explanation-status"><span>{aiExplanation?.source === 'gemini' ? 'Explained with Gemini' : 'Rule-based explanation'}</span>{!demo && <button className="text-button" disabled={explaining || aiExplanation?.source === 'gemini'} onClick={requestExplanation}>{explaining?'Explaining…':'Explain with AI'}</button>}</div>{(aiError || aiExplanation?.warning) && <p className="field-note" role="status">{aiError || aiExplanation.warning}</p>}</div>
      {analysis.topCrops.length ? <div className="crop-grid">{analysis.topCrops.map((item, i) => <CropCard key={item.crop.id} item={item} rank={i} explanation={aiExplanation?.crops.find(c=>c.id===item.crop.id)}/>)}</div> : <p className="empty-state">No crops meet the current screening conditions. Review your soil measurements and planting season.</p>}
    </section>
    <section className="result-section"><div className="section-heading"><h2>Plan your next seasons</h2><p>Review these sequences with a local adviser.</p></div>
      {analysis.rotationPlans.length ? <div className="rotation-list">{analysis.rotationPlans.map((plan, i) => <RotationCard key={plan.id} plan={plan} index={i}/>)}</div> : <p className="empty-state">There is not enough information to suggest a rotation.</p>}
    </section>
    <section className="result-section climate-section"><div className="section-heading"><h2>Climate Overview</h2><p>{climateHeading(analysis.climate,analysis.mode)}</p></div>
      <div className="climate-chart" role="img" aria-label={`Daily temperature chart. Observed range ${analysis.climate.summary.minimumTemperatureC} to ${analysis.climate.summary.maximumTemperatureC} degrees Celsius.`}><ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}><CartesianGrid vertical={false} stroke="#e0e8e1"/><XAxis dataKey="date" tickFormatter={date => new Date(date+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',day:'2-digit',timeZone:'UTC'})} minTickGap={32} tick={{fontSize:14,fill:'#4d6258',fontWeight:500}} tickLine={false} axisLine={false}/><YAxis domain={[min=>Math.floor(min-2),max=>Math.ceil(max+2)]} tick={{fontSize:14,fill:"#4d6258",fontWeight:500}} unit="°C" width={58} tickLine={false} axisLine={false}/><Tooltip contentStyle={{borderRadius:10,border:"1px solid #dde5dd",padding:14,fontSize:16}} labelStyle={{fontWeight:700}} labelFormatter={date=>new Date(date+"T00:00:00Z").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"UTC"})} formatter={value => [`${value} °C`, "Temperature"]}/><Line connectNulls={false} type="linear" dataKey="temperature" stroke="#174C3C" strokeWidth={3} dot={false} activeDot={{r:5,strokeWidth:2,stroke:'#fff'}} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>
    </section>
    <FarmerAssistant key={analysis.analysisId} analysis={analysis}/>
    <details className="methodology"><summary>How were these results calculated?</summary><div className="method-content">
      <section><h3>{demo ? 'Illustrative climate data' : 'NASA data'}</h3><p className="field-note">{demo ? 'Illustrative temperature readings (°C)' : 'NASA POWER · T2M air temperature (°C)'}{!demo && analysis.climate.latestObservationDate ? ` · Latest observation: ${analysis.climate.latestObservationDate}` : ''}</p><p>{climateLabel(analysis.climate,analysis.mode)}</p><p>{analysis.climate.provenance.dataset}</p><p>{analysis.climate.provenance.spatialNote}</p><p>{analysis.climate.dateSelectionReason}</p><p>Retrieved: {analysis.climate.retrievedAt ?? 'Not applicable'} · Time standard: {analysis.climate.timeStandard ?? 'Not applicable'}</p><p>Requested coordinates: {analysis.farm.latitude}, {analysis.farm.longitude}.</p><p>{analysis.climate.validDays} valid days; {analysis.climate.missingDays ?? 'unknown'} missing days. Observation coverage: {analysis.climate.observationCoveragePercent ?? 'unknown'}%.</p>{!demo && analysis.climate.provenance.apiUrl && <a href={analysis.climate.provenance.apiUrl} target="_blank" rel="noreferrer">View NASA observations ↗</a>}</section>
      <section><h3>Soil measurements</h3><dl className="soil-summary">{[['pH', analysis.soil.ph], ['pH method', analysis.soil.phMethod], ['Salinity (dS/m)', analysis.soil.ec], ['Salinity method', analysis.soil.ecMethod], ['Organic matter (%)', analysis.soil.organicMatter], ['Texture', analysis.soil.texture]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value == null || value === '' ? 'Unknown' : value}</dd></div>)}</dl></section>
      <section><h3>How we calculate scores</h3>{weights ? <p>Crop score = {weights.soil} × soil + {weights.climate} × climate + {weights.water} × water.</p> : <p>This saved analysis used an earlier model. Applied weights are listed for each crop below.</p>}<p>These are engineering weights, not validated crop-success probabilities. Missing components are excluded and remaining weights are normalized. A partial soil score can use pH alone. Climate combines temperature with an unverified planting-calendar assumption.</p><p>Water uses FAO-56 crop demand, monthly effective rainfall and usable irrigation. It measures seasonal coverage, not daily irrigation adequacy. Missing inputs keep water unscored. Salinity needs verified ECe thresholds. Organic matter, texture and nutrients are context only.</p><p>Rotation score: 85% mean crop score + 15% crop-family transition indicator. Future seasons are not separately forecast or simulated.</p></section>
      <section><h3>References & limitations</h3><ul>{analysis.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>{analysis.topCrops.map(item => <details className="technical-crop" key={item.crop.id}><summary>{item.crop.name}: full calculation notes</summary><ul>{[...new Set([...item.hardConstraints,...item.warnings])].map((warning, i) => <li key={i}>{warning}</li>)}</ul><p>Applied weights: {Object.entries(item.appliedWeights).map(([key, value]) => `${key} ${Math.round(value*100)}%`).join(', ')}.</p>{item.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</details>)}</section>
      <div className="detail-actions"><Link to="/sources">Sources & methodology</Link><button className="text-button" onClick={() => exportAnalysis(analysis)}><Download size={17}/>Download analysis</button></div>
    </div></details>
  </section>;
}

