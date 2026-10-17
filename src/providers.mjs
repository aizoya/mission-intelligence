export class ProviderError extends Error {
  constructor(message, retryable = false) { super(message); this.retryable = retryable; }
}

export async function requestJSON(url, options, fetcher = fetch) {
  let response;
  try { response = await fetcher(url, { ...options, signal: AbortSignal.timeout(60000) }); }
  catch { throw new ProviderError('Provider connection failed or timed out', true); }
  if (!response.ok) {
    // Do not log bodies: upstream errors may contain credentials or private prompts.
    throw new ProviderError(`Provider returned HTTP ${response.status}`, [408,429,500,502,503,504].includes(response.status));
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
  async preflight() {
    if (this.env.ALLOW_LIVE_CALLS !== 'true') throw new ProviderError('Live calls are disabled. Enable only within an approved credit budget.');
    if (!this.env.CRUSOE_API_KEY || !this.env.YOU_API_KEY) throw new ProviderError('Crusoe and You.com credentials are required on the server.');
    const result = await requestJSON('https://api.inference.crusoecloud.com/v1/models', {
      headers: { Authorization: `Bearer ${this.env.CRUSOE_API_KEY}` }
    }, this.fetcher);
    this.catalog = result.data;
    if (!Array.isArray(this.catalog)) throw new ProviderError('Unexpected Crusoe model catalog');
    for (const model of [this.model('coordinator'), this.model('researcher')]) {
      if (!this.catalog.some(x => x.id === model)) throw new ProviderError(`Configured model is not in the live catalog: ${model}`);
    }
  }
  model(role) {
    return role === 'researcher' ? (this.env.CRUSOE_WORKER_MODEL || this.env.CRUSOE_MODEL || 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B') : (this.env.CRUSOE_MODEL || 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B');
  }
  async reason(role, system, payload, { onUsage } = {}) {
    const model = this.model(role);
    const meta = this.catalog?.find(x => x.id === model);
    const body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(payload) }], max_tokens: 8192 };
    if (meta?.supported_parameters?.includes('response_format')) body.response_format = { type: 'json_object' };
    const result = await requestJSON('https://api.inference.crusoecloud.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${this.env.CRUSOE_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }, this.fetcher);
    if (onUsage) await onUsage(result.usage || {}, model);
    try {
      if (result.choices?.[0]?.finish_reason === 'length') throw new ProviderError('Model output truncated; saved evidence remains available. Narrow the scope before another run.');
      return { value: parseJSON(result.choices?.[0]?.message?.content), model, usage: result.usage || {} };
    } catch (error) {
      error.usageRecorded = !!onUsage;
      throw error;
    }
  }
  async search(query) {
    const result = await requestJSON('https://ydc-index.io/v1/search', {
      method: 'POST', headers: { 'X-API-Key': this.env.YOU_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, count: 5 })
    }, this.fetcher);
    if (!Array.isArray(result.results?.web)) throw new ProviderError('Unexpected You.com response schema');
    return result.results.web.map(x => ({ url: x.url, title: x.title || x.url,
      text: [x.description, ...(Array.isArray(x.snippets) ? x.snippets : [])].filter(x=>typeof x==='string').join('\n').slice(0,10000),
      published: x.page_age || null })).filter(x => /^https:\/\//.test(x.url));
  }
}
