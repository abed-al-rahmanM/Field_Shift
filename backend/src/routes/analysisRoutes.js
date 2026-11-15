import { Router } from "express";
import { analysisSchema, parseOrThrow } from "../utils/validation.js";
import { runAnalysis } from "../services/analysis.js";
import { explain } from "../services/aiExplainer.js";
import { askSchema, resolveAnalysis } from "../services/analysisContext.js";
import { askFarmer } from "../services/farmerAssistant.js";
import { aiLimit } from "../middleware/aiLimit.js";

export const analysisRouter = Router();
analysisRouter.post("/analyze", async (req, res, next) => {
  try {
    res.json(await runAnalysis(parseOrThrow(analysisSchema, req.body)));
  } catch (e) {
    next(e);
  }
});
analysisRouter.post("/explain", aiLimit, async (req, res, next) => {
  try {
    const request = parseOrThrow(askSchema.omit({ question: true }), req.body);
    const { analysis, trust } = await resolveAnalysis(request);
    res.json(await explain(analysis, { trust }));
  } catch (e) {
    next(e);
  }
});
analysisRouter.post("/ai/ask", aiLimit, async (req, res, next) => {
  try {
    const request = parseOrThrow(askSchema, req.body);
    const { analysis, trust } = await resolveAnalysis(request);
    res.json(await askFarmer(request.question, analysis, trust, {previousQuestion:request.previousQuestion}));
  } catch (e) {
    next(e);
  }
});
