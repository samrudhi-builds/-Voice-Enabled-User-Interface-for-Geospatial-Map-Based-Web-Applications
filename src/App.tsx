import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type L from 'leaflet';
import { ArrowDown, ArrowRight, AudioLines, Check, ChevronRight, CircleHelp, Coffee, Command as CommandIcon, CornerDownLeft, History, Layers, Leaf, LoaderCircle, MapPin, Menu, Mic, Minus, Navigation, Plus, RotateCcw, Route as RouteIcon, Search, Square, Terminal, X } from 'lucide-react';
import { parseCommand } from './commands/parseCommand';
import type { Command } from './commands/types';
import { executeCommand } from './commands/executeCommand';
import { createLeafletAdapter, MUMBAI } from './gis/leafletAdapter';
import { geographicServices } from './services/geographic';
import { browserRecognitionConstructor, createSpeechAdapter } from './voice/speechAdapter';
import type { SpeechAdapter, VoiceState } from './voice/speechAdapter';
import { MapView } from './components/MapView';
import { ContextPanel } from './components/ContextPanel';
import type { Context } from './components/ContextPanel';
import { HelpDialog, suggestions } from './components/HelpDialog';
import type { Basemap, Coordinates, HistoryEntry, Place, Poi, PoiSearch, Route, UserMarker } from './types';

export function App() {
  const map = useRef<L.Map | null>(null), commandInput = useRef<HTMLTextAreaElement>(null), activeRequest = useRef<AbortController | null>(null);
  const [ready, setReady] = useState(false), [input, setInput] = useState(''), [searchInput, setSearchInput] = useState('');
  const [markers, updateMarkers] = useState<UserMarker[]>([]), markersRef = useRef(markers);
  const [layer, updateLayer] = useState<Basemap>('street'), layerRef = useRef(layer);
  const [places, setPlaces] = useState<Place[]>([]), [poi, setPoi] = useState<PoiSearch | null>(null), [route, setRoute] = useState<Route | null>(null);
  const [context, setContext] = useState<Context>(null), [selectedId, setSelectedId] = useState<string | null>(null);
  const [position, setPosition] = useState({ lat: MUMBAI[0], lng: MUMBAI[1], zoom: 12 });
  const [locationName, setLocationName] = useState('Mumbai, India');
  const [history, setHistory] = useState<HistoryEntry[]>([]), [busy, setBusy] = useState(false), [feedback, setFeedback] = useState<{ kind: string; message: string }>({ kind: 'idle', message: 'Ready when you are. Type a command to begin.' });
  const [drawerOpen, setDrawerOpen] = useState(false), [helpOpen, setHelpOpen] = useState(false), [pinMode, setPinMode] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [section, setSection] = useState('explore'), [origin, setOrigin] = useState(''), [destination, setDestination] = useState('');
  const [voice, setVoice] = useState<{ state: VoiceState; message: string }>({ state: 'idle', message: 'Click the microphone to speak a command.' });
  const voiceAdapter = useRef<SpeechAdapter | null>(null), [voiceSupported, setVoiceSupported] = useState(false);
  const setMarkers = useCallback((next: UserMarker[]) => { markersRef.current = next; updateMarkers(next); }, []);
  const setLayer = useCallback((next: Basemap) => { layerRef.current = next; updateLayer(next); }, []);
  const gis = useMemo(() => createLeafletAdapter(() => map.current, {
    getMarkers: () => markersRef.current, setMarkers, getLayer: () => layerRef.current, setLayer,
    showLocations: values => { setPlaces(values); setPoi(null); setSelectedId(values[0]?.id || null); setLocationName(values[0]?.name || 'Map explorer'); setContext('search'); },
    showPOIs: value => { setPoi(value); setPlaces([]); setSelectedId(null); setLocationName(value.center.name); setContext('pois'); },
    showRoute: value => { setRoute(value); setPoi(null); setPlaces([]); setSelectedId(null); setLocationName(`${value.origin.name} → ${value.destination.name}`); setContext('route'); },
    clearRoute: () => { setRoute(null); setContext(current => current === 'route' ? null : current); },
    reset: () => { setMarkers([]); setPlaces([]); setPoi(null); setRoute(null); setLayer('street'); setSelectedId(null); setLocationName('Mumbai, India'); setContext(null); setPinMode(false); },
  }), [setMarkers, setLayer]);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const update = () => setIsMobile(query.matches);
    query.addEventListener('change', update); return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => { if (drawerOpen) commandInput.current?.focus(); }, [drawerOpen]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName) && !helpOpen) { event.preventDefault(); setDrawerOpen(true); commandInput.current?.focus(); }
      if (event.key === 'Escape' && !helpOpen) { setDrawerOpen(false); setPinMode(false); }
    };
    document.addEventListener('keydown', handle); return () => document.removeEventListener('keydown', handle);
  }, [helpOpen]);
  const onReady = useCallback((instance: L.Map) => { map.current = instance; setReady(true); }, []);
  const onPosition = useCallback((point: Coordinates, zoom: number) => setPosition({ ...point, zoom }), []);
  const runCommand = useCallback(async (text: string, supplied?: Command) => {
    activeRequest.current?.abort();
    const controller = new AbortController(); activeRequest.current = controller;
    const command = supplied || parseCommand(text), id = crypto.randomUUID();
    setInput(text); setBusy(true); setFeedback({ kind: 'processing', message: 'Working on your command…' });
    setHistory(current => [{ id, input: text || '(empty command)', intent: command.type, status: 'processing' as const, message: 'Processing', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...current].slice(0, 20));
    setDrawerOpen(false);
    const result = await executeCommand(command, gis, geographicServices, controller.signal);
    setHistory(current => current.map(entry => entry.id === id ? { ...entry, status: result.code === 'cancelled' ? 'cancelled' : result.ok ? 'success' : 'error', message: result.message } : entry));
    if (activeRequest.current !== controller) return;
    setBusy(false); setFeedback({ kind: result.ok ? 'success' : result.code === 'cancelled' ? 'idle' : 'error', message: result.message });
    activeRequest.current = null;
  }, [gis]);
  useEffect(() => {
    const adapter = createSpeechAdapter({
      onState: (state, message) => setVoice({ state, message }),
      onTranscript: setInput,
      onFinalTranscript: text => { void runCommand(text); },
    }, browserRecognitionConstructor());
    voiceAdapter.current = adapter; setVoiceSupported(adapter.supported);
    if (!adapter.supported) setVoice({ state: 'unsupported', message: 'Voice is unavailable in this browser. Text commands work in full.' });
    return () => { adapter.dispose(); activeRequest.current?.abort(); };
  }, [runCommand]);
  const stopCommand = () => { activeRequest.current?.abort(); };
  const togglePin = () => {
    activeRequest.current?.abort();
    setFeedback({ kind: 'idle', message: 'Enable the pin tool, then click the map to add a marker.' });
    setPinMode(current => !current);
  };
  const onMapClick = useCallback((point: Coordinates) => {
    if (!pinMode) return;
    const marker: UserMarker = { ...point, id: crypto.randomUUID(), name: `Map pin ${markersRef.current.length + 1}`, source: 'click' };
    setMarkers([...markersRef.current, marker]); setContext('markers'); setPinMode(false); setFeedback({ kind: 'success', message: `Marker added at ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}.` });
  }, [pinMode, setMarkers]);
  const focusPlace = (point: Place | Poi | UserMarker) => { setSelectedId(point.id); void Promise.resolve().then(() => gis.flyTo(point, 16)).catch(error => setFeedback({ kind: 'error', message: error instanceof Error ? error.message : 'Could not move the map. Please retry.' })); };
  const removeMarker = (id: string) => { gis.removeMarker(id); setFeedback({ kind: 'success', message: 'Marker removed.' }); };
  const listening = ['listening', 'requesting', 'processing'].includes(voice.state);
  const suggestionIcons: Record<string, typeof Navigation> = { navigation: Navigation, coffee: Coffee, pin: MapPin, leaf: Leaf, route: RouteIcon };
  const currentFeedback = feedback.kind === 'processing' ? 'Processing' : feedback.kind === 'error' ? 'Let’s try that again' : feedback.kind === 'success' ? 'Command completed' : 'Command center';

  return <div className="app-shell">
    {drawerOpen && <button className="drawer-backdrop" aria-label="Close command drawer" onClick={() => setDrawerOpen(false)} />}
    <aside className={`sidebar ${drawerOpen ? 'is-open' : ''}`} aria-label="GeoVoice command workspace" inert={isMobile && !drawerOpen}>
      <a href="/" className="brand"><span className="brand-icon"><AudioLines size={25} /></span><span>GeoVoice<small>THE WORLD, WITHIN REACH.</small></span><span className="version-tag">MVP</span></a>
      <button className="drawer-close icon-button" aria-label="Close command drawer" onClick={() => setDrawerOpen(false)}><X size={20} /></button>
      <nav className="workspace-nav" aria-label="Workspace sections">
        <button className={section === 'explore' ? 'active' : ''} onClick={() => { setSection('explore'); commandInput.current?.focus(); }}><Navigation size={16} /> Explore</button>
        <button className={section === 'route' ? 'active' : ''} onClick={() => setSection('route')}><RouteIcon size={16} /> Route</button>
        <button className={section === 'markers' ? 'active' : ''} onClick={() => { setSection('markers'); setContext('markers'); setDrawerOpen(false); }}><MapPin size={16} /> Pins{markers.length > 0 && <small>{markers.length}</small>}</button>
      </nav>
      <div className="sidebar-scroll">
        <section className="command-section">
          <div className="section-kicker"><span className="status-dot" /> YOUR VOICE. YOUR MAP.</div>
          <h1>{section === 'route' ? 'Every journey starts here.' : 'Where shall we go?'}</h1>
          <p className="sidebar-description">A natural way to explore your world.</p>
          {section === 'route' && <form className="route-form" onSubmit={e => { e.preventDefault(); void runCommand(`Plan route from ${origin} to ${destination}`, { type: 'PLAN_ROUTE', origin, destination }); }}>
            <label><span><i className="stop-dot start" /> Starting point</span><input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Gateway of India, Mumbai" required maxLength={200} /></label>
            <label><span><i className="stop-dot end" /> Destination</span><input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Marine Drive, Mumbai" required maxLength={200} /></label>
            <button className="route-submit" disabled={!ready || busy}><RouteIcon size={16} /> Find driving route<ArrowRight size={16} /></button><p className="small muted">Driving only · no live traffic</p>
          </form>}
          <form className="command-form" onSubmit={e => { e.preventDefault(); void runCommand(input); }}>
            <label htmlFor="command-input"><Terminal size={14} /> COMMAND INPUT<kbd>/</kbd></label>
            <textarea id="command-input" ref={commandInput} value={input} onChange={e => setInput(e.target.value)} maxLength={400} placeholder={'Try “Zoom to Ahmedabad”'} rows={2} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void runCommand(input); } }} />
            <div className="command-actions"><button type="button" className={`mic-button ${listening ? 'listening' : ''}`} aria-label={listening ? 'Stop listening' : voiceSupported ? 'Start voice input' : 'Voice unavailable in this browser'} aria-pressed={listening} onClick={() => { if (listening) voiceAdapter.current?.stop(); else voiceAdapter.current?.start(); }} title={voiceSupported ? 'Browser speech may use a remote service' : 'Type your command instead'}>{listening ? <Square size={16} /> : <Mic size={18} />}</button><button type="submit" className="run-button" disabled={!ready}>{busy ? <LoaderCircle className="spin" size={17} /> : <span>Run command</span>}{!busy && <CornerDownLeft size={17} />}</button></div>
          </form>
          <p className={`voice-note ${listening ? 'active' : ''}`} role="status">{listening ? <AudioLines size={13} /> : <Mic size={12} />}<span>{voice.message}</span></p>
          <p className="speech-disclosure">Browser speech may send audio to its recognition service.</p>
          <div className={`command-feedback ${feedback.kind}`} role="status" aria-live="polite"><span className="feedback-icon">{busy ? <LoaderCircle className="spin" size={15} /> : feedback.kind === 'success' ? <Check size={15} /> : <CommandIcon size={15} />}</span><div><strong>{currentFeedback}</strong><p>{feedback.message}</p></div>{busy && <button className="cancel-button" onClick={stopCommand} aria-label="Cancel command"><X size={15} /></button>}</div>
        </section>
        <section className="suggestions-section"><div className="side-section-title"><span>TRY A LITTLE EXPLORING</span><ArrowDown size={12} /></div><div className="suggestions">{suggestions.map(({ text, hint, icon }) => { const Icon = suggestionIcons[icon]; return <button key={text} onClick={() => void runCommand(text)} disabled={!ready}><span className={`suggestion-icon ${icon}`}><Icon size={17} /></span><span><small>{hint}</small><strong>{text}</strong></span><ChevronRight size={14} /></button>; })}</div></section>
        <section className="history-section"><div className="side-section-title"><span><History size={13} /> RECENT COMMANDS</span><span>{history.length ? `${history.length} / 20` : '—'}</span></div>{!history.length ? <p className="history-empty">Your next discovery starts with a command.</p> : <ol className="history-list">{history.slice(0, 5).map(entry => <li key={entry.id}><button onClick={() => void runCommand(entry.input)} title={entry.message}><i className={`history-dot ${entry.status}`} /><span><strong>{entry.input}</strong><small>{entry.intent.replaceAll('_', ' ')} · {entry.status}</small></span><time>{entry.time}</time></button></li>)}</ol>}</section>
      </div>
      <footer className="sidebar-footer"><span className="footer-symbol">✳</span><p>A concept by <strong>Astro Hack Squad</strong><br /><span>2024 ISRO hackathon · independent MVP revival</span></p><button className="icon-button" aria-label="Open help" onClick={() => setHelpOpen(true)}><CircleHelp size={18} /></button></footer>
    </aside>
    <main className="main-workspace" id="map-workspace" inert={isMobile && drawerOpen}>
      <header className="topbar"><div className="workspace-heading"><button className="mobile-menu icon-button" aria-label="Open command drawer" onClick={() => setDrawerOpen(true)}><Menu size={21} /></button><div><div className="breadcrumb">WORKSPACE <ChevronRight size={11} /> EXPLORER</div><h2>Map explorer<span className="heading-dot">.</span></h2></div></div>
        <form className="location-search" onSubmit={e => { e.preventDefault(); void runCommand(`Find ${searchInput}`); }}><Search size={17} /><input aria-label="Search a location" placeholder="Search a place…" value={searchInput} onChange={e => setSearchInput(e.target.value)} required maxLength={200} /><button aria-label="Search location" disabled={!ready}><ArrowRight size={16} /></button></form>
        <div className="topbar-actions"><span className="public-data-pill"><span className="status-dot" /> PUBLIC MAP DATA</span><button className="help-button" onClick={() => setHelpOpen(true)}><CircleHelp size={17} /><span>Quick guide</span></button></div>
      </header>
      <section className={`map-workspace ${pinMode ? 'pin-mode' : ''} ${context ? 'has-context' : ''}`} aria-label="Geographic exploration workspace">
        <MapView layer={layer} markers={markers} places={places} poi={poi} route={route} selectedId={selectedId} onReady={onReady} onPosition={onPosition} onMapClick={onMapClick} onRemove={removeMarker} />
        <div className="map-location"><span className="location-compass"><Navigation size={21} /></span><div><span className="eyebrow">{route && context === 'route' ? 'YOUR JOURNEY' : 'EXPLORING'}</span><strong>{locationName}</strong></div></div>
        <div className="layer-switcher" role="group" aria-label="Basemap"><Layers size={16} /><button aria-pressed={layer === 'street'} className={layer === 'street' ? 'active' : ''} onClick={() => void runCommand('Show street map')}>Street</button><button aria-pressed={layer === 'topographic'} className={layer === 'topographic' ? 'active' : ''} onClick={() => void runCommand('Show topographic map')}>Topographic</button></div>
        <ContextPanel context={context} places={places} poi={poi} route={route} markers={markers} selectedId={selectedId} onClose={() => setContext(null)} onFocus={focusPlace} onRemoveMarker={removeMarker} onClearRoute={() => void runCommand('Clear route')} />
        {!context && <div className="map-welcome"><span className="welcome-mark"><Navigation size={22} /></span><span className="eyebrow">FOLLOW YOUR CURIOSITY</span><h2>The world is a<br />conversation away.</h2><p>Try a place, a nearby café, or a new way home. Your map is listening when you are.</p><button onClick={() => { setDrawerOpen(true); commandInput.current?.focus(); }}>Make your first move <ArrowUpIcon /></button></div>}
        <div className="map-tool-stack"><button className={pinMode ? 'active' : ''} aria-label={pinMode ? 'Cancel adding map marker' : 'Add marker by clicking map'} aria-pressed={pinMode} onClick={togglePin}><MapPin size={19} /></button><div className="zoom-tools"><button aria-label="Zoom in" onClick={() => void runCommand('Zoom in')}><Plus size={20} /></button><button aria-label="Zoom out" onClick={() => void runCommand('Zoom out')}><Minus size={20} /></button></div><button aria-label="Reset map to Mumbai" onClick={() => void runCommand('Reset map')}><RotateCcw size={18} /></button></div>
        <div className="map-coordinate-strip"><span className="status-dot" /><span>{Math.abs(position.lat).toFixed(4)}° {position.lat >= 0 ? 'N' : 'S'} &nbsp; {Math.abs(position.lng).toFixed(4)}° {position.lng >= 0 ? 'E' : 'W'}</span><span className="coordinate-divider" /><span>ZOOM {position.zoom}</span></div>
        {pinMode && <div className="pin-instruction" role="status"><MapPin size={16} /> Click the map to add a marker.<button aria-label="Cancel pin placement" onClick={() => setPinMode(false)}><X size={15} /></button></div>}
        <div className="mobile-command-bar"><button onClick={() => { setDrawerOpen(true); commandInput.current?.focus(); }}><Terminal size={17} /><span>Where shall we go?</span><Mic size={17} /></button></div>
        {isMobile && feedback.kind !== 'idle' && <div className={`mobile-feedback ${feedback.kind}`} role="status" aria-live="polite"><span>{busy ? <LoaderCircle className="spin" size={15} /> : feedback.kind === 'error' ? <CircleHelp size={15} /> : <Check size={15} />}</span><p>{feedback.message}</p><button aria-label={busy ? 'Cancel command' : 'Dismiss command feedback'} onClick={busy ? stopCommand : () => setFeedback({ kind: 'idle', message: 'Ready when you are. Type a command to begin.' })}><X size={16} /></button></div>}
      </section>
      <footer className="workspace-footer"><span><span className="status-dot" /> {busy ? 'Resolving your command…' : 'Ready to explore'}</span><span>Map data © OpenStreetMap contributors <i>•</i> GeoVoice MVP</span></footer>
    </main>
    <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} onExample={command => void runCommand(command)} />
  </div>;
}
function ArrowUpIcon() { return <ArrowRight size={16} style={{ transform: 'rotate(-35deg)' }} />; }
