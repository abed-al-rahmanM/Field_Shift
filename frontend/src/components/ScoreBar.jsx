export default function ScoreBar({ label, value, missing }) {
  return <div className={`score-row score-${label.toLowerCase()}`}>
    <div><span>{label}</span><strong>{value == null ? 'Not scored' : `${Math.round(value)}/100`}</strong></div>
    {value == null ? <p className="score-unavailable">{label==='Water'?(missing?.length?'Water data incomplete: '+missing.join('; '):'Crop water-demand data are incomplete.'):'Not enough data to calculate this score.'}</p> : <div className="score-track" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div>}
  </div>;
}

