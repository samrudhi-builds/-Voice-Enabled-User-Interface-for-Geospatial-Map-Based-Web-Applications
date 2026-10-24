import { afterEach, expect, it, vi } from 'vitest';
import { createSpeechAdapter } from '../src/voice/speechAdapter';
import type { Recognition, VoiceState } from '../src/voice/speechAdapter';

// The fake replaces only the external browser speech engine, not the adapter.
class FakeRecognition implements Recognition {
  static latest: FakeRecognition;
  constructor() { FakeRecognition.latest = this; }
  lang = ''; continuous = true; interimResults = false;
  onstart: Recognition['onstart'] = null; onend: Recognition['onend'] = null;
  onerror: Recognition['onerror'] = null; onresult: Recognition['onresult'] = null;
  start() { this.onstart?.(); }
  stop() { this.onend?.(); }
  abort() { this.onerror?.({ error: 'aborted' }); this.onend?.(); }
}
afterEach(() => vi.useRealTimers());
function setup(ctor: (new () => Recognition) | undefined = FakeRecognition) {
  const states: VoiceState[] = [], transcripts: string[] = [];
  const adapter = createSpeechAdapter({ onState: state => states.push(state), onTranscript: text => transcripts.push(text) }, ctor);
  return { adapter, states, transcripts };
}
it('keeps unsupported browsers usable with a typed-command explanation', () => {
  const states: VoiceState[] = [];
  const adapter = createSpeechAdapter({ onState: state => states.push(state), onTranscript: () => {} });
  adapter.start(); expect(adapter.supported).toBe(false); expect(states.at(-1)).toBe('unsupported');
});
it('preserves permission-denied and no-speech errors after the engine ends', () => {
  const h = setup(); h.adapter.start(); FakeRecognition.latest.onerror?.({ error: 'not-allowed' }); FakeRecognition.latest.onend?.();
  expect(h.states.at(-1)).toBe('permission-denied'); h.adapter.dispose();
});
it('delivers transcript text and releases listeners on dispose', () => {
  const h = setup(); h.adapter.start();
  FakeRecognition.latest.onresult?.({ results: { length: 1, 0: { isFinal: true, 0: { transcript: 'Zoom in' } } } });
  expect(h.transcripts).toEqual(['Zoom in']); expect(h.states.at(-1)).toBe('success');
  h.adapter.dispose(); expect(FakeRecognition.latest.onresult).toBeNull(); expect(FakeRecognition.latest.onerror).toBeNull();
});
it('submits a final transcript once, never interim speech or results after an error', () => {
  const submitted: string[] = [];
  const adapter = createSpeechAdapter({ onState: () => {}, onTranscript: () => {}, onFinalTranscript: text => submitted.push(text) }, FakeRecognition);
  adapter.start();
  const result = (isFinal: boolean) => ({ results: { length: 1, 0: { isFinal, 0: { transcript: 'zoom in to ahmedabad' } } } });
  FakeRecognition.latest.onresult?.(result(false));
  expect(submitted).toEqual([]);
  FakeRecognition.latest.onresult?.(result(true));
  FakeRecognition.latest.onresult?.(result(true));
  expect(submitted).toEqual(['zoom in to ahmedabad']);
  adapter.start();
  FakeRecognition.latest.onerror?.({ error: 'not-allowed' });
  FakeRecognition.latest.onresult?.(result(true));
  expect(submitted).toEqual(['zoom in to ahmedabad']);
  adapter.dispose();
});
it('keeps the timeout explanation after aborting the browser engine', () => {
  vi.useFakeTimers(); const h = setup(); h.adapter.start(); vi.advanceTimersByTime(20001);
  expect(h.states.at(-1)).toBe('no-speech'); h.adapter.dispose();
});
