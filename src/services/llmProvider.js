/**
 * Provider-agnostic LLM client for an OpenAI-compatible Chat Completions API.
 *
 * The API key is only ever read from configuration (environment), never
 * hard-coded. Requests are time-bounded to avoid hanging connections.
 */

import config from '../config.js';

/**
 * Call the configured chat model.
 * @param {Array<{role:string, content:string}>} messages
 * @param {object} [opts]
 * @param {number} [opts.temperature=0.3]
 * @param {number} [opts.maxTokens=400]
 * @param {typeof fetch} [opts.fetchImpl] injectable for testing
 * @returns {Promise<string>} the assistant message content
 */
export async function chat(messages, opts = {}) {
  const { temperature = 0.3, maxTokens = 400, fetchImpl = globalThis.fetch } = opts;

  if (!config.llm.enabled) {
    throw new Error('LLM provider is not configured');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('No fetch implementation available');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.llm.timeoutMs);

  try {
    const res = await fetchImpl(`${config.llm.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.llm.apiKey}`,
      },
      body: JSON.stringify({
        model: config.llm.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`LLM request failed with status ${res.status}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('LLM response contained no content');
    }
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

export default { chat };
