# GeoVoice

**Explore the world through natural language.** A working, map-first GIS MVP with text commands, optional browser speech, nearby-place discovery, driving routes and transparent carbon estimates.

## Context and attribution

This is an independent MVP revival of the **Astro Hack Squad** collaborative concept associated with the 2024 ISRO Bharatiya Antariksh Hackathon problem: “Develop a library or proof-of-concept for voice-enabled user-interface for geospatial map based web applications.” The original concept documents propose accessibility, local voice processing and sustainability features; they are not evidence that those features were historically completed or formally evaluated.

The original team's collaborative contribution is acknowledged in the interface and here. This implementation claims no competition award, published paper, research validation or exclusive ownership of the original concept. No project-wide license is asserted on behalf of the original team. Third-party libraries and map data retain their own licenses.

The supplied repository could not be cloned: GitHub returned repository not found over SSH and HTTP 404 for its HTTPS page. Following the user's explicit fallback authorization, this was created as a standalone directory, **without initializing Git**.

## Run locally

Requires Node.js **24.x** and npm on Linux/macOS, matching the Vercel runtime pinned in `package.json`. No sign-in, API key or paid subscription is required by the default geographic endpoints.

```bash
cd /home/thewitch/geovoice-mvp-samrudhi
npm ci
npm run dev
```

Open **http://127.0.0.1:4173**. The server listens on loopback only. Stop it with Ctrl+C. If port 4173 is occupied, use `PORT=4175 npm run dev`.

For the production build:

```bash
npm run build
npm start
```

Run either the development or production server on the selected port, not both. `npm start` serves `dist/` and the geographic API together; opening `dist/index.html` directly or using a static-only preview will not provide the API.

```bash
npm test
npm run typecheck
```

Dependencies are local in `node_modules/`; npm's cache is `.cache/npm/`. Runtime caches and temp files are inside `.cache/` and `tmp/`. Build output is `dist/`; screenshots and verification evidence are in `artifacts/`. No parent-workspace configuration or existing repository is required. The directory itself is persistent; command history, user pins and map session state are in memory and reset on reload.

## Vercel deployment

Deploy the **whole project**, including `api/`, `server/`, `src/`, `package.json` and `package-lock.json`. Uploading only `dist/` provides the interface and map tiles but breaks location searches, nearby places and routing. The browser calls relative `/api/*` URLs; these endpoints must be on the same origin.

Use these settings, also recorded in `vercel.json` and `package.json`:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | `.` — the directory containing this project's `package.json` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js version | `24.x` |
| Function maximum duration | 60 seconds for `api/*.ts` |
| Enable access to System Environment Variables | Enabled, so runtime receives `VERCEL=1` |
| Start command / port | None; do not use `npm start` or set `PORT` on Vercel |

Vercel serves `dist/` as static assets and builds four Node.js Functions: `/api/health`, `/api/geocode`, `/api/poi` and `/api/route`. Their entry files reuse `server/api.ts`; `server/index.ts` remains the local development/production server and is not a Function entry point. Native ESM imports in the API use explicit `.js` extensions for compiled Node.js output.

No development proxy, API-domain variable, `VITE_*` variable, CORS wildcard or API rewrite is needed. Existing same-origin checks accept HTTPS origins matching the request host, including preview and custom domains. The application has no client-side URL routes, so a blanket SPA rewrite is unnecessary and could interfere with `/api/*`. The `http://localhost` strings in server URL parsers are placeholder bases for relative paths, not outbound API addresses. Browser map tiles and all default upstream services already use HTTPS.

There are no manually required API keys with the default providers. For provider overrides, set these **server-side** variables in Vercel's Preview and Production environments, then redeploy:

| Variable | Default |
| --- | --- |
| `GEOCODING_URL` | `https://nominatim.openstreetmap.org/search` |
| `OVERPASS_URL` | `https://overpass-api.de/api/interpreter` |
| `PHOTON_URL` | `https://photon.komoot.io/reverse` |
| `ROUTING_URL` | `https://router.project-osrm.org/route/v1/driving` |

Leave `PORT` and `VITE_*` unset. Do not upload `.env` files; `.vercelignore` excludes them, dependencies, local caches, temporary files, screenshots and local build output. Vercel generates a fresh build. A replacement geocoder must implement the existing Nominatim-compatible request/response contract; provider-specific authentication headers or extra query parameters are not implemented. Routing must remain an OSRM-compatible driving endpoint.

Production behavior and limits:

- **Voice commands:** final recognized text uses the same parser/executor as typed input. Use the HTTPS deployment directly in a browser with speech recognition support and allow microphone access. The browser's recognition service may process audio remotely and may fail independently of Vercel. HTTPS hosting does not fix an unavailable speech service. Real-audio transcription remains unverified; the previous local browser check reported a speech-service connection failure. Text input remains available.
- **Location search:** handled by `/api/geocode`, with the existing name/coordinate validation and normalization. **Before sharing a public multi-user deployment, use an appropriate Nominatim-compatible hosted/self-hosted endpoint or otherwise provide shared rate coordination.** Public Nominatim limits requests across the entire application, while the existing queue only coordinates one running instance. Vercel can create multiple instances; this preparation does not guarantee application-wide rate compliance.
- **Nearby POIs:** `/api/poi` retains Overpass and the labeled Photon fallback. Their public services can be slow, busy or unavailable. The 60-second function allowance covers the existing sequential primary/fallback timeouts under normal load; the browser still stops waiting after 45 seconds. Requests queued under load can time out.
- **Routing:** `/api/route` retains OSRM driving geometry and distance; the public demo provider has no uptime guarantee or live traffic. Emissions comparisons remain illustrative.
- **Map layers:** OpenStreetMap street and OpenTopoMap topographic tiles load directly over HTTPS, with existing attribution. Availability and usage remain subject to their providers' policies.
- **Cache/state:** `VERCEL=1` disables filesystem caching and uses the existing bounded memory cache. Cache entries, request spacing and Overpass cooldown are per warm instance and disappear on cold starts/redeployment; they are not durable or globally shared. Local `npm start` still uses `.cache/service-cache.json`. Pins/history still reset on page reload.

Verified locally on **24 October 2026** using **Node 24.22.1**: `npm run typecheck` passed, `npm test` passed **88 tests in 7 files**, and `npm run build` passed. All four API entry points also compiled to native Node ESM; the emitted JavaScript loaded successfully and served health/coordinate-geocoding requests without a TypeScript loader. Function integration tests use real loopback HTTP and simulated external provider responses, including an HTTPS Origin header, rejected foreign origins, rejected methods and a read-only filesystem. They do not verify Vercel infrastructure or live providers from Vercel. After a future deployment, check `/api/health`, a named location search, nearby POIs, a driving route, both layers and microphone behavior on the actual HTTPS domain. No deployment was made during preparation.

References: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [configuration](https://vercel.com/docs/project-configuration/vercel-json), [system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables), [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) and [browser speech support](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

## Working features

- Interactive React Leaflet map starting in Mumbai, with panning, zoom, coordinates, resize handling and attribution.
- Real OpenStreetMap street and OpenTopoMap topographic basemaps. Topographic tiles can take several seconds to load.
- Typed deterministic command parser and a reusable GIS executor, without an LLM dependency.
- Explicit location searches, up to five selectable matches, literal coordinates, cached results, and clear no-result errors. Exact place-name matches outrank partial matches. Searches have a soft Mumbai viewbox bias; names outside it remain supported. Add a city/state/country when a name is ambiguous.
- User markers from named commands or the pin tool followed by a map click. Popups show source and coordinates. Remove individual markers, the most recent marker, or all user markers. Search and POI markers use separate styles.
- Nearby cafes, restaurants, hospitals, parks, hotels and tourist attractions, with an adjustable command radius, result list, approximate distance, coordinates and addresses when present. Selecting a result focuses the map.
- Live OSRM driving polylines, origin/destination context, distance, provider-estimated duration and a clear-route action. A route form and text commands share the same executor.
- Car, bus, walking and cycling **illustrative emissions comparisons**, with adjustable car/bus factors and an explained formula. Only driving geometry is requested.
- Browser speech adapter with explicit microphone activation, listening/processing states, final-transcript submission, stop/retry, timeout, permission/no-speech errors and text fallback.
- Command examples, bounded recent history, structured processing/result feedback, cancelable searches, help dialog, keyboard focus and a responsive mobile drawer/results sheet. Errors and cancellation remain visible on mobile while the drawer is closed.

## Demo commands

Type a command and press Enter, or click **Run command**. Shift+Enter inserts a new line; `/` focuses the input. Suggested commands run immediately. After you activate the microphone, the final recognized transcript runs once through the same command handler. Interim text never executes.

| Purpose | Examples |
| --- | --- |
| Zoom | `Zoom in` · `Zoom out` · `Zoom to Ahmedabad` |
| Navigate/search | `Go to Pune` · `Find Mumbai` · `Find São Paulo, Brazil` |
| Coordinates | `Zoom to 19.076, 72.8777` |
| Markers | `Add marker at Gateway of India` · `Remove marker` · `Remove marker at Pune` · `Clear markers` |
| Basemaps | `Show street map` · `Show road layer` · `Show topographic map` · `Hide topographic map` |
| Nearby | `Find cafes near Marine Drive` · `Show hospitals near Andheri` · `Find parks within 3 km of Powai` · `Find restaurants near Bandra` |
| Other POIs | `Find hotels near Jaipur` · `Find tourist attractions near Mumbai` |
| Route | `Plan route from Gateway of India to Marine Drive` · `Clear route` |
| Reset | `Reset map` |

Arbitrary valid names are supported; these are examples, not hardcoded coordinates. A named navigation/POI/route command uses the first ranked geocoding result and shows the resolved location. Search results offer alternate matches. Named marker removal matches the marker's displayed name, case-insensitively. `Remove marker` removes the most recent user pin.

## Architecture

```text
Typed command / speech transcript / UI action
    → parseCommand → discriminated Command union
    → executeCommand(command, GisAdapter, GeographicServices, AbortSignal)
    → Leaflet adapter → map + React state → user feedback/history

React → same-origin /api/* → local Node proxy or Vercel Functions
                              ├─ Nominatim: geocoding
                              ├─ Overpass → Photon fallback: bounded POI queries
                              └─ OSRM: driving route geometry
```

`src/commands/` contains parsing and execution; it imports no React or Leaflet code. `src/gis/adapter.ts` defines the GIS and service contracts; `src/gis/leafletAdapter.ts` connects those contracts to Leaflet. To integrate another GIS library, implement `GisAdapter` and provide it to `executeCommand`; speech and parsing do not need to change. `src/voice/speechAdapter.ts` produces text and status callbacks, so an on-device transcriber can later replace it. `src/config/emissions.ts` owns the factors and calculation.

The small `server/` proxy supplies provider request spacing, caching, identification, validation and configurable endpoints. Locally, a single server coordinates requests and persists its cache; `server/index.ts` also serves the production static files. On Vercel, `api/*.ts` reuse the same API handler with per-instance memory caching. The MVP does not provide distributed rate limiting or a production mapping service.

## External services, policies and privacy

**Public Nominatim has strict usage restrictions.** Review the [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) before use or deployment: maximum one request per second across the application, clear attribution and application identification, caching, no autocomplete, bulk geocoding or confidential inputs. The local proxy serializes calls with at least 1.1 seconds between starts, coalesces duplicate requests and caches location results for seven days. Only explicit user submissions cause searches. Run a single server instance; multiple independently running copies do not coordinate quotas. A public deployment requires a deliberate provider/usage review, rather than assuming the public service is unlimited.

Street tiles come directly from [OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/), with visible contributor attribution and normal browser caching. No bulk tile downloads, offline prefetch or service worker is used. [OpenTopoMap](https://opentopomap.org/about) is a separate topographic layer, attributed to OSM contributors, SRTM and OpenTopoMap under CC-BY-SA. It is not satellite imagery.

Overpass queries use a default 3 km radius, permit 100 m–10 km, retrieve at most 100 OSM elements and display up to 40 normalized nearby results sorted by straight-line distance. They are bounded, cached for ten minutes and serialized. They are not exhaustive listings. See the [Overpass public-instance guidance](https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances). Availability is not guaranteed; the default service reported capacity errors during verification. If Overpass fails, the proxy uses the [Photon public API](https://github.com/komoot/photon#demo-server) for a category-filtered, radius-bounded reverse search, then independently checks category, coordinates and distance. The panel prominently labels Photon fallback results and their potentially different coverage. Up to 40 live or cached records are shown; no fake POIs are substituted. Failed Overpass requests trigger a one-minute cooldown before another primary attempt. Photon also permits only reasonable usage and has no uptime guarantee; deploy your own or an appropriate hosted service for larger usage.

[OSRM](https://project-osrm.org/docs/v5.24.0/api/) provides driving routes based on OpenStreetMap. Public demo infrastructure has no uptime guarantee. Route results are cached for ten minutes. Estimated duration does not include live traffic. The application's bounded service cache stores at most 250 successful responses. It persists to `.cache/service-cache.json` locally and stays in warm-instance memory on Vercel; no audio or accounts are stored.

Requests have timeouts. New commands abort obsolete browser requests and prevent their results from changing the map. The proxy may finish an already-started shared upstream request and cache its result; canceling a UI command does not rewind a request already sent to a public service.

Optional configuration: copy `.env.example` to `.env` **inside this directory** and edit `PORT`, `GEOCODING_URL`, `OVERPASS_URL`, `PHOTON_URL` or `ROUTING_URL`; restart the server afterward. Compatible endpoints can be changed without rebuilding the frontend. Do not point `ROUTING_URL` at a walking/cycling profile: the application intentionally identifies its routes as driving.

Browser speech has [limited support and may use remote recognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition). It is **not guaranteed to work offline or process locally**. Microphone permission and recognition service availability vary by browser. Listening starts only when you activate the microphone; a final transcript executes once and listening stops. Type commands if voice is unavailable. Geographic providers receive the place names or coordinates you search; avoid personal or confidential locations.

## Carbon methodology

```text
estimated kg CO₂e = driving route distance in km × illustrative factor in kg/km
```

Defaults are **illustrative assumptions**, not sourced transport measurements or locally validated factors: car 0.171 kg/km (one occupant), bus 0.097 kg/passenger-km, walking 0, cycling 0. Car and bus factors can be edited in the route panel, or all defaults changed in `src/config/emissions.ts`. This simple comparison excludes traffic, vehicle technology, lifecycle emissions, food-related emissions and local energy mix. It assumes the same driving distance for comparisons; actual walking, cycling or bus distances may differ. Zero means zero **direct operational** emissions under this model. It does not establish bus availability, route accessibility, or an optimized low-emission journey. Estimates appear only after a valid route distance is returned.

## Limitations and future work

Public services and internet access are required. The parser supports documented grammar, not unrestricted conversation. Speech recognition with a real microphone still requires a user/browser check. Nearby search depends on Overpass or its explicitly labeled Photon fallback. Verification retrieved 40 real cafes near Marine Drive through the fallback; Overpass itself was at capacity. Session pins/history do not persist. No highway overlay, satellite layer, traffic, transit service, accessible-route certification or route optimization is claimed.

Future work only: on-device Whisper/WebGPU, an OpenLayers adapter, broader command interpretation, reliable hosted geographic providers, saved journeys, transit data, QGIS integration and raster analysis. Accounts, reservations, turn-by-turn navigation and package publication are outside this MVP.

## Screenshots and verification

Actual desktop/mobile captures are stored in `artifacts/`. The route and nearby-search captures demonstrate live provider data:

![Desktop route and carbon comparison](artifacts/desktop-route.png)

![Real nearby places with explicit fallback attribution](artifacts/desktop-poi.png)

![Mobile interface](artifacts/mobile-route.png)

See [docs/verification.md](docs/verification.md) for executed checks, feature status and remaining external-service limitations.
