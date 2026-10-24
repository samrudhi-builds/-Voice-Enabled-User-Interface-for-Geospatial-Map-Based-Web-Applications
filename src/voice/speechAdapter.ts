export type VoiceState = 'idle' | 'requesting' | 'listening' | 'processing' | 'success' | 'unsupported' | 'permission-denied' | 'no-speech' | 'unavailable' | 'error';
type SpeechResult = { isFinal: boolean; [index: number]: { transcript: string } };
export interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null; onend: (() => void) | null;
  onresult: ((event: { results: { length: number; [index: number]: SpeechResult } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void; stop(): void; abort(): void;
}
export interface SpeechAdapter {
  supported: boolean;
  start(): void;
  stop(): void;
  dispose(): void;
}
export function createSpeechAdapter(callbacks: { onState(state: VoiceState, message: string): void; onTranscript(text: string): void; onFinalTranscript?(text: string): void }, Constructor?: new () => Recognition): SpeechAdapter {
  let recognition: Recognition | null = null, timer: ReturnType<typeof setTimeout> | undefined;
  const finish = () => { clearTimeout(timer); timer = undefined; };
  const dispose = () => {
    finish();
    if (recognition) { recognition.onstart = recognition.onend = recognition.onresult = recognition.onerror = null; recognition.abort(); recognition = null; }
  };
  return {
    supported: !!Constructor,
    start() {
      if (!Constructor) { callbacks.onState('unsupported', 'Voice is not supported in this browser. Type any command below.'); return; }
      dispose();
      const instance = new Constructor(); recognition = instance;
      instance.lang = 'en-IN'; instance.continuous = false; instance.interimResults = true;
      let received = false, failed = false;
      instance.onstart = () => callbacks.onState('listening', 'Listening… speak one map command.');
      instance.onresult = event => {
        if (received || failed || !event.results.length) return;
        const results = Array.from({ length: event.results.length }, (_, index) => event.results[index]);
        const transcript = results.map(result => result[0].transcript).join(' ').trim();
        callbacks.onTranscript(transcript);
        if (results.every(result => result.isFinal)) {
          received = !!transcript; finish();
          callbacks.onState(received ? 'success' : 'no-speech', received ? 'Speech recognized. Transcript sent to the command handler.' : 'No speech detected. Try again or type a command.');
          if (received) callbacks.onFinalTranscript?.(transcript);
          try { instance.stop(); } catch { dispose(); }
        }
      };
      instance.onerror = event => {
        if (received || failed) return;
        failed = true; finish();
        const messages: Record<string, [VoiceState, string]> = {
          'not-allowed': ['permission-denied', 'Microphone permission denied. Allow it in browser settings, or type your command.'],
          'service-not-allowed': ['unavailable', 'This browser’s speech service is unavailable. Type your command instead.'],
          'audio-capture': ['unavailable', 'No microphone is available. Connect one or type your command.'],
          'no-speech': ['no-speech', 'No speech detected. Try again or type your command.'],
          network: ['unavailable', 'The speech service could not connect. Type your command instead.'],
          aborted: ['idle', 'Listening stopped. You can type or try again.'],
        };
        callbacks.onState(...(messages[event.error] || ['error', 'Speech recognition failed. Retry or type your command.']));
      };
      instance.onend = () => { finish(); if (!received && !failed) callbacks.onState('no-speech', 'No speech detected. Try again or type your command.'); };
      callbacks.onState('requesting', 'Waiting for microphone permission…');
      try {
        instance.start();
        timer = setTimeout(() => { failed = true; callbacks.onState('no-speech', 'Listening timed out. Try again or type your command.'); instance.abort(); finish(); }, 20000);
      } catch { failed = true; callbacks.onState('unavailable', 'Could not start the speech service. Type your command instead.'); dispose(); }
    },
    stop() { if (recognition) { callbacks.onState('processing', 'Finishing transcription…'); try { recognition.stop(); } catch { dispose(); callbacks.onState('idle', 'Listening stopped.'); } } },
    dispose,
  };
}
export function browserRecognitionConstructor(): (new () => Recognition) | undefined {
  const speechWindow = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
}
