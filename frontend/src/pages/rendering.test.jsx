import nasaWaterFixture from '../../../backend/data/water-verification-nasa.json';
import cropCatalogue from '../../../backend/data/crops.json';
import { rankCrops } from '../../../backend/src/services/scoring/cropScore.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { runAnalysis } from '../../../backend/src/services/analysis.js';
import Results from './Results';
import Home from './Home';
import History from './History';
import { saveAnalysis } from '../utils/storage';

let memory;
beforeEach(() => {
  memory = {};
  globalThis.localStorage = { getItem: key => memory[key] ?? null, setItem: (key, value) => { memory[key] = value; }, removeItem: key => { delete memory[key]; } };
});
const demoRequest = { mode:'demo', farm:{name:'Demo',latitude:34.5,longitude:36,plantingMonth:3,plantingYear:2027}, soil:{}, priorities:{} };
function renderResult(analysis, query = '') {
  return renderToStaticMarkup(<MemoryRouter initialEntries={[{ pathname: '/results', search: query, state: analysis ? { analysis } : null }]}><Results/></MemoryRouter>);
}
describe('redesigned page rendering', () => {
  it('renders calculated demo crops, partial scores and source disclosure', async () => {
    const analysis = await runAnalysis(demoRequest);
    const html = renderResult(analysis);
    expect(html).toContain('Demo Data');
    expect(html).toContain('Save Analysis');
    expect(html).toContain('Suitability score - Limited data');
    expect(html).toContain('Not scored');
    expect(html).toContain('0.5');
    for (const item of analysis.topCrops) expect(html).toContain(item.crop.name);
    expect(html).not.toMatch(/undefined|NaN/);
  });
  it('reopens saved results and renders history without an account', async () => {
    const analysis = await runAnalysis(demoRequest);
    expect(saveAnalysis(analysis)).toBe(true);
    expect(renderResult(null, '?id=' + analysis.analysisId)).toContain(analysis.farm.name);
    const history = renderToStaticMarkup(<MemoryRouter><History/></MemoryRouter>);
    expect(history).toContain(analysis.farm.name);
    expect(history).toContain('View');
  });
  it('handles a direct results visit without an analysis', () => {
    expect(renderResult(null)).toContain('No analysis selected');
  });
  it('renders the concise homepage with a real local photograph', () => {
    const html = renderToStaticMarkup(<MemoryRouter><Routes><Route element={<Outlet context={{ launchDemo: () => {}, demoLoading: false }}/>}><Route path="/" element={<Home/>}/></Route></Routes></MemoryRouter>);
    expect(html).toContain('Grow smarter');
    expect(html).toContain('/images/farmland.webp');
    expect(html).not.toContain('FIELD SIGNAL');
  });
});


it('renders real-weather water numbers consistently and keeps them through saved history', async()=>{
 const base=await runAnalysis(demoRequest);
 const input={farm:{...base.farm,plantingMonth:3},soil:{ph:6.5},priorities:{irrigation:'irrigated',seasonalLimitMm:300,slope:'gentle',category:'any'}};
 const ranked=rankCrops(cropCatalogue,input,nasaWaterFixture);
 const analysis={...base,...input,mode:'live',climate:nasaWaterFixture,topCrops:ranked.slice(0,3)};
 const html=renderResult(analysis);
 for(const c of analysis.topCrops){expect(html).toContain(c.components.water.waterDemandMm.toFixed(1));expect(html).toContain(c.components.water.deficitMm.toFixed(1));expect(html).toContain(String(c.score));}
 expect(html).toContain('Water analysis');expect(html).toContain('Water shortfall');expect(html).not.toMatch(/NaN|undefined/);
 expect(saveAnalysis(analysis)).toBe(true);expect(renderResult(null,'?id='+analysis.analysisId)).toContain(ranked[0].components.water.waterDemandMm.toFixed(1));
});
