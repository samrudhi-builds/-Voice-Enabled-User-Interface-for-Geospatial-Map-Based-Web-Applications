import { expect, it } from 'vitest';
import { RequestCache, SerialGate } from '../server/cache';

it('coalesces duplicate requests and caches completed results', async () => {
  const cache = new RequestCache(); let calls = 0;
  const load = async () => { calls++; await new Promise(r => setTimeout(r, 5)); return ['real result']; };
  const [a, b] = await Promise.all([cache.get('same', 10000, load), cache.get('same', 10000, load)]);
  await cache.get('same', 10000, load);
  expect(a.data).toEqual(['real result']); expect(b.data).toEqual(['real result']); expect(calls).toBe(1);
});
it('does not cache provider failures', async () => {
  const cache = new RequestCache();
  await expect(cache.get('x', 10000, async () => { throw new Error('offline'); })).rejects.toThrow('offline');
  expect((await cache.get('x', 10000, async () => 'recovered')).data).toBe('recovered');
});
it('serializes provider requests with spacing between start times', async () => {
  const gate = new SerialGate(40), starts: number[] = [];
  const task = () => gate.run(async () => { starts.push(Date.now()); return true; });
  await Promise.all([task(), task(), task()]);
  expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(35);
  expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(35);
});
