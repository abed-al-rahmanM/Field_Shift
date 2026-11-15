export function canContinueSoil({ status, reviewed }) {
  return status === 'idle' || (status === 'ready' && reviewed);
}

export function mapSoilReport(report) {
  const notes = [...(report.warnings ?? [])];
  const context = [];
  const unit = (report.ecUnit ?? '').toLowerCase().replace(/\s/g, '');
  const compatibleEc = ['ds/m', 'ms/cm'].includes(unit);
  // Never label an unverified EC unit as dS/m. The original reading stays visible.
  if (report.ec != null && !compatibleEc) {
    notes.push('Salinity was not filled in because its unit is missing or incompatible. Enter a verified dS/m reading.');
    context.push({ label: 'Original salinity', value: `${report.ec} ${report.ecUnit || '(unit unknown)'}` });
  }
  if (report.missingMeasurements?.length) notes.push(`Not found in report: ${report.missingMeasurements.join(', ')}.`);
  const nutrients = {};
  for (const key of ['nitrogen', 'phosphorus', 'potassium']) {
    const item = report[key];
    nutrients[key] = item?.value ?? null;
    nutrients[`${key}Unit`] = item?.unit ?? '';
    context.push({
      label: `${key[0].toUpperCase()}${key.slice(1)}`,
      value: item?.value == null ? 'Not reported' : `${item.value} ${item.unit || '(unit unknown)'}${item.method ? ` · ${item.method}` : ''}`,
    });
  }
  for (const [key, label, suffix] of [
    ['sandPercent','Sand','%'], ['siltPercent','Silt','%'], ['clayPercent','Clay','%'],
    ['sampleDepth','Sample depth',''], ['sampleDate','Sample date',''],
    ['fieldCapacityPercent','Field capacity','%'], ['wiltingPointPercent','Wilting point','%'], ['measuredMoisturePercent','Moisture','%'],
  ]) if (report[key] != null) context.push({ label, value: `${report[key]}${suffix}` });
  return {
    soil: {
      ph: report.ph ?? null,
      phMethod: report.phMethod ?? '',
      ec: compatibleEc ? report.ec ?? null : null,
      ecMethod: report.ecMethod ?? '',
      organicMatter: report.organicMatter ?? null,
      texture: report.texture ?? '',
      nitrogenMethod: report.nitrogen?.method ?? '',
      phosphorusMethod: report.phosphorus?.method ?? '',
      potassiumMethod: report.potassium?.method ?? '',
    },
    nutrients,
    notes, context,
  };
}

