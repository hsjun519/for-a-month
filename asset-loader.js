/* Static GitHub Pages loader: original paths stay stable; content hashes identify cached bytes. */
(() => {
  'use strict';
  const nativeFetch = window.fetch.bind(window);
  const base = new URL('.', location.href);
  const CACHE = 'for-a-month-assets-v1';
  let manifest, engine;
  const pending = new Map();
  const cacheWrites = new Map();
  const status = { done: false, error: '', paths: [], loaded: 0, total: 0, cached: false };
  const metrics = [];
  function diagnostics() {
    if (typeof document === 'undefined') return;
    let output = document.getElementById('fam-load-metrics');
    if (!output) {
      output = document.createElement('pre'); output.hidden = true; output.id = 'fam-load-metrics'; document.body.appendChild(output);
    }
    output.textContent = JSON.stringify({ metrics, status, resources: performance.getEntriesByType('resource').map(e => ({
      file: e.name.split('/').pop(), transferSize: e.transferSize, encodedBodySize: e.encodedBodySize,
      decodedBodySize: e.decodedBodySize, durationMs: Math.round(e.duration)
    })) });
  }
  async function cachedResponse(spec) {
    const url = new URL(spec.url, base).href;
    let cache;
    try {
      cache = await caches.open(CACHE);
      const hit = await cache.match(url);
      if (hit) { metrics.push({ file: spec.url, cache: true, networkBytes: 0 }); return hit; }
    } catch (_) { /* Private mode / quotas: play still works without durable caching. */ }
    const started = performance.now();
    const response = await nativeFetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`리소스 다운로드 실패 (${response.status}). 다시 시도해 주세요.`);
    if (cache) {
      cacheWrites.set(url,cache.put(url, response.clone()).catch(() => {}));
    }
    metrics.push({ file: spec.url, cache: false, milliseconds: performance.now() - started,
      encodedBytes: Number(response.headers.get('content-length')) || spec.gzip_bytes });
    return response;
  }
  async function decoded(name) {
    if (pending.has(name)) return pending.get(name);
    const task = (async () => {
      const spec = manifest.files[name];
      if (!spec) throw new Error(`리소스 목록 누락: ${name}`);
      if (typeof DecompressionStream === 'undefined') throw new Error('Chrome 또는 Edge 최신 버전에서 실행해 주세요.');
      const chunks = []; let length = 0;
      const parts = spec.parts || [spec];
      for (const part of parts) {
        const response = await cachedResponse(part);
        try {
          const reader = response.body.pipeThrough(new DecompressionStream('gzip')).getReader();
          let partLength = 0;
          while (true) {
            const item = await reader.read(); if (item.done) break;
            chunks.push(item.value); length += item.value.byteLength; partLength += item.value.byteLength;
            if (manifest.play.includes(name)) status.loaded = length;
          }
          if (partLength !== part.bytes) throw new Error('size mismatch');
        } catch (cause) {
          throw Object.assign(new Error('다운로드 파일을 읽지 못했습니다. 다시 시도해 주세요.'), { cause, corruptParts: [part] });
        }
      }
      if (length !== spec.bytes) throw new Error('다운로드가 중간에 끊겼습니다. 다시 시도해 주세요.');
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const actual = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      if (actual !== spec.sha256) {
        // A corrupt local cache is recoverable. Only remove the exact build-owned corrupted object.
        throw new Error('리소스 검증에 실패했습니다. 다시 시도해 주세요.');
      }
      return bytes;
    })();
    pending.set(name, task);
    try { return await task; }
    catch (error) {
      // Keep completed chunks on a network interruption; clear corrupt cached payloads.
      if (error.corruptParts || /검증|끊겼습니다|incorrect|invalid|decompress|compressed|gzip/i.test(error.message || '')) {
        try {
          const spec = manifest.files[name], cache = await caches.open(CACHE);
          for (const part of error.corruptParts || spec.parts || [spec]) {
            const url = new URL(part.url,base).href;
            await cacheWrites.get(url); await cache.delete(url);
          }
        } catch (_) {}
      }
      throw error;
    } finally { pending.delete(name); diagnostics(); }
  }
  window.FAMContent = {
    status, metrics,
    async initialize() {
      const response = await nativeFetch(new URL('assets-manifest.json', base), { cache: 'no-cache' });
      if (!response.ok) throw new Error('리소스 목록을 불러오지 못했습니다.');
      manifest = await response.json();
      if (manifest.schema !== 1 || manifest.release !== true) throw new Error('지원하지 않는 빌드입니다.');
      window.fetch = async function(input, options) {
        const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, base);
        const name = url.pathname.slice(base.pathname.length);
        if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || !manifest.files[name]) return nativeFetch(input, options);
        const bytes = await decoded(name);
        return new Response(bytes, { status: 200, headers: { 'Content-Type': manifest.files[name].mime, 'Content-Length': String(bytes.length) } });
      };
      return manifest;
    },
    attach(value) { engine = value; },
    ensurePlay() {
      if (status.done && !status.error) return;
      Object.assign(status, { done: false, error: '', paths: [], loaded: 0, total: manifest.files[manifest.play[0]].bytes });
      (async () => {
        try {
          const bytes = await decoded(manifest.play[0]);
          await engine.copyToFS('/' + manifest.play[0], bytes);
          status.paths = ['/' + manifest.play[0]];
        } catch (error) { status.error = error.message || String(error); }
        finally { status.done = true; diagnostics(); }
      })();
    }
  };
})();
