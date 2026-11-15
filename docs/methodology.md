# FIELD SHIFT methodology 1.2

FIELD SHIFT is a prototype decision-support tool. Its scores are transparent engineering indicators, not probabilities of successful growth, yield forecasts, or agronomic prescriptions.

## Implemented

For a verified crop range `(Lmin, Lopt, Uopt, Umax)`, the range-membership score is 0 at and outside the tolerance bounds, rises linearly to 100, remains 100 through the optimal range, and falls linearly to 0. The same function is used for supported pH and mean-temperature comparisons.

Every structured scoring function returns a value, status, formula identifier, required inputs, assumptions, provenance and warnings. `trapezoidal-range-v1` refuses missing or incorrectly ordered bounds and refuses crop parameters without a source identifier.

`maas-hoffman-v1` is implemented and tested, but no catalogue crop currently has both a compatible ECe threshold and verified response slope. Live salinity scores therefore remain unavailable. EC1:5 and unknown methods are never treated as ECe, and no conversion factor is invented.

`organic-matter-lower-ramp-v1` is implemented and tested for future locally sourced targets. No universal target is configured, so live organic-matter scoring remains unavailable. Nutrient values and soil texture are retained as context without unsupported numeric scores.

The crop score uses fixed weights from `backend/src/config.js`: 50% soil, 30% climate and 20% water. Farmer-selectable profiles have been removed; legacy profile input cannot alter the score. When a component is unsupported, its weight is excluded from the partial score and the original included weight is reported as weight coverage. Missing data never receives 0 or 100. Saved analyses retain their original scores; new results store the configured weights and model version.

Climate screening requests corresponding-season NASA POWER observations through the longest reference crop duration, rounded to full calendar months. Each crop uses its own matching duration for both temperature and water. Future planting uses the most recent completed corresponding season, explicitly a single-season baseline, not a climatology or forecast. Entered pH at/outside verified tolerance bounds is treated as a hard exclusion. Prototype planting months affect screening and produce a warning, but are not treated as scientifically verified hard exclusions.

NASA normalization reports valid days, missing days, coverage, requested coordinates, units, retrieval time and provenance. Heat and frost event functions return unavailable until verified crop-specific thresholds are supplied.

Rotation plans enumerate three crop opportunities from the eligible catalogue. Unscored crops and consecutive identical crops are excluded; fewer than three plans are returned when needed. These sequences reuse the current screening scores and do not simulate subsequent seasons. The current prototype score is:

`0.85 × mean crop screening score + 0.15 × family-transition compatibility`

Different families reduce one obvious repetition concern but do not establish pest or disease safety.

## Deferred

- FAO-56 ET0/ETc water scoring until all compatible meteorological inputs and verified Kc profiles are available.
- A daily root-zone water balance.
- Nutrient sufficiency because laboratory methods and regional crop thresholds are not yet compatible.
- Long-term soil organic matter, nitrogen credits, yield, profit and market modeling.
- Pest-specific return intervals and locally validated planting calendars.

The demo uses fictional soil and climate values and the same deterministic calculations. It is labeled on every result screen.

## Water screening (model 1.2)

NASA POWER AG daily LST supplies T2M/T2M_MIN/T2M_MAX (C), PRECTOTCORR (mm/day), RH2M (%), ALLSKY_SFC_SW_DWN (MJ/m^2/day), WS2M (m/s), and PS (kPa). Response units are checked; kW-hr/m^2/day radiation converts by 3.6 when returned. Unsupported optional units yield missing ET0 rather than invented conversions. Elevation comes from returned point geometry, not a sea-level default. Wind is already at 2 m. Radiation and meteorological fields have different native grid resolutions; neither represents field sensors.

Reference ET0 uses FAO-56 daily Penman-Monteith. Mean temperature is (Tmin+Tmax)/2; es averages saturation pressures at the extrema; ea uses mean RH via equation 19 (less accurate than paired RH extrema). Delta follows eq13 and gamma=0.000665*PS. Ra uses latitude and day of year (eq21-25); Rso=(0.75+0.00002*z)*Ra; Rns=0.77*Rs; Rnl uses Stefan-Boltzmann, daily Kelvin extrema, ea and cloudiness (eq39); Rn=Rns-Rnl. G=0 for daily grass reference. The relative cloudiness ratio is bounded 0.3 to 1 using the ASCE standardized reference ET convention; no measured radiation value is replaced. No positive clear-sky radiation or missing inputs means no ET0. Negative calculated ET0 is bounded to zero (no negative water demand). All days must be valid for seasonal demand.

Crop ETc=Kc*ET0. FAO-56 Tables 11/12 reference profiles are stored in crops.json with context. One-based growth days follow equation 66, linearly interpolating development and late stages. Initial/mid/late-end Kc and initial/development/mid/late days:

| Crop interpretation | Kc | Days | Reference context |
| --- | --- | --- | --- |
| Potato | 0.5 / 1.15 / 0.75 | 30/35/50/30 | April Europe |
| Common bean, green harvest | 0.5 / 1.05 / 0.90 | 20/30/30/10 | Feb/Mar California, Mediterranean |
| Tomato | 0.6 / 1.15 / 0.80 | 30/40/45/30 | Apr/May Mediterranean; Solanaceae end reference within tomato range 0.70-0.90 |
| Spring wheat, dry harvest | 0.3 / 1.15 / 0.25 | 20/25/60/30 | March/April, 35-45 degrees latitude; NOT winter wheat |
| Fresh-market cucumber | 0.6 / 1.0 / 0.75 | 20/30/40/15 | June/August arid region |

These are documented example profiles, not verified local cultivar calendars. They remain explicit reference assumptions even for other locations/months. Kc is not adjusted for local wetting frequency or wind/RH; local stage lengths and harvest purpose require review. Planting starts on the first day of the selected month because only month/year are supplied.

Effective rainfall uses the FAO irrigation training manual monthly approximation: Pe=max(0,0.6*P-10) when P<=75 mm/month, otherwise max(0,0.8*P-25). It applies only after the farmer identifies level/gently sloping land (up to 5%). Steeper/unknown slopes leave Pe and score null. Full calendar-month observations are required; no missing rainfall becomes zero. For a crop ending partway through a month, monthly Pe is allocated by crop-days/calendar-days, an explicitly disclosed uniform-distribution approximation. Total crop rainfall is separately summed over actual crop days. Pe is a preliminary estimate, not measured field availability. The method does not account for soil-specific infiltration, runoff or daily timing.

Irrigation is optional usable field-delivered depth in mm per candidate crop season. Rain-fed means zero; an unknown irrigated amount stays null, with a rain-only baseline shown but excluded from ranking. Optional m3 converts using volume*1000/area(m2); when both inputs are supplied, mm takes precedence. No assumed application efficiency: inlet volumes must be converted to usable delivered water by the user. Each alternative crop is evaluated with that budget, not a shared multi-season budget.

Supply=Pe+usable irrigation; deficit=max(0,ETc-supply); score=100*clamp(supply/ETc,0,1). Initial soil storage is omitted, explicitly zero contribution; no capacity inferred from texture. Missing or nonpositive ETc, missing Pe or unknown irrigation leaves the main score null. Any positive deficit produces a visible shortfall warning. No unsupported universal deficit exclusion threshold is imposed. Seasonal surplus cannot prove that every growth stage receives enough water.

Full component scores use 0.50 soil + 0.30 climate + 0.20 water; final crop scores retain one decimal (100/81/65 -> 87.3). Otherwise existing available-weight normalization is preserved with coverage disclosure. The climate component still includes the existing unverified month-list indicator, not temperature alone. Rotation scores use reranked crops but remain preliminary; later seasons require separate observations and water budgets. No summed multi-season supply or demand is claimed.

Demo remains synthetic and functional; its sparse legacy weather lacks the new inputs and correctly keeps water incomplete. Saved history displays its original snapshot. Start a new analysis to obtain new scores. Assistant reconstruction validates daily weather fields and recomputes scores; browser-supplied inputs are not independently verified NASA data. Gemini only explains calculated outputs and never computes scores.

## Verification

Automated tests include FAO-56 Example 18 (Uccle: about 3.9 mm/day), full radiation calculations, Kc transitions, ETc, missing rainfall, monthly Pe examples, volume conversion, 400/340 demand/supply -> 85, 87.3 weighted score, and changes in crop/rotation ranking. Real NASA observations at 33.85 N, 35.9 E for March-July 2025 are archived in backend/data/water-verification-nasa.json; docs/water-verification.json records reproducible calculated results. Farmer pH 6.5, gentle slope and irrigation 300 mm in that verification are hypothetical inputs, clearly separate from NASA observations.

### Executed checks and implementation files

On 2026-11-15: 61 backend tests and 29 frontend tests passed; Vite production build passed. The full runAnalysis live service returned Common bean 99.4, Cucumber 95.6 and Tomato 89.0 using the archived verification inputs; corresponding water scores were 97.0931, 77.9064 and 44.7546. Render tests verify calculated mm values and saved-history consistency. Browser visual interaction was not exercised in this change.

Changed implementation: backend/src/config.js; backend/data/crops.json; backend/src/services/nasaPower.js, climatePeriod.js, analysis.js, analysisContext.js, rotationEngine.js, farmerAssistant.js and aiExplainer.js; backend/src/services/scoring/evapotranspiration.js (new), waterScore.js and cropScore.js; backend/src/utils/validation.js and math.js. Frontend changes: pages/Analyze.jsx and Results.jsx; components/ScoreBar.jsx, RotationCard.jsx and FarmerAssistant.jsx; shared/questionPolicy.js. Tests: backend/tests/water.test.js (new), math.test.js and scoring.test.js; frontend/src/pages/rendering.test.jsx. Documentation: README.md, docs/methodology.md, docs/sources.md, docs/water-verification.json (new). The public NASA response is retained in backend/data/water-verification-nasa.json for reproducibility.
