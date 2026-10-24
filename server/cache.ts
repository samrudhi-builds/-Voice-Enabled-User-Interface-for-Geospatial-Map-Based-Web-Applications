import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { ServiceError } from './data.js';
export type Cached<T> = { data: T; cached: boolean; fetchedAt: string };
type Entry = { data: unknown; expiresAt: number; fetchedAt: string };
export class RequestCache {
  private entries = new Map<string, Entry>();
  private pending = new Map<string, Promise<Cached<unknown>>>();
  private ready: Promise<void>;
  private saves = Promise.resolve();
  constructor(private file?: string) {
    this.ready = this.restore();
  }
  private async restore() {
    if (!this.file) return;
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8'));
      if (data.version === 1 && Array.isArray(data.entries)) for (const [key, value] of data.entries.slice(-250)) {
        if (typeof key === 'string' && value && typeof value.expiresAt === 'number' && value.expiresAt > Date.now() && typeof value.fetchedAt === 'string') this.entries.set(key, value);
      }
    } catch { /* A missing or corrupt cache is safe to replace with fresh provider results. */ }
  }
  async get<T>(key: string, ttl: number, load: () => Promise<T>): Promise<Cached<T>> {
    await this.ready;
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt > Date.now()) return { data: entry.data as T, fetchedAt: entry.fetchedAt, cached: true };
    const pending = this.pending.get(key);
    if (pending) return { ...await pending as Cached<T>, cached: true };
    const request = (async () => {
      const data = await load(), fetchedAt = new Date().toISOString();
      this.entries.delete(key);
      this.entries.set(key, { data, fetchedAt, expiresAt: Date.now() + ttl });
      while (this.entries.size > 250) this.entries.delete(this.entries.keys().next().value!);
      if (this.file) {
        const file = this.file, snapshot = JSON.stringify({ version: 1, entries: [...this.entries] });
        this.saves = this.saves.catch(() => {}).then(async () => {
          await mkdir(dirname(file), { recursive: true });
          await writeFile(`${file}.tmp`, snapshot, { mode: 0o600 }); await rename(`${file}.tmp`, file);
        });
        await this.saves.catch(() => { console.warn('GeoVoice: disk cache unavailable; using memory cache.'); });
      }
      return { data, fetchedAt, cached: false };
    })();
    this.pending.set(key, request);
    try { return await request; } finally { this.pending.delete(key); }
  }
}
export class SerialGate {
  private tail = Promise.resolve();
  private lastStarted = 0;
  private pending = 0;
  constructor(private spacingMs = 1100) {}
  async run<T>(load: () => Promise<T>): Promise<T> {
    if (this.pending >= 8) throw new ServiceError('The search queue is busy. Wait a moment and retry.', 429);
    this.pending++;
    const request = this.tail.then(async () => {
      const wait = this.spacingMs - (Date.now() - this.lastStarted);
      if (wait > 0) await delay(wait);
      this.lastStarted = Date.now(); return load();
    });
    this.tail = request.then(() => {}, () => {});
    try { return await request; } finally { this.pending--; }
  }
}
