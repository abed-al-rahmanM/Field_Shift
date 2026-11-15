# Sources and data status

## Environmental observations

- [NASA POWER Daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) — historical gridded temperature, precipitation and humidity. POWER meteorological parameters are primarily derived from MERRA-2. These are not farm sensors or forecasts.

## Crop references

- [FAO ECOCROP](https://gaez.fao.org/pages/ecocrop) and the [legacy library](https://ecocrop.apps.fao.org/ecocrop/srv/en/home).
- [Tomato record 1379](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=1379).
- [Potato record 1971](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=1971).
- [Common bean data sheet 1668](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=1668).
- [Common wheat data sheet 2114](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=2114).
- [Cucumber data sheet 817](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=817).
- [FAO crop water needs](https://www.fao.org/4/S2022E/s2022e07.htm) and [FAO-56](https://www.fao.org/4/x0490e/x0490e0a.htm) are methodology references; this release does not claim a complete FAO-56 water balance.
- [USDA NRCS soil health assessment](https://www.nrcs.usda.gov/conservation-basics/soil/soil-health/soil-health-assessment) provides general soil assessment context.

All five catalogue crops have transcribed ECOCROP pH and temperature bounds used in screening. Planting-month lists remain prototype assumptions and are disclosed as such in results and methodology. FAO annual rainfall ranges are deliberately not treated as exact three-month seasonal water requirements.

Each crop record stores organization, URL, species/crop context, methodology, access version and limitations alongside parameter-level source IDs. The catalogue intentionally leaves Kc values, salinity yield-response slopes, nutrient thresholds and locally calibrated organic-matter targets null.

The implementation contains the Maas–Hoffman formula for future use with verified saturated-paste ECe parameters. ECOCROP qualitative salinity classes are not substituted for quantitative thresholds or slopes. [FAO salinity guidance](https://www.fao.org/4/T0234e/T0234E03.htm) is retained as a methodology reference rather than a source for crop values not yet verified.

## Synthetic data

`backend/data/demoScenario.json` is a fictional farm near Akkar, Lebanon. Its laboratory and climate values exist only for the judge walkthrough. They are never presented as live NASA data.

## Water implementation sources (verified November 2026)

- NASA POWER Daily API, AG community, daily LST: https://power.larc.nasa.gov/docs/services/api/temporal/daily/ . Actual response metadata in the archived verification confirms all eight parameter units.
- NASA meteorological provenance and grid limitations: https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/
- FAO-56 meteorological equations: https://www.fao.org/4/X0490E/x0490e07.htm
- FAO-56 Penman-Monteith, Example 18 benchmark: https://www.fao.org/4/X0490E/x0490e08.htm
- FAO-56 crop coefficient approach: https://www.fao.org/4/X0490E/x0490e0a.htm
- FAO-56 Tables 11/12 and eq66 stage interpolation: https://www.fao.org/4/X0490E/x0490e0b.htm
- FAO irrigation training manual, monthly effective rainfall and slope limitation: https://www.fao.org/4/s2022e/s2022e08.htm
- ASCE standardized reference evapotranspiration report (2002 draft), relative cloudiness ratio 0.3-1 convention: https://www.apogeeinstruments.com/content/EWRI-ASCE-Reference-ET.pdf

The water coverage ratio and 50/30/20 ranking weights are engineering choices, not FAO yield-response models. Table profiles are explicitly indicative regional examples rather than universal crop parameters.
