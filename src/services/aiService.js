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

const DECISION_SUPPORT_PROMPT =
  'You are PitchPal Operations, a real-time decision-support assistant for FIFA ' +
  'World Cup 2026 organisers, volunteers, and venue staff. Given a live ' +
  'situation, respond with 2 to 4 short, prioritised actions grounded only in ' +
  'the CONTEXT. Prioritise crowd safety, accessibility, and smooth operations. ' +
  'Output ONE action per line as a plain sentence. Do NOT use markdown, bold, ' +
  'headers, or asterisks. Do not add a preamble or closing remark.';

/**
 * Role-specific framing appended to the LLM prompt so responses are tailored
 * to the audience named in the challenge (fan, staff, volunteer, organizer).
 * @param {string} [role]
 * @returns {string}
 */
function roleFraming(role) {
  switch (role) {
    case 'staff':
      return 'The user is venue staff on shift. Give operational, action-oriented guidance.';
    case 'volunteer':
      return 'The user is a tournament volunteer. Give clear guidance they can relay to fans.';
    case 'organizer':
      return 'The user is an organiser. Focus on coordination and operational impact.';
    default:
      return 'The user is a fan attending a match.';
  }
}

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
 * @typedef {object} AnswerResult
 * @property {string}      reply      The assistant's response text.
 * @property {string}      intent     Classified intent domain.
 * @property {number}      confidence Confidence score 0–1.
 * @property {string}      language   ISO 639-1 language code detected.
 * @property {string}      role       Audience the answer was framed for.
 * @property {{id:string,name:string}|null} venue Matched venue or null.
 * @property {string[]}    sources    Grounding source identifiers.
 * @property {string}      generator  'llm' | 'grounded' | 'grounded-fallback'.
 */

/**
 * Answer a fan/staff/volunteer/organiser query end to end.
 * @param {string} message
 * @param {object} [opts]
 * @param {string} [opts.role='fan'] Audience: fan | staff | volunteer | organizer.
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

  const role = opts.role || 'fan';
  const language = detectLanguage(clean);
  const { intent, confidence } = classifyIntent(clean);
  const context = buildContext(clean);

  let reply;
  let generator;

  if (config.llm.enabled) {
    try {
      const userContent =
        `CONTEXT:\n${context.contextText || '(no specific context found)'}\n\n` +
        `${roleFraming(role)}\n\n` +
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
    role,
    venue: context.venue ? { id: context.venue.id, name: context.venue.name } : null,
    sources: context.sources,
    generator,
  };
}

/**
 * Deterministic, grounded decision-support actions used when no LLM is
 * configured. Maps the detected operational intent to prioritised steps.
 * @param {string} intent
 * @param {ReturnType<typeof buildContext>} context
 * @returns {string[]}
 */
export function composeDecisionActions(intent, context) {
  const actions = [];

  switch (intent) {
    case 'crowd':
      actions.push(
        'Redistribute arriving fans from pressured gates to the least-busy gates.',
        'Open additional screening lanes and deploy stewards to the busiest entry.',
      );
      break;
    case 'safety':
      actions.push(
        'Dispatch the nearest first-aid team and alert the venue control room.',
        'Create a clear corridor for responders and pause non-essential movement.',
      );
      break;
    case 'accessibility':
      actions.push(
        'Send an accessibility steward to escort the guest from the transit drop-off.',
        'Confirm step-free routing and reserved accessible seating availability.',
      );
      break;
    case 'transport':
      actions.push(
        'Coordinate with transit operators to raise service frequency.',
        'Update the fan app with the fastest current route and rideshare status.',
      );
      break;
    default:
      actions.push(
        'Log the situation, notify the control room, and assign the nearest steward to assess.',
      );
  }

  if (context.venue) {
    actions.push(`Coordinate with the ${context.venue.name} operations desk for venue protocols.`);
  }
  if (context.retrieved.length > 0) {
    actions.push(`Reference guidance: ${context.retrieved[0].doc.text}`);
  }
  return actions;
}

/**
 * @typedef {object} DecisionSupportResult
 * @property {string}   situation The sanitised input situation.
 * @property {string}   intent    Classified operational intent.
 * @property {string[]} actions   Prioritised recommended actions.
 * @property {string[]} sources   Grounding source identifiers.
 * @property {string}   generator 'llm' | 'grounded' | 'grounded-fallback'.
 */

/**
 * Real-time decision support for organisers, volunteers, and venue staff.
 * Given a live operational situation, returns prioritised, grounded actions.
 * @param {string} situation
 * @param {object} [opts]
 * @param {typeof fetch} [opts.fetchImpl] injectable for testing the LLM path
 * @returns {Promise<DecisionSupportResult>}
 */
export async function decisionSupport(situation, opts = {}) {
  const clean = String(situation || '').trim();
  if (!clean) {
    throw new AppError('Situation is required', ERROR_CODES.EMPTY_MESSAGE, 400);
  }

  const { intent } = classifyIntent(clean);
  const context = buildContext(clean);

  let actions;
  let generator;

  if (config.llm.enabled) {
    try {
      const userContent =
        `CONTEXT:\n${context.contextText || '(no specific context found)'}\n\n` +
        `SITUATION: ${clean}`;
      const reply = await chat(
        [
          { role: 'system', content: DECISION_SUPPORT_PROMPT },
          { role: 'user', content: userContent },
        ],
        { fetchImpl: opts.fetchImpl },
      );
      // Normalise the free-text response into a clean list of action strings:
      // split on newlines, strip markdown emphasis and list markers, drop empties.
      actions = reply
        .split(/\n+/)
        .map((line) =>
          line
            .replace(/[*#`_]/g, '') // strip markdown emphasis
            .replace(/^\s*[-–•\d.)]+\s*/, '') // strip list markers/numbering
            .trim(),
        )
        .filter((line) => line.length > 0);
      generator = 'llm';
    } catch {
      actions = composeDecisionActions(intent, context);
      generator = 'grounded-fallback';
    }
  } else {
    actions = composeDecisionActions(intent, context);
    generator = 'grounded';
  }

  return { situation: clean, intent, actions, sources: context.sources, generator };
}

export default {
  answer,
  buildContext,
  composeGroundedAnswer,
  composeDecisionActions,
  decisionSupport,
};
