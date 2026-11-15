import '../backend/src/env.js';
import { GoogleGenAI } from '@google/genai';
import { geminiError } from '../backend/src/services/gemini.js';
try {
  const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
  const pages=await ai.models.list({config:{pageSize:100}});
  const models=[];
  for await(const model of pages) models.push({name:model.name,actions:model.supportedActions});
  console.log(JSON.stringify({configuredModel:process.env.GEMINI_MODEL,models},null,2));
} catch(error) {const safe=geminiError(error);console.log(JSON.stringify({code:safe.code,status:error.status,message:safe.message}));process.exitCode=1;}

