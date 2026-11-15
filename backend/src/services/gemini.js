import { createHash } from 'node:crypto';
const quotaCooldowns = new Map();
import { GoogleGenAI } from "@google/genai";

export function serviceError(code, message, status = 503, retryable = false) {
  return Object.assign(new Error(message), {
    code,
    status,
    retryable,
    expose: true,
  });
}
export function geminiError(error) {
  if (error?.code?.startsWith("GEMINI_")) return error;
  const status = Number(error?.status ?? error?.code);
  const text = String(error?.message ?? "").toLowerCase(); // classify only; never log provider text
  if (
    status === 401 ||
    status === 403 ||
    /api.?key|permission.denied|unauthenticated/.test(text)
  )
    return serviceError(
      "GEMINI_AUTH_ERROR",
      "The AI service credentials were rejected. Enter soil values manually or contact the project owner.",
    );
  if (status === 429 || /quota|resource.exhausted/.test(text)) {
    let body; try { body=JSON.parse(error.message); } catch { body=error; }
    const details=body?.error?.details ?? body?.details ?? [];
    const daily=details.some(d=>(d.violations ?? []).some(v=>/PerDay/i.test(v.quotaId ?? '')));
    const delay=details.find(d=>d.retryDelay)?.retryDelay;
    const seconds=typeof delay==='string' && /^\d+(\.\d+)?s$/.test(delay)?Math.ceil(parseFloat(delay)):60;
    return Object.assign(serviceError('GEMINI_RATE_LIMITED',daily
      ? 'The Gemini daily request quota is exhausted. Repeated uploads cannot restore it. Wait for the quota reset or enter soil values manually.'
      : 'Gemini is rate limited. Wait before retrying, or enter soil values manually.',429,true),{retryAfterSeconds:Math.max(1,Math.min(seconds,86400)),quotaScope:daily?'daily':'rate'});
  }
  if (status === 404 || /model.*not found|model.*not supported/.test(text))
    return serviceError(
      "GEMINI_MODEL_UNAVAILABLE",
      "The configured AI model is unavailable. Manual entry still works.",
    );
  if (error?.name === "AbortError" || /timeout|timed out|aborted/.test(text))
    return serviceError(
      "GEMINI_TIMEOUT",
      "AI took too long to respond. Try again or enter values manually.",
      504,
      true,
    );
  if (status === 400)
    return serviceError(
      "GEMINI_REQUEST_REJECTED",
      "The AI service could not process this request. Try a clearer report or enter values manually.",
      422,
    );
  return serviceError(
    "GEMINI_UNAVAILABLE",
    "AI is temporarily unavailable. Try again or enter values manually.",
    503,
    true,
  );
}
export function jsonSchemaFor(schema) {
  // Gemini receives only supported JSON-schema fields; Zod still enforces local bounds.
  const clean = (value) =>
    Array.isArray(value)
      ? value.map(clean)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .filter(
                ([key]) =>
                  !["$schema", "default", "maxLength", "minLength"].includes(
                    key,
                  ),
              )
              .map(([k, v]) => [k, clean(v)]),
          )
        : value;
  return clean(schema);
}
export async function generateJson(
  {
    operation,
    contents,
    systemInstruction,
    schema,
    jsonSchema,
    maxOutputTokens = 1800,
  },
  deps = {},
) {
  const apiKey = deps.apiKey ?? process.env.GEMINI_API_KEY;
  const model = deps.model ?? process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
  const fallbackModel = deps.fallbackModel ?? "gemini-3.5-flash";
  let activeModel = model;
  const log = deps.logger ?? ((entry) => console.info(JSON.stringify(entry)));
  if (!apiKey?.trim()) {
    log({
      service: "gemini",
      operation,
      model: activeModel,
      invoked: false,
      outcome: "missing_key",
    });
    throw serviceError(
      "GEMINI_NOT_CONFIGURED",
      "AI is not configured on the server. Enter soil values manually.",
    );
  }
  const cooldowns=deps.cooldowns ?? (deps.generate ? new Map() : quotaCooldowns);
  const cooldownKey=createHash('sha256').update(apiKey).update(model).digest('hex');
  const blocked=cooldowns.get(cooldownKey);
  if(blocked && blocked.until>Date.now()) throw Object.assign(serviceError('GEMINI_RATE_LIMITED',blocked.message,429,true),{retryAfterSeconds:Math.ceil((blocked.until-Date.now())/1000),quotaScope:blocked.quotaScope});
  cooldowns.delete(cooldownKey);
  const controller = new AbortController();
  const startedAt = Date.now();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => {
        controller.abort();
        reject(
          serviceError(
            "GEMINI_TIMEOUT",
            "AI took too long to respond. Please try again.",
            504,
            true,
          ),
        );
      },
      deps.timeoutMs ?? (operation === "soil_extraction" ? 60000 : 30000),
    );
  });
  log({
    service: "gemini",
    operation,
    model: activeModel,
    invoked: true,
    outcome: "started",
  });
  try {
    const generate =
      deps.generate ??
      ((args) => new GoogleGenAI({ apiKey }).models.generateContent(args));
    const request = (requestedModel) =>
      generate({
        model: requestedModel,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          maxOutputTokens,
          temperature: 0.1,
          ...(/^(models\/)?gemini-3/.test(requestedModel)
            ? { thinkingConfig: { thinkingLevel: "LOW" } }
            : {}),
          abortSignal: controller.signal,
        },
      });
    let response;
    try {
      response = await Promise.race([request(activeModel), timeout]);
    } catch (error) {
      const safe = geminiError(error);
      const providerStatus=Number(error?.status ?? error?.code);
      const transient=operation==='soil_extraction' && [502,503,504].includes(providerStatus);
      log({service:'gemini',operation,model:activeModel,outcome:'request_failed',code:safe.code,providerStatus:Number.isFinite(providerStatus)?providerStatus:undefined});
      if(transient && !controller.signal.aborted) {
        // One bounded retry only for upstream outages. Never retry quota/auth failures.
        log({service:'gemini',operation,model:activeModel,outcome:'retry',attempt:2});
        await Promise.race([new Promise(resolve=>setTimeout(resolve,deps.retryDelayMs ?? 1000)),timeout]);
        response=await Promise.race([request(activeModel),timeout]);
      } else {
      if (
        safe.code !== "GEMINI_MODEL_UNAVAILABLE" ||
        activeModel === fallbackModel
      )
        throw safe;
      activeModel = fallbackModel;
      log({
        service: "gemini",
        operation,
        model: activeModel,
        outcome: "fallback_model",
      });
      response = await Promise.race([request(activeModel), timeout]);
      }
    }
    let raw;
    try {
      raw = JSON.parse(response.text);
    } catch {
      throw serviceError(
        "GEMINI_INVALID_JSON",
        "AI returned an unreadable response. Try again or enter values manually.",
        502,
        true,
      );
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      log({
        service: "gemini",
        operation,
        model: activeModel,
        outcome: "validation_failed",
        fields: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
        })),
      });
      throw serviceError(
        "GEMINI_VALIDATION_FAILED",
        "Some AI readings could not be validated. Try again or enter values manually.",
        502,
        true,
      );
    }
    log({ service: "gemini", operation, model: activeModel, outcome: "success" });
    return { data: parsed.data, model: activeModel };
  } catch (error) {
    const safe = geminiError(error);
    if(safe.code==='GEMINI_RATE_LIMITED') {
      if(cooldowns.size>=100) cooldowns.clear();
      cooldowns.set(cooldownKey,{until:Date.now()+(safe.retryAfterSeconds ?? 60)*1000,message:safe.message,quotaScope:safe.quotaScope});
    }
    log({
      service: "gemini",
      operation,
      model: activeModel,
      outcome: "failed",
      code: safe.code,
      elapsedMs:Date.now()-startedAt,
    });
    throw safe;
  } finally {
    clearTimeout(timer);
  }
}
