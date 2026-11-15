import { ArrowRight, Droplets } from 'lucide-react';
import { cropPhotos } from '../utils/presentation';

export default function RotationCard({plan,index}) {
  const benefit=plan.benefit.replace(/^(\d+) crop families across three opportunities\.$/,'Includes crops from $1 plant families.');
  return <article className="season-plan">
    <header className="season-plan-header"><div><span className="plan-eyebrow">CROP ROTATION</span><h3>Plan {String.fromCharCode(65+index)}</h3></div><div className="season-plan-score"><strong>{plan.score}<span>/100</span></strong><span>Plan score</span></div></header>
    <ol className="season-steps">{plan.sequence.map((crop,i)=>{
      const photo=cropPhotos[crop.id];
      return <li key={`${crop.id}-${i}`}><div className="season-step-label"><span>{String(i+1).padStart(2,'0')}</span>Season {i+1}</div><div className="season-crop">{photo && <img src={photo.src} alt="" width="72" height="72" loading="lazy"/>}<strong>{crop.name}</strong></div>{i<plan.sequence.length-1 && <ArrowRight className="season-arrow" size={20} aria-hidden="true"/>}</li>;
    })}</ol>
    <div className="season-plan-notes"><div><h4>Why consider this plan</h4><p>{benefit}</p></div><div><h4>Before you plant</h4><p>{plan.risk.includes('repetition')?'Review repeated crops and families with a local adviser.':'Check local pest and disease risks.'}</p></div></div>
    <details className="season-plan-details"><summary>View plan details</summary><div className="season-detail-grid">
      <section><h4>How the score is calculated</h4><p>{plan.breakdown.formula}</p><p className="field-note">A comparison indicator, not a prediction of crop success.</p></section>
      <section className="plan-water-note"><h4><Droplets size={18} aria-hidden="true"/>Preliminary water assessment</h4><p>{plan.water}</p></section>
      <section><h4>Rotation considerations</h4><p>{plan.risk}</p></section>
      <section><h4>Check locally</h4><ul>{plan.missing.map(item=><li key={item}>{item}</li>)}</ul></section>
    </div></details>
  </article>;
}
