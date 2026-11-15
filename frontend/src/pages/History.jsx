import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteAnalysis, getHistory, saveDraft } from '../utils/storage';
import { cropPhotos, plantingSeason } from '../utils/presentation';

export default function History() {
  const [items, setItems] = useState(getHistory);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  function remove(id) {
    if (!deleteAnalysis(id)) return setMessage('Could not delete this analysis. Browser storage may be unavailable.');
    setItems(getHistory()); setPendingDelete(null);
  }
  function again(item) {
    saveDraft({ mode: 'live', farm: item.farm, soil: item.soil, priorities: { irrigation: item.priorities?.irrigation ?? 'unknown', seasonalLimitMm: item.priorities?.seasonalLimitMm ?? null, category: 'any' } });
    navigate('/analyze');
  }
  return <section className="section page history-page">
    <div className="page-heading"><h1>Your saved analyses</h1><p>Saved in this browser.</p></div>
    {message && <p role="alert" className="alert error">{message}</p>}
    {!items.length ? <div className="empty-state"><h2>No saved analyses yet</h2><p>Save a result to find it here.</p><Link className="button button-primary" to="/analyze">Analyze My Farm</Link></div> :
      <div className="history-list">{items.map(item => {
        const top = item.topCrops[0]?.crop; const photo = top && cropPhotos[top.id];
        return <article className="history-item" key={item.analysisId}>
          {photo && <img src={photo.src} alt={photo.alt} width="112" height="112" loading="lazy"/>}
          <div className="history-description"><h2>{item.farm.name}</h2><p>Saved {new Date(item.createdAt).toLocaleDateString('en')} · Planting {plantingSeason(item.farm)}</p><p>Top crop: <strong>{top?.name ?? 'No supported match'}</strong>{item.mode === 'demo' ? ' · Demo Data' : ''}</p></div>
          <div className="history-actions"><Link className="button button-primary" to={`/results?id=${item.analysisId}`}>View</Link><button className="text-button" onClick={() => again(item)}>Analyze again</button><button className="text-button danger" onClick={() => setPendingDelete(item.analysisId)}>Delete</button></div>
          {pendingDelete === item.analysisId && <div className="delete-confirm" role="group" aria-label="Confirm deletion"><span>Delete this saved analysis?</span><button className="button button-secondary" onClick={() => setPendingDelete(null)}>Keep</button><button className="button button-danger" onClick={() => remove(item.analysisId)}>Delete</button></div>}
        </article>;
      })}</div>}
  </section>;
}

