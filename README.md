
# GeoVoice

**Explore the world through natural language.**

A voice-enabled geospatial web application featuring interactive maps, natural-language commands, nearby-place discovery, driving routes, and illustrative carbon-emission comparisons.

### [🌐 Try GeoVoice — Live Demo](https://geovoice-explore.vercel.app/)

**[GitHub Repository](https://github.com/samrudhi-builds/-Voice-Enabled-User-Interface-for-Geospatial-Map-Based-Web-Applications)** · **[Production Verification Report](docs/GeoVoice-Live-Smoke-Test-2026-10-24.pdf)**

GeoVoice is a deployed, map-first GIS MVP built with React, TypeScript, Vite, and Leaflet. Users can explore locations through typed commands or supported browser speech recognition.

## Context and attribution

GeoVoice originated as a collaborative concept initiated and led for the **ISRO Bharatiya Antariksh Hackathon 2024**, addressing the problem statement:

> Develop a library or proof-of-concept for voice-enabled user-interface for geospatial map based web applications.

The original team, **Astro Hack Squad**, contributed to the concept and its exploration.

In 2026, I independently revisited and developed the concept into a functional web-based MVP, implementing the application, geospatial integrations, command handling, responsive interface, testing, and deployment.

This project does not claim an ISRO affiliation, competition award, published research validation, or exclusive ownership of the original collaborative concept. Third-party libraries and map data retain their respective licenses.

## Working features

- **Interactive GIS map:** React Leaflet map with panning, zooming, coordinates, and responsive controls.
- **Map layers:** OpenStreetMap street and OpenTopoMap topographic basemaps.
- **Natural-language text commands:** Deterministic command parsing and execution without an LLM dependency.
- **Voice commands:** Browser speech recognition converts spoken instructions into text and automatically executes recognized commands.
- **Location discovery:** Search for places, navigate to coordinates, and select matching locations.
- **Marker management:** Add, inspect, and remove map markers.
- **Nearby places:** Discover cafés, restaurants, hospitals, parks, hotels, and tourist attractions.
- **Route planning:** Visualize OSRM driving routes with distance and estimated travel time.
- **Carbon comparisons:** Illustrative car, bus, walking, and cycling emissions estimates based on route distance.
- **Responsive interface:** Mobile-friendly command drawer, route panel, map controls, and result feedback.
- **Error handling:** Cancellable requests, provider fallbacks, command history, and contextual feedback.

## Live application

**[Launch GeoVoice](https://geovoice-explore.vercel.app/)**

The deployed application supports interactive maps, location searches, nearby-place discovery, route visualization, and natural-language commands.

Voice transcription and automatic spoken-command execution have been successfully tested on a physical smartphone. Speech recognition depends on browser support and service availability; text commands remain available as a fallback.

No account or API key is required to try the default public demo.

## Screenshots

### Route planning and carbon comparison

![Desktop route and carbon comparison](artifacts/desktop-route.png)

### Nearby place discovery

![Nearby places with provider attribution](artifacts/desktop-poi.png)

### Responsive mobile interface

![Mobile interface](artifacts/mobile-route.png)

## Demo commands

Enter a command and press **Run command**, or activate the microphone in a supported browser.

| Purpose | Example commands |
| --- | --- |
| Zoom | `Zoom in` · `Zoom out` · `Zoom to Ahmedabad` |
| Navigate | `Go to Pune` · `Find Mumbai` |
| Coordinates | `Zoom to 19.076, 72.8777` |
| Markers | `Add marker at Gateway of India` · `Remove marker` · `Clear markers` |
| Basemaps | `Show street map` · `Show topographic map` |
| Nearby places | `Find cafes near Marine Drive` |
| Nearby categories | `Show hospitals near Andheri` · `Find parks within 3 km of Powai` |
| Other POIs | `Find hotels near Jaipur` · `Find tourist attractions near Mumbai` |
| Routing | `Plan route from Gateway of India to Marine Drive` |
| Reset | `Reset map` |

Commands are parsed into structured GIS actions. Recognized final speech transcripts use the same execution pipeline as typed commands.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Mapping | Leaflet, React Leaflet |
| Basemaps | OpenStreetMap, OpenTopoMap |
| Speech | Browser Web Speech API |
| Geocoding | Nominatim |
| Nearby POIs | Overpass API, Photon fallback |
| Routing | OSRM |
| Backend | Node.js, TypeScript |
| Deployment | Vercel Static Hosting and Node.js Functions |
| Testing | Automated TypeScript and API tests |

## Architecture

```text
Voice input / Text command / UI action
                 |
                 v
           Command Parser
                 |
                 v
        Structured GIS Command
                 |
                 v
           GIS Executor
                 |
       +---------+----------+
       |                    |
       v                    v
  Leaflet Adapter     Geographic Services
       |                    |
       v                    v
 Map + UI State       Same-origin /api/*
                            |
                +-----------+-----------+
                |           |           |
                v           v           v
             Nominatim   Overpass     OSRM
                         / Photon
```

The command parser and executor are separated from React and Leaflet-specific implementation details.

- `src/commands/` handles command parsing and execution.
- `src/gis/` defines GIS contracts and the Leaflet adapter.
- `src/voice/` handles browser speech recognition.
- `src/config/emissions.ts` defines illustrative emissions factors.
- `server/` provides geographic API handling, validation, caching, and provider integrations.
- `api/` exposes the backend through Vercel Functions.

The application uses relative `/api/*` requests, keeping frontend and backend communication on the same origin.

## Run locally

### Requirements

- Node.js 24.x
- npm

Clone the repository:

```bash
git clone https://github.com/samrudhi-builds/-Voice-Enabled-User-Interface-for-Geospatial-Map-Based-Web-Applications.git
cd ./-Voice-Enabled-User-Interface-for-Geospatial-Map-Based-Web-Applications
```

Install dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

Open:

`http://127.0.0.1:4173`

For a production build:

```bash
npm run build
npm start
```

The local server serves both the frontend and geographic API. Opening `dist/index.html` directly does not provide the backend endpoints.

### Testing

```bash
npm run typecheck
npm test
npm run build
```

The Vercel preparation checks completed successfully on Node.js 24.22.1, including **88 automated tests**, TypeScript validation, production build, and compiled native-ESM API smoke checks.

## Vercel deployment

**Production URL:** https://geovoice-explore.vercel.app/

GeoVoice is deployed using Vercel's Vite frontend hosting and four Node.js Functions.

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Root directory | `.` |
| Node.js | `24.x` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Function duration | 60 seconds |
| Start command | Not required |

### API endpoints

| Endpoint | Purpose |
| --- | --- |
| `/api/health` | Application health |
| `/api/geocode` | Location and coordinate search |
| `/api/poi` | Nearby place discovery |
| `/api/route` | Driving route calculation |

The frontend and API use the same origin. No separate API-domain configuration or manually supplied API keys are required for the default providers.

Optional server-side configuration:

| Variable | Default |
| --- | --- |
| `GEOCODING_URL` | `https://nominatim.openstreetmap.org/search` |
| `OVERPASS_URL` | `https://overpass-api.de/api/interpreter` |
| `PHOTON_URL` | `https://photon.komoot.io/reverse` |
| `ROUTING_URL` | `https://router.project-osrm.org/route/v1/driving` |

Compatible alternative services may be configured for production use. The public default services have usage and availability limitations.

## Production verification

GeoVoice was tested against its deployed HTTPS application on **October 24, 2026**.

### Verified functionality

| Test | Result |
| --- | --- |
| Street and topographic map layers | PASS |
| Mumbai location search | PASS |
| Nearby café discovery | PASS — Photon fallback |
| Gateway of India to Marine Drive route | PASS |
| Natural-language text commands | PASS |
| Responsive mobile layout | PASS — browser emulation |
| API health endpoint | PASS — HTTP 200 |

The documented driving route measured approximately **4.3 km**, with a provider-estimated duration of **6 minutes**. Nearby discovery returned 40 café records through the explicitly labeled Photon fallback after Overpass was unavailable.

### Additional voice verification

Following the initial smoke test, GeoVoice was tested successfully on a **physical smartphone**.

The test confirmed:

1. Microphone activation.
2. Successful speech transcription.
3. Automatic execution of the recognized map command.
4. Corresponding map interaction.

This confirms a working end-to-end voice-command experience on the tested mobile browser.

Speech recognition remains browser-dependent. A desktop browser on an Omarchy Linux environment did not successfully transcribe speech during testing; that environment's underlying failure has not been conclusively diagnosed.

### Verification evidence

**[View the Production Smoke-Test Report (PDF)](docs/GeoVoice-Live-Smoke-Test-2026-10-24.pdf)**

The PDF preserves the original October 24 observations. Its voice test was unverified at the time of capture; the successful physical-phone test described above occurred afterward.

Additional development verification is documented in [docs/verification.md](docs/verification.md).

## External services, privacy, and limitations

### Geocoding

Location search uses Nominatim. Its public service requires responsible usage, including application-wide request limits.

The local backend includes request spacing and caching. Vercel Functions may run across multiple instances, so the existing in-memory controls do **not** guarantee application-wide rate compliance under multi-user traffic.

A production service expecting significant usage should use a suitable hosted or self-hosted geocoding provider with shared rate coordination.

See the [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/).

### Nearby places

Nearby discovery uses Overpass, with an explicitly labeled Photon fallback when the primary service is unavailable.

Results depend on public provider coverage and availability. They are not guaranteed to be exhaustive.

### Routing

OSRM provides driving routes, distance, and estimated travel time.

The public demo service does not guarantee uptime, and estimated durations do not include live traffic.

Walking, cycling, and public-transit routes are not independently calculated.

### Speech recognition

GeoVoice uses browser speech recognition, which may rely on an external browser-managed recognition service.

- Microphone access requires user permission.
- Browser and operating-system support varies.
- Offline recognition is not guaranteed.
- Text input remains available when speech recognition is unsupported.

The application does not intentionally record or store microphone audio.

### Session data

Map markers and command history are session-based and reset when the page reloads. The MVP does not include user accounts or persistent saved journeys.

## Carbon-emission methodology

GeoVoice displays illustrative emissions comparisons after calculating a driving route.

```text
Estimated kg CO₂e =
Driving distance (km) × Illustrative factor (kg/km)
```

Default illustrative factors:

| Mode | Factor |
| --- | --- |
| Car | 0.171 kg/km |
| Bus | 0.097 kg/passenger-km |
| Walking | 0 direct operational emissions |
| Cycling | 0 direct operational emissions |

These values are configurable assumptions, not locally validated emissions measurements.

The model uses the driving route distance for comparison and does not account for actual public-transit availability, different walking or cycling distances, traffic, lifecycle emissions, or vehicle-specific characteristics.

The estimates are informational, not certified environmental calculations.

## Limitations and future work

The current MVP supports documented natural-language command patterns rather than unrestricted conversational understanding.

Current limitations include:

- Browser-dependent speech recognition.
- Reliance on external geographic services.
- No satellite imagery or live traffic.
- No independent walking, cycling, or transit routing.
- No persistent accounts or saved journeys.
- No distributed request-rate coordination across Vercel instances.

Potential future improvements include on-device speech recognition, additional GIS adapters, more robust geographic providers, saved journeys, transit data, QGIS integration, and raster analysis.

These are future possibilities, not currently implemented features.

## References

- [Live GeoVoice Application](https://geovoice-explore.vercel.app/)
- [Vercel Vite Documentation](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js)
- [MDN SpeechRecognition API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [OpenTopoMap](https://opentopomap.org/)
- [OSRM](https://project-osrm.org/)
- [Photon](https://github.com/komoot/photon)
