import test from 'node:test';
import assert from 'node:assert/strict';
import { runAnalysis } from '../src/services/analysis.js';
import { askFarmer, validateGroundedText } from '../src/services/farmerAssistant.js';
import { resolveAnalysis, askSchema } from '../src/services/analysisContext.js';
import { explain } from '../src/services/aiExplainer.js';
const request={mode:'demo',farm:{name:'Demo',latitude:34.5,longitude:36,plantingMonth:3,plantingYear:2027},soil:{},priorities:{}};
test('all suggested questions work without Gemini and match demo context',async()=>{
 const analysis=await runAnalysis(request);
 for(const q of ['Why is this crop recommended?','Which crop needs less water?','How can I improve my soil?','What should I plant next season?']){
  const r=await askFarmer(q,analysis,'server_demo',{generate:()=>{throw Error('Should not call Gemini');}});
  assert.equal(r.source,'demo_rules');assert.ok(r.answer.split(/\s+/).length<=120);
 }
 assert.match((await askFarmer('Which crop needs less water?',analysis)).answer,/unavailable/);
});
test('custom question calls Gemini once with context, missing key and quota are explicit',async()=>{
 const analysis={...await runAnalysis(request),mode:'live'};let calls=0;
 const r=await askFarmer('What does my pH mean?',analysis,'server_analysis',{apiKey:'test',logger:()=>{},generate:async args=>{calls++;assert.match(args.contents,/soil/);return {text:'{"answer":"Review your soil pH against the recommended crops and local conditions."}'};}});
 assert.equal(calls,1);assert.equal(r.source,'gemini');
 await assert.rejects(()=>askFarmer('Custom question',analysis,'server_analysis',{apiKey:'',logger:()=>{}}),e=>e.code==='GEMINI_NOT_CONFIGURED');
 await assert.rejects(()=>askFarmer('Custom question',analysis,'server_analysis',{apiKey:'test',logger:()=>{},generate:async()=>{throw {status:429};}}),e=>e.code==='GEMINI_RATE_LIMITED');
});
test('numeric claims and oversized answers are rejected',async()=>{
 assert.throws(()=>validateGroundedText('Apply 99999 kg of fertilizer',{ph:5.6}),/unsupported/);
 const analysis={...await runAnalysis(request),mode:'live'};
 await assert.rejects(()=>askFarmer('Explain my soil',analysis,'server_analysis',{apiKey:'test',logger:()=>{},generate:async()=>({text:JSON.stringify({answer:'word '.repeat(121)})})}),e=>e.code==='GEMINI_VALIDATION_FAILED');
});
test('request validation and missing analysis are rejected',async()=>{assert.equal(askSchema.safeParse({analysisId:'fake',question:'x'}).success,false);await assert.rejects(()=>resolveAnalysis({analysisId:crypto.randomUUID()}),e=>e.code==='ANALYSIS_REQUIRED');});
test('server analysis wins over tampered client ranking',async()=>{const analysis=await runAnalysis(request);const resolved=await resolveAnalysis({analysisId:analysis.analysisId,snapshot:{topCrops:[{score:999}]}});assert.equal(resolved.trust,'server_analysis');assert.deepEqual(resolved.analysis.topCrops,analysis.topCrops);});
test('Gemini cannot reorder crop explanations',async()=>{const analysis={...await runAnalysis(request),mode:'live'};const result=await explain(analysis,{apiKey:'test',logger:()=>{},generate:async()=>({text:JSON.stringify({summary:'Example',crops:analysis.topCrops.slice().reverse().map(c=>({id:c.crop.id,reason:'Example.',pros:[],cons:[]}))})})});assert.equal(result.source,'deterministic-template');});

