import { z } from "zod";
import { generateJson, jsonSchemaFor } from "./gemini.js";
import { AI_RULES, validateGroundedText } from "./farmerAssistant.js";
import { compactContext } from "./analysisContext.js";
const explanationSchema = z.object({
  summary: z.string().max(220),
  crops: z
    .array(
      z.object({
        id: z.string(),
        reason: z.string().max(180),
        pros: z.array(z.string().max(120)).max(3),
        cons: z.array(z.string().max(120)).max(3),
      }),
    )
    .max(3),
  riskNote: z.string().max(180).optional(),
});
export function templateExplanation(results) {
  return {
    summary: results.topCrops.length
      ? (results.topCrops.some(c=>c.components.water.score==null) ? 'These options fit the available information; missing water data limits the comparison.' : 'These options use soil, climate and seasonal water coverage. Review water shortfalls and reference-stage assumptions.')
      : "There is not enough information to rank a crop.",
    crops: results.topCrops.map((item) => ({
      id: item.crop.id,
      reason: item.reason,
      pros: [],
      cons: item.warnings.slice(0, 3),
    })),
    source: "deterministic-template",
  };
}
export async function explain(results, deps = {}) {
  if (
    results.mode === "demo" ||
    !(deps.apiKey ?? process.env.GEMINI_API_KEY)?.trim()
  )
    return {
      ...templateExplanation(results),
      warning:
        results.mode === "demo"
          ? "Demo uses rule-based explanations."
          : "AI is not configured; rule-based explanations are shown.",
    };
  try {
    const context = compactContext(results, deps.trust ?? "server_analysis");
    const { data, model } = await generateJson(
      {
        operation: "crop_explanation",
        contents: JSON.stringify(context),
        systemInstruction:
          AI_RULES +
          " Return exactly the supplied crop IDs in the same order. One short sentence per crop reason, up to three pros and three cons, one short risk note.",
        schema: explanationSchema,
        jsonSchema: jsonSchemaFor(z.toJSONSchema(explanationSchema)),
        maxOutputTokens: 1400,
      },
      deps,
    );
    if (
      data.crops.map((c) => c.id).join(",") !==
      results.topCrops.map((c) => c.crop.id).join(",")
    )
      throw new Error("Changed crop IDs or ranking.");
    validateGroundedText(JSON.stringify(data), context);
    return { ...data, source: "gemini", model };
  } catch (error) {
    console.info(
      JSON.stringify({
        service: "gemini",
        operation: "crop_explanation",
        outcome: "fallback",
        code: error.code ?? "GEMINI_INVALID_EXPLANATION",
      }),
    );
    return {
      ...templateExplanation(results),
      warning:
        "AI explanation is unavailable; calculated explanations are shown.",
      code: error.code,
    };
  }
}
