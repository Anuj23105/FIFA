import { describe, it, expect, vi } from 'vitest';
import { answer, buildContext, composeGroundedAnswer } from '../src/services/aiService.js';

describe('buildContext', () => {
  it('includes venue and knowledge grounding when both match', () => {
    const ctx = buildContext('accessible seating at SoFi Stadium');
    expect(ctx.venue?.id).toBe('sofi');
    expect(ctx.sources.some((s) => s.startsWith('venue:'))).toBe(true);
    expect(ctx.sources.some((s) => s.startsWith('kb:'))).toBe(true);
    expect(ctx.contextText).toMatch(/SoFi/);
  });

  it('works with only knowledge (no venue mentioned)', () => {
    const ctx = buildContext('how do I recycle');
    expect(ctx.venue).toBeNull();
    expect(ctx.retrieved.length).toBeGreaterThan(0);
  });
});

describe('composeGroundedAnswer', () => {
  it('produces a grounded, non-empty reply', () => {
    const ctx = buildContext('accessibility at MetLife Stadium');
    const reply = composeGroundedAnswer({
      message: 'accessibility at MetLife Stadium',
      intent: 'accessibility',
      language: 'en',
      context: ctx,
    });
    expect(reply).toMatch(/MetLife/);
    expect(reply.length).toBeGreaterThan(20);
  });
});

describe('answer (grounded path, no LLM configured)', () => {
  it('rejects empty messages with a coded error', async () => {
    await expect(answer('   ')).rejects.toMatchObject({ code: 'EMPTY_MESSAGE' });
  });

  it('answers a transport query and reports metadata', async () => {
    const res = await answer('how do I get to Estadio Azteca by metro');
    expect(res.intent).toBe('transport');
    expect(res.venue?.id).toBe('azteca');
    expect(res.generator).toBe('grounded');
    expect(res.reply.length).toBeGreaterThan(0);
    expect(res.sources.length).toBeGreaterThan(0);
  });

  it('detects language for a Spanish query', async () => {
    const res = await answer('¿dónde puedo reciclar en el estadio?');
    expect(res.language).toBe('es');
  });
});

describe('answer (LLM path via injected fetch)', () => {
  it('uses the model response when the provider is configured', async () => {
    // Configure the LLM at runtime for this test only.
    const config = (await import('../src/config.js')).default;
    const original = config.llm.apiKey;
    config.llm.apiKey = 'test-key';

    const fakeFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Take the Tren Ligero to Estadio Azteca station.' } }],
      }),
    }));

    try {
      const res = await answer('how do I reach Estadio Azteca', { fetchImpl: fakeFetch });
      expect(fakeFetch).toHaveBeenCalledOnce();
      expect(res.generator).toBe('llm');
      expect(res.reply).toMatch(/Tren Ligero/);
    } finally {
      config.llm.apiKey = original;
    }
  });

  it('falls back gracefully when the model call fails', async () => {
    const config = (await import('../src/config.js')).default;
    const original = config.llm.apiKey;
    config.llm.apiKey = 'test-key';

    const failingFetch = vi.fn(async () => ({ ok: false, status: 500 }));

    try {
      const res = await answer('accessibility at MetLife Stadium', { fetchImpl: failingFetch });
      expect(res.generator).toBe('grounded-fallback');
      expect(res.reply).toMatch(/MetLife/);
    } finally {
      config.llm.apiKey = original;
    }
  });
});
