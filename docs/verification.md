# GeoVoice verification

Verified on **21 October 2026**, in the user-approved persistent directory `/home/thewitch/geovoice-mvp-samrudhi`.

## Isolation and repository outcome

Before any project files were created, the destination was absent, was not a symlink, and neither `/home/thewitch` nor any ancestor contained `.git` metadata. The user explicitly approved this destination and implementation. The supplied GitHub SSH URL returned “Repository not found”; its HTTPS page returned 404. The user had authorized building in a standalone folder if cloning failed. No Git repository was initialized, and no branch, commit, push, remote modification or operation on an existing project was performed.

Code, documentation, configuration, lockfile, `node_modules`, npm cache, service cache, temporary/compile files, screenshots, logs and build output are inside this directory. Source PDFs and the supplied specification were read as references. Their embedded sample code and operational instructions did not override the user's isolation rules.

## Automated checks actually executed

| Check | Result | Evidence |
| --- | --- | --- |
| Local dependency installation | Passed | `package-lock.json`, local `node_modules/`, `.cache/npm/` |
| `npm test -- --reporter=dot` | **77 passed, 6 files** | `artifacts/test-results.txt` |
| `npm run typecheck` | Passed | `artifacts/typecheck.txt` |
| `npm run build` | Passed | `artifacts/build.txt`, `dist/` |
| Production HTTP/static server | Passed | `/api/health` and `/` returned 200 |
| API validation / unsupported paths | Passed | 400 for blank location, invalid coordinates, excessive radius and missing route fields; 404 for unknown API/static asset; 405 for POST on GET-only API |
| Literal coordinates and location caching | Passed | Literal coordinates returned `Coordinates`; Ahmedabad resolved to the city and repeated query reported a cache hit |
| Live bounded POI query | Passed through explicit Photon fallback | 40 cafes within 3 km of Marine Drive; examples and provider recorded in `artifacts/http-smoke.json` |

Targeted tests cover arbitrary/Unicode names, normalization, valid command grammar, unknown and incomplete commands, reserved object property names, radius bounds, configurable emissions arithmetic, invalid numerical data, route coordinate order, malformed/no-route responses, POI normalization and distance filtering, aborted lookups, provider failures, cache coalescing and request spacing, and browser speech adapter states/cleanup. An HTTP integration test forces an external Overpass failure and checks the actual API's normalized Photon fallback response. External test doubles exist only in tests and do not provide demo results in the application.

The parser and numeric validation tests were observed failing before their fixes; the suite then passed. The speech timeout regression was likewise observed failing before fixing the aborted-event state override. Core command/data/cache tests were built from initially failing implementations.

## Browser checks actually executed

The production app was opened at `http://127.0.0.1:4173` in the Codex in-app browser. Desktop testing used 1280×800 and mobile testing used 390×844. Temporary viewport overrides are reset after testing.

| Feature | Observed behavior |
| --- | --- |
| Initial map and attribution | Real OSM tiles, Mumbai at zoom 12, visible provider attribution |
| Zoom and location navigation | Actual map zoom changed; `Zoom to Ahmedabad` selected Ahmedabad city; explicit search for Pune updated the map |
| Basemap switching | Street and real OpenTopoMap tiles both rendered; topographic attribution and CC-BY-SA link were visible. Topographic tiles needed a short loading period |
| Named marker | `Add marker at Gateway of India` created a real geocoded marker and the Pins panel showed its coordinates/source |
| Individual marker removal | Remove control removed the Gateway marker and showed an empty marker state |
| Map-click marker | Pin tool + map click created `Map pin 1` with click coordinates and source |
| Marker commands | `Remove marker` left zero user pins; adding two coordinate markers and `Clear markers` changed the count from two to zero |
| Nearby search and selection | 40 real cafes rendered with markers, distances, addresses where available, source and fallback notice; selecting Kyani & Co. focused/highlighted the result |
| Routing | Gateway of India → Marine Drive produced an actual OSRM driving polyline, approximately 3.7 km and 5 min, with both endpoints visible beside the desktop panel |
| Emissions | Default comparison showed approximately 0.63 kg for car and 0.36 kg for bus; changing the car factor to 0.2 changed its result to approximately 0.74 kg. The default factor was restored |
| Clear/reset | Clear route removed route context; Reset returned the map to Mumbai, zoom 12, with route/results/pins cleared |
| Mobile | Map stayed primary; drawer, route sheet, controls and command bar worked. The closed drawer is inert. Unknown-command and connection errors remained visible with the drawer closed |
| Help/keyboard | Quick guide opened as a modal; Escape closed it. Command entry and submission worked through the keyboard |

Screenshots are actual rendered captures:

- `artifacts/desktop-route.png`: live driving route with distance and illustrative emissions comparison.
- `artifacts/desktop-poi.png`: real nearby results and explicit fallback attribution.
- `artifacts/mobile-route.png`: mobile map, route and results sheet.

## Review and fixes

An independent read-only code review found no Critical issues and three Important findings: inherited object keys could bypass parsing, malformed provider numbers could become zero coordinates, and mobile feedback was hidden when the drawer closed. All three were fixed. Parser/data regressions passed after being observed failing, and mobile feedback was then verified in the browser. Minor wording/context labels were also corrected.

The subsequent fallback integration was verified with a targeted HTTP test, the full suite, type checking, production build and actual live Photon responses through the running application.

## Provider and device limitations

- **Overpass primary:** observed capacity errors; Kumi/Private.coffee requests timed out from this machine. The app preserves this information and uses a prominently labeled live/cached Photon fallback. The original primary provider's successful live response is not claimed.
- **Speech:** the browser exposed a microphone control and recognition adapter. Unsupported browser, denied permission, no-speech timeout, transcript delivery and listener cleanup were tested with a simulated browser recognition engine. **Recognition with real microphone audio was not tested.** Text commands were verified independently. Browser speech may use remote processing.
- **Routes and carbon:** driving geometry only; no live traffic or verified alternative-mode routes/transit availability. Emissions factors are explicitly illustrative and user-adjustable, not measured or locally calibrated.
- **Session:** map state, pins and history reset on reload. This is a persistent project directory, not persistent user-account storage.
- **Excluded:** highway overlay, satellite imagery, on-device models, advanced optimization, accounts, deployment and package publication were not implemented or claimed.

During final checks the tool-managed preview process stopped without a JavaScript error; the app displayed a readable connection error. It was restarted as a detached local production process, then mobile routing was rechecked successfully. The session preview's PID is recorded in `.cache/preview.pid` and its log is `artifacts/preview.log`. Only one server should occupy port 4173; use another `PORT` when running a second instance.

The highest-value future work is a real-device speech compatibility check, an on-device speech adapter, and a reliable hosted geographic provider if the demo needs public or heavier usage.

## Minimal speech/parser bug-fix pass — 21 October 2026

The parser now accepts `zoom in to Ahmedabad` and `zoom into Ahmedabad`, alongside the existing `zoom to Ahmedabad` and `go to Ahmedabad`. Final browser transcripts submit once through the same `runCommand` → parser → executor path as typed input. Interim, duplicate final and post-error results do not submit commands. The previous review-and-submit-only speech behavior has been replaced; the help text and README describe final-transcript execution.

Animated navigation and zoom commands now wait for Leaflet's `moveend` before reporting success. Aborts and movement failures produce cancellation/error results; an interrupted movement cannot leave processing pending indefinitely. Map completion here means the view movement has ended, not that all third-party tiles have downloaded.

- `npm test`: **86 tests passed in 6 files**. Targeted regressions were observed failing before their fixes for both new zoom phrases, final-transcript submission, and premature map success. Additional checks cover incomplete phrases, failed/cancelled movement, existing speech permission feedback and timeout handling.
- `npm run build`: includes TypeScript checking and the production Vite build.
- **Actual map execution verified:** all four requested phrases ran in the local production page and showed Ahmedabad at approximately 23.0215° N, 72.5801° E. Zoom commands reached level 14; `go to` preserved the current zoom. The page showed processing during movement and success after it completed. Existing zoom-in/out controls were also exercised successfully.
- **Actual microphone startup/error feedback verified:** clicking the microphone reached “Listening…”, then displayed “The speech service could not connect. Type your command instead.” The browser recognition engine emitted a connection failure. No browser or network configuration was changed.
- **Real-audio transcription and spoken-command map execution remain unverified:** the recognition service connection failure prevented a real final transcript. Simulated recognition events verify final-transcript delivery, once-only submission, interim suppression and permission-error handling; they are not evidence of successful microphone transcription.

All edits and generated files remain in `/home/thewitch/geovoice-mvp-samrudhi`. No Git repository, branches, commits or pushes were created.
