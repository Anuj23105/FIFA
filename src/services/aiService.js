/**
 * The GenAI core: retrieval-augmented generation (RAG).
 *
 * 1. Detect language and classify intent.
 * 2. Retrieve grounding documents from the knowledge base plus venue data.
 * 3. Either call the configured LLM with the retrieved context, or fall back
 *    to a deterministic grounded composer when no model is configured.
 *
 * The fallback keeps the product fully functional, testable, and free of
 * external dependencies, while the LLM path adds fluent, conversational
 * responses when an API key is provided.
 */

import config from '../config.js';
import { classifyIntent } from './intent.js';
import { detectLanguage, phrase } from './translate.js';
import { retrieve } from '../data/knowledge.js';
import { findVenue } from '../data/venues.js';
import { chat } from './llmProvider.js';

const SYSTEM_PROMPT =
  'You are PitchPal, the official assistant for the FIFA World Cup 2026. ' +
  'Help fans, staff, and volunteers with navigation, transport, accessibility, ' +
  'crowd levels, sustainability, and safety. Answer concisely and only use the ' +
  'CONTEXT provided. If the context does not cover the question, say so and ' +
  'suggest asking a Guest Services desk. Reply in the same language as the user.';

/**
 * Build the grounding context block from retrieval + venue data.
 * @param {string} message
 * @returns {{contextText: string, sources: string[], venue: object|null, retrieved: object[]}}
 */
export function buildContext(message) {
  const retrieved = retrieve(message, 3);
  const venue = findVenue(message);

  const parts = [];
  const sources = [];

  if (venue) {
    parts.push(
      `Venue ${venue.name} (${venue.city}, ${venue.country}), capacity ${venue.capacity}, role: ${venue.role}.`,
      `Transit: ${venue.transit.join('; ')}.`,
      `Accessibility: ${venue.accessibility.join('; ')}.`,
      `Parking: ${venue.parking.join('; ')}.`,
    );
    sources.push(`venue:${venue.id}`);
  }

  for (const { doc } of retrieved) {
    parts.push(doc.text);
    sources.push(`kb:${doc.id}`);
  }

  return { contextText: parts.join('\n'), sources, venue, retrieved };
}

/**
 * Deterministic, grounded response composer used when no LLM is configured.
 * @param {object} params
 * @returns {string}
 */
export function composeGroundedAnswer({ message, intent, language, context }) {
  const lines = [];

  if (context.venue) {
    lines.push(`${phrase('atVenue', language)} ${context.venue.name}:`);
  }

  if (context.retrieved.length > 0) {
    lines.push(context.retrieved[0].doc.text);
  } else if (context.venue) {
    // Venue found but no KB doc matched: surface the most relevant facet.
    lines.push(`Transit options: ${context.venue.transit.join('; ')}.`);
  } else {
    lines.push(
      "I can help with navigation, transport, accessibility, crowd levels, sustainability, safety, and tickets. " +
        'Could you tell me which stadium you are heading to?',
    );
  }

  // Intent-specific enrichment from venue data.
  if (context.venue) {
    if (intent === 'accessibility') {
      lines.push(`Accessibility: ${context.venue.accessibility.join('; ')}.`);
    } else if (intent === 'transport') {
      lines.push(`Transit: ${context.venue.transit.join('; ')}.`);
    } else if (intent === 'navigation') {
      lines.push(`Gates available: ${context.venue.gates.join(', ')}.`);
    }
  }

  lines.push(phrase('followUp', language));
  return lines.join('\n');
}

/**
 * Answer a fan/staff query end to end.
 * @param {string} message
 * @param {object} [opts]
 * @param {typeof fetch} [opts.fetchImpl] injectable for testing the LLM path
 * @returns {Promise<object>}
 */
export async function answer(message, opts = {}) {
  const clean = String(message || '').trim();
  if (!clean) {
    const err = new Error('Message is required');
    err.code = 'EMPTY_MESSAGE';
    throw err;
  }

  const language = detectLanguage(clean);
  const { intent, confidence } = classifyIntent(clean);
  const context = buildContext(clean);

  let reply;
  let generator;

  if (config.llm.enabled) {
    try {
      const userContent =
        `CONTEXT:\n${context.contextText || '(no specific context found)'}\n\n` +
        `QUESTION: ${clean}`;
      reply = await chat(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        { fetchImpl: opts.fetchImpl },
      );
      generator = 'llm';
    } catch {
      // Graceful degradation: never fail the request because the model is down.
      reply = composeGroundedAnswer({ message: clean, intent, language, context });
      generator = 'grounded-fallback';
    }
  } else {
    reply = composeGroundedAnswer({ message: clean, intent, language, context });
    generator = 'grounded';
  }

  return {
    reply,
    intent,
    confidence,
    language,
    venue: context.venue ? { id: context.venue.id, name: context.venue.name } : null,
    sources: context.sources,
    generator,
  };
}

export default { answer, buildContext, composeGroundedAnswer };
