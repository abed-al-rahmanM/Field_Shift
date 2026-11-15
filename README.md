# FIELD SHIFT

FIELD SHIFT is a NASA Space Apps 2026 hackathon MVP that combines farmer-entered soil information, historical NASA POWER observations and cited crop parameters to compare next-crop options and three-season rotation strategies.

## Run locally

Requirements: Node.js 20.19+.

```powershell
npm install
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:5000`.

```powershell
npm test
npm run build
npm start
```

## Environment variables

`PORT` defaults to 5000. `FRONTEND_ORIGIN` defaults to `http://localhost:5173`. `GEMINI_API_KEY` is optional. `GEMINI_MODEL` defaults to `gemini-3.5-flash` and should be changed only to a model available to the configured account. The app works without Gemini through manual entry and deterministic explanations.

## What is genuinely integrated

- NASA POWER Daily API: historical temperature, daily extrema, precipitation and humidity, with validation, timeout, suitable retry, fill-value removal, in-memory cache and provenance.
- Deterministic crop screening: fixed 50% soil / 30% climate / 20% water weights, structured pH/temperature calculations, missing-data coverage and verified hard constraints. Legacy priority settings cannot change the weights.
- Implemented but conservatively inactive formulas: Maas–Hoffman salinity and a sourced organic-matter lower-target ramp. They return unavailable without compatible verified parameters.
- Deterministic rotation enumeration: up to three distinct sequences with a disclosed crop/transition score. Consecutive identical crops and unscored crops are excluded.
- Gemini, when configured: structured soil-document extraction. The farmer reviews the original report, edits measurements and must confirm before continuing. The explanation endpoint remains available in the backend; the frontend uses deterministic summaries.
- Browser localStorage: up to 20 saved analyses, view, delete, rerun and JSON export.

## Real, static and synthetic

Live mode sends coordinates and a historical corresponding-season period to NASA POWER. Farmer soil values are user supplied. Crop parameters are static and cited; unavailable parameters are null. Demo Mode uses the clearly labeled fictional scenario in `backend/data/demoScenario.json` and makes no NASA request.

## Scientific limits

The score is not a success probability. Current water scores remain incomplete because compatible ET0 inputs, crop Kc profiles and effective rainfall are not all implemented. Nutrients are context only. The app does not predict yield, profit or future soil improvement. See [methodology](docs/methodology.md), [sources](docs/sources.md), and [architecture](docs/architecture.md).

## Simplified interface

Home, Analyze, Results and History use DM Sans, large controls and a responsive green/ivory design. The analysis form has three steps: Your Land, Your Soil, Water. Report uploads show a document preview, editable core readings, unit warnings and required confirmation. Unsupported nutrient readings are visible for reference but not submitted as scored inputs. JSON export and full sources remain in the results disclosure.

See [image credits](docs/image-credits.md) for the locally stored Pexels photography. The footer's Sources & methodology page includes data references and photo attribution.

## Project structure

- `frontend/` — React, Vite, Tailwind CSS, React Router, Lucide and Recharts.
- `backend/` — Express, Zod, Multer, NASA services, scoring/rotation engines and optional Gemini.
- `docs/` — methodology, data sources and architecture.

### Seasonal water analysis

Live analyses now request solar radiation, 2 m wind and pressure alongside temperature, rain and humidity. Deterministic FAO-56 ET0 and staged crop ETc feed a monthly effective-rainfall and usable-irrigation screening score. Complete scores contribute 20% of crop ranking; soil contributes 50% and climate 30%.

In step 3, select rain-fed or enter usable irrigation depth (optional volume/area conversion), and identify whether the field is gently sloping. Unknown values stay unknown. Results expand to show demand, rainfall, irrigation, deficit and the specific reason for any missing score. Run a new analysis: old saved results keep their original model values. No new API key or infrastructure is required.

See docs/methodology.md for assumptions, docs/sources.md for NASA/FAO references, and docs/water-verification.json for the real-weather verification with explicitly hypothetical farmer inputs. This is seasonal screening, not an irrigation schedule or yield forecast. Gemini does not calculate scores.
