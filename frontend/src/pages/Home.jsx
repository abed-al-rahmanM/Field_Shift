import { ArrowRight } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';

export default function Home() {
  const { launchDemo, demoLoading } = useOutletContext();
  return <div className="home-page">
    <section className="hero section">
      <div className="hero-copy"><h1>Grow smarter<br/>with NASA data.</h1><p>Compare crops for your soil and climate.</p>
        <div className="hero-actions"><Link className="button button-primary" to="/analyze">Analyze My Farm <ArrowRight size={18}/></Link><button className="button button-secondary" onClick={launchDemo} disabled={demoLoading}>{demoLoading ? 'Opening…' : 'Try Demo'}</button></div>
      </div>
      <img className="hero-photo" src="/images/farmland.webp" alt="Green wheat fields stretching across rolling farmland" width="1600" height="1067" fetchPriority="high"/>
    </section>
    <section className="section home-steps" aria-label="How it works">
      <ol>{['Enter your land details.', 'Analyze your soil.', 'Compare crop options.'].map((label, i) => <li key={label}><span>0{i + 1}</span><h2>{label}</h2></li>)}</ol>
      <Link className="text-link" to="/analyze">Start Analysis <ArrowRight size={18}/></Link>
    </section>
  </div>;
}

