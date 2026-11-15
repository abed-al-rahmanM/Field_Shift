# Architecture

```text
React/Vite browser
  ├─ four-page interface
  ├─ localStorage history
  └─ /api requests
        ↓
Express API
  ├─ strict Zod input validation
  ├─ NASA POWER adapter + memory cache
  ├─ deterministic crop scoring
  ├─ deterministic rotation enumeration
  └─ optional Gemini extraction/explanations
        ↓
Static crop JSON + cited sources
```

Uploaded files remain in memory only for the extraction request. No authentication or cloud database is used. The Gemini key exists only in the backend environment.
