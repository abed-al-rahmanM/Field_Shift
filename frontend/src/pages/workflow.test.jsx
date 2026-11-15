// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Analyze from './Analyze';
import FarmerAssistant from '../components/FarmerAssistant';
import FarmLocationPicker from '../components/forms/FarmLocationPicker';
import * as api from '../services/api';
import { saveDraft } from '../utils/storage';
vi.mock('../services/api',()=>({fetchCrops:vi.fn(),extractSoil:vi.fn(),analyzeFarm:vi.fn(),askFarm:vi.fn()}));
vi.mock('../components/forms/FarmMap',()=>({default:({onChange,value})=><button type="button" onClick={()=>onChange({latitude:34.123456789,longitude:36.987654321})}>Select map point {value?.latitude}</button>}));
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();api.fetchCrops.mockResolvedValue([]);URL.createObjectURL=vi.fn(()=> 'blob:report');URL.revokeObjectURL=vi.fn();});
afterEach(cleanup);
const sample={ph:5.6,ec:3,ecUnit:'dS/m',ecMethod:'ECe',organicMatter:2,texture:'Sandy loam',nitrogen:{value:18,unit:'mg/kg',method:'nitrate-N'},phosphorus:{value:20,unit:'mg/kg',method:null},potassium:{value:120,unit:'mg/kg',method:null},extraction:{source:'gemini'}};
function form(){return render(<MemoryRouter><Routes><Route path="/" element={<Analyze/>}/><Route path="/results" element={<p>Analysis result</p>}/></Routes></MemoryRouter>);}
async function selectFarm(){
 form();fireEvent.change(screen.getByLabelText('Farm name'),{target:{value:'My farm'}});
 fireEvent.click(screen.getByRole('button',{name:'Continue'}));expect(screen.getByRole('alert').textContent).toContain('Select your farm');
 fireEvent.click(await screen.findByRole('button',{name:/Select map point/}));fireEvent.click(screen.getByRole('button',{name:'Continue'}));
}
it('selects exact coordinates, uploads, requires review, resets confirmation after edits, and submits',async()=>{
 api.extractSoil.mockResolvedValue(sample);api.analyzeFarm.mockResolvedValue({analysisId:'example'});
 await selectFarm();const file=new File(['%PDF-1.4'],'soil.pdf',{type:'application/pdf'});
 fireEvent.change(screen.getByLabelText('Upload Soil Report'),{target:{files:[file]}});
 await screen.findByText('Soil details extracted.');expect(api.extractSoil).toHaveBeenCalledExactlyOnceWith(file);
 expect(screen.getByLabelText('Soil pH').value).toBe('5.6');expect(screen.getByLabelText('Salinity (dS/m)').value).toBe('3');expect(screen.getByLabelText('Nitrogen').value).toBe('18');
 expect(screen.getByRole('button',{name:'Continue'}).disabled).toBe(true);
 fireEvent.click(screen.getByRole('checkbox'));expect(screen.getByRole('button',{name:'Continue'}).disabled).toBe(false);
 fireEvent.change(screen.getByLabelText('Soil pH'),{target:{value:'5.7'}});expect(screen.getByRole('button',{name:'Continue'}).disabled).toBe(true);
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Continue'}));fireEvent.click(screen.getByRole('radio',{name:/Rain-fed/}));fireEvent.click(screen.getByRole('button',{name:'Analyze My Farm'}));
 await screen.findByText('Analysis result');expect(api.analyzeFarm).toHaveBeenCalledTimes(1);const submitted=api.analyzeFarm.mock.calls[0][0];
 expect(submitted.farm.latitude).toBe(34.123456789);expect(submitted.farm.longitude).toBe(36.987654321);expect(submitted.soil.ph).toBe(5.7);expect(submitted.soil.phosphorusMethod).toBe('');expect(submitted.mode).toBe('live');
});
it('failed extraction preserves filename and permits manual partial input',async()=>{
 api.extractSoil.mockRejectedValue(new Error('AI quota is temporarily unavailable.'));await selectFarm();
 fireEvent.change(screen.getByLabelText('Upload Soil Report'),{target:{files:[new File(['%PDF-1.4'],'soil.pdf',{type:'application/pdf'})]}});
 await screen.findByRole('button',{name:'Try Again'});expect(screen.getByText('soil.pdf')).toBeTruthy();expect(screen.getByRole('button',{name:'Continue'}).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Enter Manually'}));fireEvent.change(screen.getByLabelText('Soil pH'),{target:{value:'6'}});expect(screen.getByRole('button',{name:'Continue'}).disabled).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Continue'}));expect(screen.getByText('How is your farm watered?')).toBeTruthy();expect(screen.queryByText(/Report analyzed with Gemini/)).toBeNull();
});
it('rejects an unsupported browser upload without an AI call',async()=>{
 await selectFarm();fireEvent.change(screen.getByLabelText('Upload Soil Report'),{target:{files:[new File(['text'],'report.txt',{type:'text/plain'})]}});expect(screen.getByRole('alert').textContent).toContain('PDF, JPG or PNG');expect(api.extractSoil).not.toHaveBeenCalled();
});
it('restores a saved location and allows replacing it',async()=>{
 saveDraft({farm:{name:'Saved',latitude:12.123456,longitude:23.987654,plantingMonth:3,plantingYear:2027},soil:{},priorities:{}});form();expect(screen.getByText(/Location selected: 12.1235, 23.9877/)).toBeTruthy();
 fireEvent.click(await screen.findByRole('button',{name:/Select map point/}));expect(screen.queryByRole('button',{name:'Confirm location'})).toBeNull();
});
it('requests geolocation only on click and permits manual entry after denial',async()=>{
 const getCurrentPosition=vi.fn((success,failure)=>failure());Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition},configurable:true});
 render(<FarmLocationPicker value={{}} onChange={vi.fn()}/>);expect(getCurrentPosition).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Use My Location'}));expect(getCurrentPosition).toHaveBeenCalledTimes(1);expect(screen.getByRole('status').textContent).toContain('enter coordinates');expect(screen.getByLabelText('Latitude')).toBeTruthy();
});
it('asks only on submit, disables duplicate requests and labels deterministic answers',async()=>{
 let resolve;api.askFarm.mockImplementation(()=>new Promise(r=>{resolve=r;}));const analysis={analysisId:'one'};render(<FarmerAssistant analysis={analysis}/>);
 fireEvent.change(screen.getByLabelText('Ask about your farm'),{target:{value:'Explain the soil'}});expect(api.askFarm).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Ask'}));expect(api.askFarm).toHaveBeenCalledExactlyOnceWith(analysis,'Explain the soil');expect(screen.getByRole('button',{name:/Thinking/}).disabled).toBe(true);
 resolve({answer:'Review the report.',source:'rule_based'});await screen.findByText('Rule-based answer');expect(screen.getByText('Review the report.')).toBeTruthy();
});
it('suggested questions submit once and surface quota errors',async()=>{
 api.askFarm.mockRejectedValue(new Error('AI quota unavailable.'));render(<FarmerAssistant analysis={{analysisId:'one'}}/>);fireEvent.click(screen.getByRole('button',{name:'Which crop needs less water?'}));await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('quota'));expect(api.askFarm).toHaveBeenCalledTimes(1);
});
it('answers suggestions instantly from a complete analysis without a request or loading dots',()=>{
 render(<FarmerAssistant analysis={{analysisId:'local',mode:'demo',topCrops:[],soil:{},rotationPlans:[]}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Which crop needs less water?'}));
 expect(api.askFarm).not.toHaveBeenCalled();expect(screen.getByText(/A reliable water comparison/)).toBeTruthy();expect(screen.queryByRole('status')).toBeNull();
});
it('answers unrelated and unclear questions immediately without claiming a failure',()=>{
 render(<FarmerAssistant analysis={{analysisId:'scope'}}/>);
 for(const question of ['Who won the football match yesterday?','What is this?']) {
  fireEvent.change(screen.getByLabelText('Ask about your farm'),{target:{value:question}});fireEvent.click(screen.getByRole('button',{name:'Ask'}));
  expect(screen.queryByRole('alert')).toBeNull();expect(screen.queryByRole('status')).toBeNull();
 }
 expect(screen.getByText(/Are you asking about the crop score/)).toBeTruthy();expect(api.askFarm).not.toHaveBeenCalled();
});
it('keeps real timeouts distinct from relevance and stops loading',async()=>{
 api.askFarm.mockRejectedValue(Object.assign(new Error('timeout'),{code:'GEMINI_TIMEOUT'}));render(<FarmerAssistant analysis={{analysisId:'timeout'}}/>);
 fireEvent.change(screen.getByLabelText('Ask about your farm'),{target:{value:'Why are potatoes recommended?'}});fireEvent.click(screen.getByRole('button',{name:'Ask'}));
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('longer than expected'));expect(screen.queryByText(/Preparing your answer/)).toBeNull();expect(api.askFarm).toHaveBeenCalledTimes(1);
});
it('shows upload activity while pending and stops on failure',async()=>{
 let reject;api.extractSoil.mockImplementation(()=>new Promise((_,r)=>{reject=r;}));await selectFarm();
 fireEvent.change(screen.getByLabelText('Upload Soil Report'),{target:{files:[new File(['%PDF-1.4'],'pending.pdf',{type:'application/pdf'})]}});
 expect(screen.getByRole('status').textContent).toContain('Reading your soil report');expect(screen.getByLabelText('Upload Soil Report').closest('fieldset').disabled).toBe(true);
 reject(new Error('The request timed out.'));await screen.findByRole('button',{name:'Try Again'});expect(screen.queryByText('Extracting available measurements')).toBeNull();expect(screen.getByText('pending.pdf')).toBeTruthy();
});
