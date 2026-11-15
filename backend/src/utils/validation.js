import { z } from 'zod';

const nullableNumber = (min, max) => z.number().min(min).max(max).nullable().optional();
export const analysisSchema = z.object({
  mode: z.enum(['live', 'demo']).default('live'),
  farm: z.object({
    name: z.string().trim().min(1).max(80), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
    size: nullableNumber(0, 100000), sizeUnit: z.enum(['ha', 'acre']).default('ha'), plantingMonth: z.number().int().min(1).max(12),
    plantingYear: z.number().int().min(1981).max(2100), previousCrop: z.string().nullable().optional(), cropHistory: z.array(z.string()).max(6).default([]),
  }),
  soil: z.object({
    ph: nullableNumber(0, 14), phMethod: z.string().max(80).optional().default(''), ec: nullableNumber(0, 100), ecMethod: z.string().max(80).optional().default(''), organicMatter: nullableNumber(0, 100),
    nitrogen: nullableNumber(0, 100000), nitrogenUnit: z.string().max(30).optional().default(''), nitrogenMethod: z.string().max(80).optional().default(''),
    phosphorus: nullableNumber(0, 100000), phosphorusUnit: z.string().max(30).optional().default(''), phosphorusMethod: z.string().max(80).optional().default(''),
    potassium: nullableNumber(0, 100000), potassiumUnit: z.string().max(30).optional().default(''), potassiumMethod: z.string().max(80).optional().default(''), texture: z.string().max(50).optional().default(''),
    sandPercent: nullableNumber(0, 100), siltPercent: nullableNumber(0, 100), clayPercent: nullableNumber(0, 100), sampleDepthCm: nullableNumber(0, 500), sampleDate: z.string().max(20).optional().default(''),
    fieldCapacityPercent: nullableNumber(0, 100), wiltingPointPercent: nullableNumber(0, 100), measuredMoisturePercent: nullableNumber(0, 100),
  }).default({}),
  priorities: z.object({ irrigation: z.enum(['rain-fed', 'limited', 'irrigated', 'unknown']).default('unknown'), seasonalLimitMm: nullableNumber(0, 5000), irrigationVolumeM3: nullableNumber(0, 1000000000), areaM2: nullableNumber(0.01, 1000000000), slope: z.enum(['gentle', 'steep', 'unknown']).default('unknown'), category: z.enum(['any', 'vegetable', 'grain', 'legume', 'root']).default('any') }).default({}),
});

export function parseOrThrow(schema, value) {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  const error = new Error('Please review the highlighted farm information.');
  error.status = 400; error.details = parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }));
  throw error;
}
