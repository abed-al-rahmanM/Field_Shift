import '../backend/src/env.js';
import { runAnalysis } from '../backend/src/services/analysis.js';
import { askFarmer } from '../backend/src/services/farmerAssistant.js';
const analysis=await runAnalysis({mode:'demo'});
// Exercise Gemini against the synthetic test context, without fetching NASA or mislabelling observations.
const result=await askFarmer('Explain why the water score is missing.',{...analysis,mode:'live'},'synthetic_integration_test');
console.log(JSON.stringify(result,null,2));
