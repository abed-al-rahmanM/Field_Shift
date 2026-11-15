import { useEffect, useRef, useState } from 'react';
import { askFarm } from '../services/api';
import LoadingStatus from './ui/LoadingStatus';
import { scopeAnswer, methodologyAnswer } from '../../../shared/questionPolicy.js';
const suggestions=['Why is this crop recommended?','Which crop needs less water?','How can I improve my soil?','What should I plant next season?'];
export default function FarmerAssistant({analysis}) {
  const requestId=useRef(0), pending=useRef(false);
  const [question,setQuestion]=useState(''),[answer,setAnswer]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{setAnswer(null);setQuestion('');setError('');setBusy(false);pending.current=false;return ()=>{requestId.current++;};},[analysis.analysisId]);
  async function ask(value) {
    if(!value.trim() || pending.current)return;
    const id=analysis.analysisId;
    const previousQuestion=answer?.analysisId===id?answer.question:undefined;
    const scoped=scopeAnswer(value,previousQuestion);
    const knowledge=methodologyAnswer(value);
    if(scoped || knowledge) {
      setQuestion(value);setError('');setAnswer({...scoped,answer:scoped?.answer ?? knowledge,question:value,analysisId:id,source:'rule_based'});return;
    }
    const first=analysis.topCrops?.[0];
    const local=suggestions.indexOf(value);
    if(local>=0 && analysis.topCrops) {
      const demand=analysis.topCrops.filter(c=>Number.isFinite(c.components?.water?.waterDemandMm)).sort((a,b)=>a.components.water.waterDemandMm-b.components.water.waterDemandMm)[0];
      const answers=[first?`${first.crop.name} ranks first at ${first.score}/100. ${first.reason}`:'There is not enough supported information to recommend a crop.',
        demand ? demand.crop.name+' has the lowest estimated seasonal demand among the recommendations: '+demand.components.water.waterDemandMm.toFixed(1)+' mm. Crop durations differ; check the reference profile in Water analysis. This is not an irrigation schedule.' : 'A reliable water comparison is unavailable. Check the specific missing inputs in Water analysis.',
        `Your recorded soil pH is ${analysis.soil.ph ?? 'unknown'}. These readings alone cannot establish an amendment rate. Review your report with a local agronomist.`,
        analysis.rotationPlans?.[0]?`The highest-ranked example sequence is ${analysis.rotationPlans[0].sequence.map(c=>c.name).join(' → ')}. Future seasons are not forecast; confirm sowing dates and water availability locally.`:'There is not enough information to propose a rotation.'];
      setQuestion(value);setError('');setAnswer({question:value,answer:answers[local],analysisId:id,source:analysis.mode==='demo'?'demo_rules':'rule_based'});return;
    }
    pending.current=true;const token=++requestId.current;
    setQuestion(value);setBusy(true);setError('');setAnswer(null);
    try {const result=await (previousQuestion?askFarm(analysis,value,previousQuestion):askFarm(analysis,value));if(token===requestId.current)setAnswer({...result,analysisId:id,question:value});}
    catch(e){if(token===requestId.current)setError(['GEMINI_TIMEOUT','REQUEST_TIMEOUT'].includes(e.code)?'AI is taking longer than expected. Please try again.':e.code==='GEMINI_RATE_LIMITED'?'AI is temporarily unavailable. You can still view your crop recommendations.':e.message);}
    finally{if(token===requestId.current){setBusy(false);pending.current=false;}}
  }
  const visible=answer?.analysisId===analysis.analysisId?answer:null;
  return <section className="result-section farmer-assistant" aria-label="Ask FIELD SHIFT AI">
    <h2>Have a question?</h2><p className="field-note">Ask FIELD SHIFT AI about your crops or soil.</p>
    <div className="question-suggestions">{suggestions.map(text=><button type="button" key={text} disabled={busy} onClick={()=>ask(text)}>{text}</button>)}</div>
    <form className="ask-form" onSubmit={e=>{e.preventDefault();ask(question);}}><label className="sr-only" htmlFor="farm-question">Ask about your farm</label><input id="farm-question" maxLength={500} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask about your farm..." readOnly={busy}/><button className="button button-primary" disabled={busy || !question.trim()}>{busy?'Thinking…':'Ask'}</button></form>
    {busy && <div className="farm-answer" aria-busy="true"><strong>{question}</strong><LoadingStatus dots message="Preparing your answer…"/></div>}
    {error && <p role="alert" className="field-note">{error}</p>}
    {visible && <div className="farm-answer" aria-live="polite"><strong>{visible.question}</strong><p dir="auto">{visible.answer}</p><small>{visible.source==='gemini'?'Answered with Gemini':visible.source==='demo_rules'?'Demo · Rule-based answer':'Rule-based answer'}{visible.contextTrust==='validated_client_snapshot'?' · From saved browser data':''}</small></div>}
  </section>;
}

