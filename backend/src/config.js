export const MODEL_VERSION = "field-shift-1.2-water-screening";

// Engineering weights; missing components are excluded and reported, never imputed.
export const CROP_WEIGHTS = Object.freeze({
  soil: 0.5,
  climate: 0.3,
  water: 0.2,
});

export const NASA_PARAMETERS = [
  "T2M",
  "T2M_MAX",
  "T2M_MIN",
  "PRECTOTCORR",
  "RH2M",
  "ALLSKY_SFC_SW_DWN", "WS2M", "PS",
];
