import { z } from 'zod';
import { analysisSchema } from '../utils/validation.js';
import { readJson } from '../utils/data.js';
import { rankCrops } from './cropScoring.js';
import { generateRotations } from './rotationEngine.js';
import { serviceError } from './gemini.js';
const cache=new Map();
export function rememberAnalysis(analysis) {
  if(cache.size>=100) cache.delete(cache.keys().next().value);
  cache.set(analysis.analysisId,{analysis,savedAt:Date.now()}); return analysis;
}
const metric=(min,max)=>z.number().min(min).max(max).nullable();
const snapshotSchema=z.object({
  analysisId:z.string().uuid(),mode:z.enum(['live','demo']),farm:analysisSchema.shape.farm,soil:analysisSchema.shape.soil,priorities:analysisSchema.shape.priorities,
  climate:z.object({
    period:z.object({start:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),end:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}),
    summary:z.object({averageTemperatureC:metric(-100,70),minimumTemperatureC:metric(-100,70),maximumTemperatureC:metric(-100,70),totalRainfallMm:metric(0,100000),averageHumidityPct:metric(0,100)}),
    daily:z.array(z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),temperatureC:metric(-100,70).optional(),minC:metric(-100,70).optional(),maxC:metric(-100,70).optional(),rainfallMm:metric(0,3000).optional(),humidityPct:metric(0,100).optional(),solarRadiationMJ:metric(0,100).optional(),wind2mMs:metric(0,150).optional(),pressureKpa:metric(1,120).optional()})).max(367).optional(),
    provenance:z.object({requestedCoordinates:z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)}),returnedCoordinates:z.array(z.number()).max(3).nullable().optional()}).optional(),
    periodType:z.string().max(60).optional(),dataStatus:z.string().max(60).optional(),
  }),
});
export const askSchema=z.object({analysisId:z.string().uuid(),question:z.string().trim().min(1).max(500),previousQuestion:z.string().trim().max(500).optional(),snapshot:z.unknown().optional()});
export async function resolveAnalysis({analysisId,snapshot}) {
  const cached=cache.get(analysisId);
  if(cached && Date.now()-cached.savedAt<2*60*60*1000) return {analysis:cached.analysis,trust:'server_analysis'};
  const parsed=snapshotSchema.safeParse(snapshot);
  if(!parsed.success || parsed.data.analysisId!==analysisId) throw serviceError('ANALYSIS_REQUIRED','Open a valid analysis or run a new analysis first.',400);
  const data=parsed.data;
  let trust='validated_client_snapshot';
  if(data.mode==='demo') {
    const demo=await readJson('demoScenario.json');
    Object.assign(data,{farm:demo.farm,soil:demo.soil,priorities:demo.priorities,climate:demo.climate});
    trust='server_demo';
  }
  const crops=await readJson('crops.json');
  const ranked=rankCrops(crops,data,data.climate);
  // Never trust client crop scores, rankings, source URLs or rotation text.
  return {trust,analysis:{...data,topCrops:ranked.slice(0,3),rotationPlans:generateRotations(ranked,data.farm.previousCrop),sources:crops.flatMap(c=>c.dataSources.map(s=>({url:s.url,label:s.organization}))),warnings:[trust==='validated_client_snapshot'?'Recomputed from browser-supplied soil and historical climate; NASA was not re-fetched.':'Synthetic demo context.']}};
}
export function compactContext(analysis,trust) {
  return {contextTrust:trust,mode:analysis.mode,farm:analysis.farm,soil:analysis.soil,climate:{source:analysis.climate.source,period:analysis.climate.period,periodType:analysis.climate.periodType,summary:analysis.climate.summary},crops:analysis.topCrops.map(c=>({id:c.crop.id,name:c.crop.name,score:c.score,components:{...c.components,water:Object.fromEntries(Object.entries(c.components.water).filter(([key])=>!['daily','et0','monthlyRainfall'].includes(key)))},limitations:c.warnings})),rotationPlans:analysis.rotationPlans,sources:analysis.sources,warnings:analysis.warnings};
}

