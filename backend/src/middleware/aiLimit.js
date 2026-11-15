import { serviceError } from '../services/gemini.js';
const calls=new Map();
export function aiLimit(req,res,next) {
  const key=req.ip, now=Date.now(), recent=(calls.get(key) ?? []).filter(time=>now-time<60000);
  if(recent.length>=8) return next(serviceError('AI_REQUEST_LIMIT','Please wait a minute before another AI request.',429,true));
  if(calls.size>1000) calls.clear();
  calls.set(key,[...recent,now]); next();
}

