# FIELD SHIFT: one Vercel Services deployment

Import the repository with project Root Directory at the repository root (leave it blank / ./), where vercel.json and the workspace package-lock.json live. Do not select frontend/ as the project root. Do not override the whole project as Vite or set its output to frontend/dist: that deploys only the UI. If the import UI offers a Services preset, select it; the current services configuration defines the two frameworks individually. Leave project-wide build/install/output overrides unset; the service configuration owns these settings.

The root vercel.json uses the current services format, not the older experimentalServices format. Public /api/(.*) requests enter the backend first with their full /api path intact. Other paths enter frontend. The frontend-only index.html rewrite supports direct React Router visits such as /results; it does not capture /api requests.

Backend: Express service root backend/, entrypoint src/app.js, ES modules via package.json type=module. app.js exports Express as default and named exports, loads server environment settings, and does not start a port listener. Local npm start/dev still use src/server.js. Express needs no transpilation/build step. The two runtime JSON catalogues are explicitly included because readJson constructs filenames dynamically. The 90-second function budget allows the existing bounded Gemini timeout to return its own error.

Frontend: Vite service root frontend/, npm run build, output dist. Requests already use /api, so no production localhost API URL or VITE_API_URL is needed. The localhost URL in vite.config.js is only the local development proxy. Same-origin browser requests need no cross-origin deployment URL.

Set GEMINI_API_KEY in Vercel project Environment Variables for the intended Production/Preview environments. Set GEMINI_MODEL to the model allowed for your Google project (the repository currently defaults to gemini-3.5-flash). Never use a VITE_ prefix for the key. No NASA POWER key is needed. .env files are excluded from Git and CLI deployment uploads; environment variables supplied by Vercel take precedence over dotenv. Services share project environment variables, but the Vite application does not expose or read GEMINI_API_KEY. Never add it to frontend define/envPrefix configuration. Changing Vercel variables requires a new deployment.

After deployment, verify:

- /api/health returns JSON with status ok and service FIELD SHIFT API. geminiConfigured is only a presence check, not proof of valid quota/credentials.
- /api/crops returns the five crop records (also verifies bundled JSON data).
- / and direct visits to /analyze, /results, /history and /sources load React.
- Demo analysis succeeds without a Gemini or NASA request.
- Unknown /api paths return backend 404 responses rather than React HTML.

Only after these checks, test a live analysis and one report upload if Gemini quota is available. A quota error is independent of routing/deployment success.

This preparation does not create/link projects, push commits or deploy. Actual Vercel build output and hosted routing still need verification on the fresh deployment. No scientific algorithms, UI components or upload rules were changed.

Existing serverless considerations: caches, AI rate limits and cooldowns are per process and may reset or differ between instances. Saved history remains browser-local. Vercel Function request-size limits can reject uploads below the app's existing 5 MB maximum (multipart overhead also counts); this task preserves that application behavior rather than introducing a different upload/storage workflow.

References checked:
- https://vercel.com/docs/services
- https://vercel.com/docs/services/config-reference
- https://vercel.com/docs/services/routing
- https://vercel.com/docs/frameworks/backend/express
- https://vercel.com/docs/frameworks/frontend/vite
