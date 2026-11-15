const farmTerms =
  /\b(farm|soil|crop|irrigat\w*|rotat\w*|climate|weather|rain\w*|water|ph|acid\w*|alkalin\w*|salin\w*|potato\w*|tomato\w*|plant\w*|harvest|fertili\w*|nasa|power|pest\w*|seed\w*|agricultur\w*)\b/i;
const resultTerms =
  /\b(score|rank\w*|recommend\w*|analysis|results?|chart|limited data)\b|\d+\s*\/\s*100/i;
export function classifyQuestion(question, previousQuestion = "") {
  const q = question.trim();
  if (farmTerms.test(q)) return "FARM_RELATED";
  if (resultTerms.test(q)) return "RESULT_EXPLANATION";
  // Reject only clear off-topic intents. Unknown wording is allowed through.
  if (
    /\b(football|soccer|basketball|celebrity|movie|bitcoin|horoscope)\b|\b(write|code|build)\b.*\b(python|javascript|program|website)\b/i.test(
      q,
    )
  )
    return "UNRELATED";
  if (
    /^(why|what (is this|does this mean)|is (it|this) safe|explain( this)?)[?!.\s]*$/i.test(
      q,
    )
  )
    return previousQuestion &&
      (farmTerms.test(previousQuestion) || resultTerms.test(previousQuestion))
      ? "RESULT_EXPLANATION"
      : "UNCLEAR";
  return "FARM_RELATED";
}
export function scopeAnswer(question, previousQuestion = "") {
  const category = classifyQuestion(question, previousQuestion);
  if (category === "UNRELATED")
    return {
      status: "success",
      category,
      source: "rule_based",
      answer: /program|python|javascript/i.test(question)
        ? "I help explain your farm analysis. Ask me about soil, climate, irrigation, or crop rotations."
        : "I'm here to help with your farm, soil, and crop recommendations. Try asking about your land or crops.",
    };
  if (category === "UNCLEAR")
    return {
      status: "success",
      category,
      source: "rule_based",
      answer:
        "Are you asking about the crop score, soil results, or climate data?",
    };
  return null;
}
export function methodologyAnswer(question) {
  const q = question.trim().toLowerCase().replace(/[?!.]/g, "");
  if (/^what (does ph mean|is (soil )?ph)$/.test(q))
    return "pH describes how acidic or alkaline your soil is. FIELD SHIFT compares your reported pH with the supported crop ranges. It does not identify the cause of acidity or calculate an amendment dose. Check the laboratory method and discuss treatment with a local agronomist.";
  if (q === "what is crop rotation")
    return "Crop rotation means growing different crops in sequence on the same land. FIELD SHIFT compares example sequences using crop suitability and plant-family transitions. These plans do not simulate future soil conditions or guarantee pest control. Confirm local planting dates and disease risks before choosing a sequence.";
  if (q === "what is nasa power")
    return "NASA POWER provides gridded environmental data. FIELD SHIFT uses historical temperature, rainfall and humidity for your location and analysis period. These are regional estimates rather than measurements from a sensor on your farm, and historical observations are not a forecast.";
  if (/why (is water not scored|is the water score missing)/.test(q))
    return "Water is not scored when required inputs are missing. Check crop details for missing daily weather, effective-rainfall applicability or irrigation amount. A missing score does not mean no water is needed. The remaining available components are rescaled, so the result has limited data.";
  if (/^what does \d+(\/100)? mean$/.test(q))
    return "A suitability score summarizes the available soil, climate and water comparisons. It is an engineering indicator, not a probability of success or a yield prediction. Missing components are excluded and the remaining weights are rescaled. Check the crop details to see which measurements contributed.";
  return null;
}
