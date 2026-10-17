export class ProviderError extends Error {
  constructor(message, retryable = false) { super(message); this.retryable = retryable; }
}

export async function requestJSON(url, options, fetcher = fetch, context = {}) {
  let response;
  try { response = await fetcher(url, { ...options, signal: AbortSignal.timeout(60000) }); }
  catch {
    const error = new ProviderError('Provider connection failed or timed out', true);
    error.diagnostic = { provider:context.provider, operation:context.operation, model:context.model, role:context.role, outcome:'connection_failed' };
    throw error;
  }
  // Only retain numeric quota headers, never response bodies or arbitrary headers.
  const rateLimits = {};
  for (const name of ['x-ratelimit-limit-tokens','x-ratelimit-remaining-tokens','x-ratelimit-limit-requests','x-ratelimit-remaining-requests']) {
    const raw = response.headers?.get(name);
    if (typeof raw === 'string' && /^\d{1,15}$/.test(raw)) rateLimits[name] = Number(raw);
  }
  const diagnostic = { provider:context.provider, operation:context.operation, model:context.model, role:context.role, status:response.status || 200, rateLimits };
  if (context.onResponse) await context.onResponse(diagnostic);
  if (!response.ok) {
    // Do not log bodies: upstream errors may contain credentials or private prompts.
    const error = new ProviderError(`Provider returned HTTP ${response.status}`, [408,500,502,503,504].includes(response.status));
    error.status = response.status;
    error.diagnostic = diagnostic;
    if (response.status === 429) {
      const header = response.headers?.get('retry-after');
      const seconds = header == null || header.trim() === '' ? NaN : Number(header);
      const date = header ? Date.parse(header) : NaN;
      const numericDeadline = Date.now() + seconds * 1000;
      const deadline = Number.isFinite(seconds) && seconds >= 0 && numericDeadline <= 8.64e15 ? numericDeadline : (Number.isFinite(date) ? date : 0);
      error.retryAt = new Date(Math.max(Date.now() + 60000, deadline)).toISOString();
    }
    throw error;
  }
  try { return await response.json(); }
  catch { throw new ProviderError('Provider returned invalid JSON', true); }
}

export function parseJSON(text) {
  if (typeof text !== 'string') throw new ProviderError('Missing model answer');
  const clean = text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
  try { return JSON.parse(clean); }
  catch { throw new ProviderError('Model answer did not match JSON contract', true); }
}

export class LiveProviders {
  constructor(env = process.env, fetcher = fetch) {
    this.env = env;
    this.fetcher = fetcher;
    this.label = 'live';
    this.catalog = null;
  }
  async preflight({ onResponse } = {}) {
    if (this.env.ALLOW_LIVE_CALLS !== 'true') throw new ProviderError('Live calls are disabled. Enable only within an approved credit budget.');
    if (!this.env.CRUSOE_API_KEY || !this.env.YOU_API_KEY) throw new ProviderError('Crusoe and You.com credentials are required on the server.');
    const result = await requestJSON('https://api.inference.crusoecloud.com/v1/models', {
      headers: { Authorization: `Bearer ${this.env.CRUSOE_API_KEY}` }
    }, this.fetcher, { provider:'Crusoe', operation:'catalog', onResponse });
    this.catalog = result.data;
    if (!Array.isArray(this.catalog)) throw new ProviderError('Unexpected Crusoe model catalog');
    for (const model of [this.model('coordinator'), this.model('researcher')]) {
      if (!this.catalog.some(x => x.id === model)) throw new ProviderError(`Configured model is not in the live catalog: ${model}`);
    }
  }
  model(role) {
    return role === 'researcher' ? (this.env.CRUSOE_WORKER_MODEL || this.env.CRUSOE_MODEL || 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B') : (this.env.CRUSOE_MODEL || 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B');
  }
  async reason(role, system, payload, { onUsage, onResponse } = {}) {
    const model = this.model(role);
    const meta = this.catalog?.find(x => x.id === model);
    const body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(payload) }], max_tokens: 8192 };
    if (meta?.supported_parameters?.includes('response_format')) body.response_format = { type: 'json_object' };
    const result = await requestJSON('https://api.inference.crusoecloud.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${this.env.CRUSOE_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }, this.fetcher, { provider:'Crusoe', operation:'reason', role, model, onResponse });
    if (onUsage) await onUsage(result.usage || {}, model);
    try {
      if (result.choices?.[0]?.finish_reason === 'length') throw new ProviderError('Model output truncated; saved evidence remains available. Narrow the scope before another run.');
      return { value: parseJSON(result.choices?.[0]?.message?.content), model, usage: result.usage || {} };
    } catch (error) {
      error.usageRecorded = !!onUsage;
      throw error;
    }
  }
  async search(query, { onResponse } = {}) {
    const result = await requestJSON('https://ydc-index.io/v1/search', {
      method: 'POST', headers: { 'X-API-Key': this.env.YOU_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, count: 5 })
    }, this.fetcher, { provider:'You.com', operation:'search', onResponse });
    if (!Array.isArray(result.results?.web)) throw new ProviderError('Unexpected You.com response schema');
    return result.results.web.map(x => ({ url: x.url, title: x.title || x.url,
      text: [x.description, ...(Array.isArray(x.snippets) ? x.snippets : [])].filter(x=>typeof x==='string').join('\n').slice(0,10000),
      published: x.page_age || null })).filter(x => /^https:\/\//.test(x.url));
  }
}
