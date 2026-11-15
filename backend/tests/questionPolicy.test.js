import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyQuestion,scopeAnswer } from '../../shared/questionPolicy.js';
import { askFarmer } from '../src/services/farmerAssistant.js';
const analysis={mode:'live',topCrops:[],soil:{},rotationPlans:[]};
test('clear unrelated intents are answered without Gemini',async()=>{
 for(const question of ['Who won the football match yesterday?','Write me a Python program.']) {
  const result=await askFarmer(question,analysis,'server_analysis',{generate:()=>{throw Error('Unexpected model call');}});
  assert.equal(result.category,'UNRELATED');assert.equal(result.source,'rule_based');assert.equal(result.status,'success');
 }
});
test('agriculture is allowed, including mixed technical wording and unfamiliar phrasing',()=>{
 for(const q of ['Why is my soil acidic?','How can I reduce water usage?','Write Python to analyze farm rainfall','How should I manage my orchard?'])assert.notEqual(classifyQuestion(q),'UNRELATED');
 assert.equal(classifyQuestion('What does 93/100 mean?'),'RESULT_EXPLANATION');
});
test('ambiguous follow-ups use previous farm context or ask for clarification',()=>{
 assert.equal(classifyQuestion('Why?'),'UNCLEAR');assert.equal(classifyQuestion('Is it safe?','Why are potatoes recommended?'),'RESULT_EXPLANATION');
 assert.equal(scopeAnswer('What is this?').category,'UNCLEAR');
});
test('methodology answers work without credentials in live and demo modes',async()=>{
 for(const mode of ['live','demo'])for(const q of ['What does pH mean?','What is crop rotation?','What is NASA POWER?','Why is water not scored?','What does 93/100 mean?']) {
  const answer=await askFarmer(q,{...analysis,mode},'server_analysis',{apiKey:''});assert.equal(answer.status,'success');assert.notEqual(answer.source,'gemini');assert.ok(answer.answer.split(/\s+/).length<=120);
 }
});
