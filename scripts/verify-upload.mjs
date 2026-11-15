import { readFile } from 'node:fs/promises';
import { mapSoilReport, canContinueSoil } from '../frontend/src/utils/soilReview.js';
const endpoint=process.env.VERIFY_URL || 'http://localhost:5173';
const health=await fetch(endpoint+'/api/health').then(r=>r.json());
console.log(JSON.stringify({stage:'health',geminiConfigured:health.geminiConfigured}));
const bytes=await readFile(process.argv[2]);
const type=/\.png$/i.test(process.argv[2])?'image/png':/\.jpe?g$/i.test(process.argv[2])?'image/jpeg':'application/pdf';
const form=new FormData();
form.append('report',new Blob([bytes],{type}),process.argv[2].split(/[\\/]/).at(-1));
const response=await fetch(endpoint+'/api/soil/extract',{method:'POST',body:form});
const report=await response.json();
if(!response.ok) {
  console.log(JSON.stringify({stage:'upload',status:response.status,code:report.code,message:report.message}));
  process.exitCode=1;
} else {
  const mapped=mapSoilReport(report);
  console.log(JSON.stringify({stage:'upload',status:response.status,extraction:report.extraction,ph:report.ph,ec:report.ec,ecUnit:report.ecUnit,organicMatter:report.organicMatter,nitrogen:report.nitrogen,phosphorus:report.phosphorus,potassium:report.potassium,texture:report.texture,warnings:report.warnings,formValues:mapped.soil,blockedBeforeReview:!canContinueSoil({status:'ready',reviewed:false}),enabledAfterReview:canContinueSoil({status:'ready',reviewed:true})},null,2));
}

