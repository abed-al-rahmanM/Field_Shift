import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { analyzeFarm } from '../services/api';

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [location.pathname, location.search]);
  async function launchDemo() {
    setOpen(false); setDemoLoading(true);
    try {
      const result = await analyzeFarm({ mode: 'demo', farm: { name: 'Demo', latitude: 34.53, longitude: 36.05, plantingMonth: 3, plantingYear: 2027 }, soil: {}, priorities: {} });
      navigate('/results', { state: { analysis: result } });
    } catch (error) { navigate('/analyze', { state: { error: error.message } }); }
    finally { setDemoLoading(false); }
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><NavLink to="/" className="brand" aria-label="Field Shift home">FIELD SHIFT<span aria-hidden="true">.</span></NavLink>
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="primary-nav">{open ? <X/> : <Menu/>}</button>
      <nav id="primary-nav" className={open ? 'nav open' : 'nav'} aria-label="Main navigation">
        <NavLink to="/" end>Home</NavLink><NavLink to="/analyze">Analyze</NavLink><NavLink to="/history">History</NavLink>
        <button className="button button-primary" onClick={launchDemo} disabled={demoLoading}>{demoLoading ? 'Opening…' : 'Try Demo'}</button>
      </nav>
    </header>
    <main id="main"><Outlet context={{ launchDemo, demoLoading }}/></main>
    <footer className="site-footer"><div className="footer-inner"><div className="footer-identity"><NavLink to="/" className="footer-name">FIELD SHIFT</NavLink><p>NASA Space Apps 2026</p></div><div className="footer-links"><NavLink to="/sources">Sources & Methodology</NavLink><p>Independent hackathon project. Not endorsed by NASA.</p></div></div></footer>
  </div>;
}

