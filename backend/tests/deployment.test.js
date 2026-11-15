import test from 'node:test';
import assert from 'node:assert/strict';
import app, { app as namedApp } from '../src/app.js';

test('deployment entry exports Express and serves API routes without external services', async()=>{
  assert.equal(app,namedApp);
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  try {
    const health=await fetch(url+'/api/health');
    assert.equal(health.status,200);assert.match(health.headers.get('content-type'),/application\/json/);
    const status=await health.json();assert.equal(status.status,'ok');assert.equal(status.service,'FIELD SHIFT API');assert.equal(typeof status.geminiConfigured,'boolean');
    assert.deepEqual(Object.keys(status).sort(),['geminiConfigured','service','status']);
    const crops=await fetch(url+'/api/crops');assert.equal(crops.status,200);assert.equal((await crops.json()).length,5);
    const demo=await fetch(url+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'demo',farm:{name:'Deployment smoke test',latitude:34,longitude:36,plantingMonth:3,plantingYear:2027},soil:{},priorities:{}})});
    assert.equal(demo.status,200);const result=await demo.json();assert.equal(result.mode,'demo');assert.ok(result.topCrops.length>0);
    const invalid=await fetch(url+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(invalid.status,400);
    assert.equal((await fetch(url+'/api/not-a-route')).status,404);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
