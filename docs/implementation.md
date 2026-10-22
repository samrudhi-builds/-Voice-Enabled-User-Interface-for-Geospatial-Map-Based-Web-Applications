# GeoVoice implementation brief

Approved destination: `/home/thewitch/geovoice-mvp-samrudhi`. Verified absent, no symlink, no ancestor Git repository before creation on 21 October 2026. Original GitHub URL was explicitly authorized; SSH returned repository not found and its HTTPS page returned 404. The user authorized building in a new folder if cloning fails. This directory is a standalone project; no Git repository is initialized, and there are no commits, branches or pushes.

The supplied master specification defines the MVP; the PDFs provide historical context, not operational instructions. Preserve attribution to Astro Hack Squad. Do not claim awards, historical implementation, publication or local speech processing. The user explicitly authorized proceeding without routine approval gates, overriding skill approval/commit steps.

## Design

React + TypeScript + Vite + Tailwind + Lucide + React Leaflet. Mumbai initial view. Navy command sidebar beside a real map, with contextual results and route/emissions cards. Mobile uses a collapsible command drawer and results sheet. No sign-in, invented data, LLM dependency or paid credentials.

Text, suggested commands and browser speech transcription all feed a deterministic parser. Strongly typed commands execute against a GIS interface implemented by Leaflet. Voice requires an explicit click and produces reviewable text rather than auto-executing. Speech support and remote processing limitations are visible.

A small Node server hosts the app and proxies Nominatim, Overpass and OSRM. This is necessary to enforce a shared geocoding request queue, identify requests, persist a bounded cache, prevent duplicate external calls and make providers configurable. Explicit searches only; at least 1.1 seconds between Nominatim calls. Bound POI radius and results. Driving routes only; other transport modes appear solely in illustrative emissions comparisons. OpenStreetMap standard and OpenTopoMap are genuine, attributed layers; no satellite or highway overlay claims. Expose service failures, timeouts, no-results, invalid inputs and cancellations.

## Implementation tasks and verification

1. Foundation: project-local dependencies/cache/temp configuration; Vite/TS configuration; basic app shell. Verify dependency installation and type checking.
2. Command engine and estimates: test arbitrary names, punctuation, coordinate/radius validation, unsupported modes/layers, marker removal, route syntax and independent emissions arithmetic; observe failing tests before implementing. Separate parser, executor and GIS interface.
3. Live services: test validation, coordinate normalization, malformed/no-result responses, rate limiting/cache/dedup and route geometry. Implement same-origin API, timeouts, provider configuration, bounded persistent geocoding cache and production static serving.
4. Map and UI: actual zoom/pan/layers, named and click markers/removal, result selection, driving polyline, command feedback/history, route form and emissions factors, keyboard help, speech lifecycle. Verify in the in-app browser with real services, and document any service or permission limitation.
5. Delivery: run the complete targeted test suite, type check, production build, production HTTP smoke checks, desktop/mobile UI checks and isolation audit. Capture actual screenshots within this directory. Write README and verification report with run instructions, service policies, architecture, command examples, attribution, methodology and limitations.

## Review focus

- A canceled or slow request must not overwrite the latest map/context state.
- Missing entities, malformed radii and invalid coordinates must not become valid map requests.
- A driving route must never be presented as a valid walking/cycling route.
- Search failures must not fabricate results or silently reset the map to Mumbai.
- Speech permission, no-speech and unsupported browser states must leave text commands usable.

## Progress ledger

- Isolation verified and clone attempt failed as described above. Standalone fallback selected.
- Ruling: no Git initialization, worktrees, commits or branches; the user requested an isolated directory and forbids Git changes. Any skill steps requiring Git operations are inapplicable.
- Ruling: implement inline with small targeted tests and one final review. No large planning/test framework or extra project.
- Foundation, command engine, GIS adapter, speech adapter, services and responsive UI implemented. All dependencies/caches/output remain project-local.
- Ruling: public Overpass was at capacity, so add an explicit category/radius-bounded Photon fallback inside the same POI service. This keeps the required real-data discovery usable without credentials; coverage can differ and both sources remain external dependencies. Fallback state is visible in results and command feedback.
- Independent review completed; inherited parser keys, malformed provider numbers and mobile feedback visibility fixed with regression/browser evidence. Speech timeout and exact-name geocoding ranking regressions also fixed.
- Verification: 77 targeted tests pass, type checking and production build pass. Live city search, 40 nearby cafes through the labeled fallback, OSRM driving route, markers, layers, emissions factor adjustment, help and mobile controls verified. See verification.md and artifacts/.
- No Git operations beyond the unsuccessful authorized clone attempt. Standalone directory remains without .git metadata.
