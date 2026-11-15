import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { extractSoil } from '../src/services/soilExtractor.js';
import { geminiError, generateJson } from '../src/services/gemini.js';
import { createSoilRouter } from '../src/routes/soilRoutes.js';
import { errorHandler } from '../src/middleware/errors.js';
import { z } from 'zod';
const sample={ph:5.6,ec:3,ecUnit:'dS/m',ecMethod:'ECe',organicMatter:2,nitrogen:{value:18,unit:'mg/kg',method:'nitrate-N'},phosphorus:{value:20,unit:'mg/kg',method:null},potassium:{value:120,unit:'mg/kg',method:null},texture:'Sandy loam'};
const file={mimetype:'application/pdf',buffer:Buffer.from('%PDF-1.4 test fixture')};
const deps={apiKey:'test-key',logger:()=>{},generate:async()=>({text:JSON.stringify(sample)})};
test('Gemini extraction uses actual bytes, structured output and validated sample values',async()=>{
 let args;const result=await extractSoil(file,{...deps,generate:async input=>{args=input;return {text:JSON.stringify(sample)};}});
 assert.equal(args.contents[0].parts[1].inlineData.mimeType,'application/pdf');
 assert.equal(args.contents[0].parts[1].inlineData.data,file.buffer.toString('base64'));
 assert.ok(args.config.responseJsonSchema);assert.equal(result.ph,5.6);assert.equal(result.ec,3);assert.equal(result.organicMatter,2);assert.equal(result.nitrogen.value,18);assert.equal(result.phosphorus.value,20);assert.equal(result.potassium.value,120);
 assert.equal(result.phosphorus.method,null);assert.equal(result.phMethod,null);assert.equal(result.extraction.source,'gemini');
});
test('missing optional fields become unknown instead of causing extraction failure',async()=>{const result=await extractSoil(file,{...deps,generate:async()=>({text:'{"ph":5.6}'})});assert.equal(result.ec,null);assert.equal(result.potassium.value,null);});
test('missing key does not call Gemini',async()=>{let called=false;await assert.rejects(()=>extractSoil(file,{...deps,apiKey:'',generate:async()=>{called=true;}}),e=>e.code==='GEMINI_NOT_CONFIGURED');assert.equal(called,false);});
for(const [status,code] of [[401,'GEMINI_AUTH_ERROR'],[403,'GEMINI_AUTH_ERROR'],[429,'GEMINI_RATE_LIMITED'],[404,'GEMINI_MODEL_UNAVAILABLE'],[500,'GEMINI_UNAVAILABLE']])test('Gemini status '+status+' is diagnosed safely',async()=>{await assert.rejects(()=>extractSoil(file,{...deps,generate:async()=>{throw {status,message:'provider failure'};}}),e=>e.code===code && !e.message.includes('test-key'));});
test('invalid JSON and invalid measurements have distinct errors',async()=>{await assert.rejects(()=>extractSoil(file,{...deps,generate:async()=>({text:'bad json'})}),e=>e.code==='GEMINI_INVALID_JSON');await assert.rejects(()=>extractSoil(file,{...deps,generate:async()=>({text:'{"ph":99}'})}),e=>e.code==='GEMINI_VALIDATION_FAILED');});
test('timeout is bounded and does not retry',async()=>{let calls=0;await assert.rejects(()=>extractSoil(file,{...deps,timeoutMs:5,generate:()=>{calls++;return new Promise(()=>{});}}),e=>e.code==='GEMINI_TIMEOUT');assert.equal(calls,1);});
test('temporary provider outage retries once and recovers',async()=>{
 let calls=0;const result=await extractSoil(file,{...deps,retryDelayMs:1,generate:async()=>{if(++calls===1)throw {status:503};return {text:JSON.stringify(sample)};}});
 assert.equal(calls,2);assert.equal(result.ph,5.6);
});
test('persistent outage stops after two attempts and quota is never retried',async()=>{
 for(const status of [503,429]){let calls=0;await assert.rejects(()=>extractSoil(file,{...deps,retryDelayMs:1,generate:async()=>{calls++;throw {status};}}));assert.equal(calls,status===503?2:1);}
});
test('real multipart routes accept PDF/JPG/PNG, reject invalid uploads and clear memory',async()=>{
 const app=express();let captured;
 app.use('/api',createSoilRouter(async report=>{captured=report.buffer;return {ph:5.6};}));app.use(errorHandler);
 const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 async function upload(bytes,type){const form=new FormData();form.append('report',new Blob([bytes],{type}),'report');return fetch(base+'/api/soil/extract',{method:'POST',body:form});}
 try {
  for(const [bytes,type]of [[Buffer.from('%PDF-1.4'),'application/pdf'],[Buffer.from([255,216,255,0]),'image/jpeg'],[Buffer.from([137,80,78,71,13,10,26,10]),'image/png']]){const r=await upload(bytes,type);assert.equal(r.status,200);assert.equal((await r.json()).ph,5.6);assert.ok(captured.every(byte=>byte===0));}
  assert.equal((await upload('text','text/plain')).status,415);
  assert.equal((await upload('not a pdf','application/pdf')).status,415);
  assert.equal((await upload(Buffer.alloc(5*1024*1024+1),'application/pdf')).status,413);
 } finally{await new Promise(resolve=>server.close(resolve));}
});


test('daily quota preserves provider retry delay and blocks further paid requests',async()=>{
 const cooldowns=new Map();let calls=0;
 const quota={status:429,message:JSON.stringify({error:{details:[{violations:[{quotaId:'GenerateRequestsPerDayPerProjectPerModel-FreeTier',quotaValue:'20'}]},{retryDelay:'13714s'}]}})};
 const settings={...deps,cooldowns,generate:async()=>{calls++;throw quota;}};
 await assert.rejects(()=>extractSoil(file,settings),e=>e.code==='GEMINI_RATE_LIMITED'&&e.quotaScope==='daily'&&e.retryAfterSeconds===13714&&/daily/.test(e.message));
 await assert.rejects(()=>extractSoil(file,settings),e=>e.code==='GEMINI_RATE_LIMITED'&&e.retryAfterSeconds>13700);
 assert.equal(calls,1);
});
test('expired quota cooldown permits a request again',async()=>{
 const cooldowns=new Map();let calls=0;
 const settings={...deps,cooldowns,generate:async()=>{calls++;if(calls===1)throw {status:429};return {text:JSON.stringify(sample)};}};
 await assert.rejects(()=>extractSoil(file,settings));
 for(const v of cooldowns.values())v.until=Date.now()-1;
 assert.equal((await extractSoil(file,settings)).ph,5.6);assert.equal(calls,2);
});
