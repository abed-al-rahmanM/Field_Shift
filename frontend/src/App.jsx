import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';

const Analyze = lazy(() => import('./pages/Analyze'));
const Results = lazy(() => import('./pages/Results'));
const History = lazy(() => import('./pages/History'));
const Sources = lazy(() => import('./pages/Sources'));

export default function App() { return <BrowserRouter><Suspense fallback={<div className="route-loading">Loading…</div>}><Routes><Route element={<Layout/>}><Route path="/" element={<Home/>}/><Route path="/analyze" element={<Analyze/>}/><Route path="/results" element={<Results/>}/><Route path="/history" element={<History/>}/><Route path="/sources" element={<Sources/>}/><Route path="*" element={<Home/>}/></Route></Routes></Suspense></BrowserRouter>; }
