import '../backend/src/env.js';
import { readFile } from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';
import { extractSoil } from '../backend/src/services/soilExtractor.js';
const buffer=await readFile(process.argv[2]);
const mimetype=/\.png$/i.test(process.argv[2])?'image/png':/\.jpe?g$/i.test(process.argv[2])?'image/jpeg':'application/pdf';
const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
try {
  const result=await extractSoil({buffer,mimetype}, {generate:async args=>{
    try {return await ai.models.generateContent(args);}
    catch(error) {
      // Inspect only provider status/message; never serialize SDK objects or document bytes.
      const safe=String(error.message).replaceAll(process.env.GEMINI_API_KEY,'[credential]').replace(/[A-Za-z0-9+/=_-]{80,}/g,'[redacted]').slice(0,1200);
      console.log(JSON.stringify({providerStatus:error.status,providerMessage:safe}));
      throw error;
    }
  }});
  console.log(JSON.stringify({extraction:result.extraction,ph:result.ph,ec:result.ec,organicMatter:result.organicMatter,nitrogen:result.nitrogen,phosphorus:result.phosphorus,potassium:result.potassium,texture:result.texture}));
} catch(error) {console.log(JSON.stringify({code:error.code}));process.exitCode=1;}
finally {buffer.fill(0);}
