/**
 * Input validation and sanitisation helpers.
 * Defends against oversized payloads and basic injection by constraining
 * type, length, and character content before anything reaches the services.
 */

import {
  MAX_MESSAGE_LENGTH,
  MAX_VENUE_ID_LENGTH,
  MAX_MINUTES_TO_KICKOFF,
  ROLES,
} from '../constants.js';

// Hoisted at module scope so it is compiled once, not on every request.
const VENUE_ID_RE = new RegExp(`^[a-z0-9-]{1,${MAX_VENUE_ID_LENGTH}}$`);

/**
 * Sanitise a free-text string: coerce to string, trim, strip control
 * characters, and cap length.
 * @param {unknown} value
 * @param {number} [maxLength=MAX_MESSAGE_LENGTH]
 * @returns {string}
 */
export function sanitizeText(value, maxLength = MAX_MESSAGE_LENGTH) {
  if (typeof value !== 'string') return '';
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate a free-text field on the request body: must be a non-empty string
 * within the length cap. Returns the sanitised value, or sends a 400 and
 * returns `null` when invalid.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} field
 * @returns {string|null}
 */
function validateTextField(req, res, field) {
  const raw = req.body?.[field];
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    res.status(400).json({ error: `A non-empty "${field}" string is required.` });
    return null;
  }
  if (raw.length > MAX_MESSAGE_LENGTH) {
    res
      .status(400)
      .json({ error: `"${field}" must be ${MAX_MESSAGE_LENGTH} characters or fewer.` });
    return null;
  }
  return sanitizeText(raw);
}

/**
 * Express middleware validating the chat request body.
 * Accepts an optional `role` that must be one of the supported audiences.
 */
export function validateChat(req, res, next) {
  const message = validateTextField(req, res, 'message');
  if (message === null) return;

  if (req.body.role !== undefined && !ROLES.includes(req.body.role)) {
    return res.status(400).json({ error: `"role" must be one of: ${ROLES.join(', ')}.` });
  }

  req.body.message = message;
  next();
}

/**
 * Express middleware validating the decision-support request body.
 */
export function validateDecisionSupport(req, res, next) {
  const situation = validateTextField(req, res, 'situation');
  if (situation === null) return;
  req.body.situation = situation;
  next();
}

/**
 * Express middleware validating crowd query parameters.
 */
export function validateCrowd(req, res, next) {
  const venueId = sanitizeText(req.params.venueId, 40).toLowerCase();
  if (!/^[a-z0-9-]{1,40}$/.test(venueId)) {
    return res.status(400).json({ error: 'Invalid venue id.' });
  }
  req.params.venueId = venueId;

  if (req.query.minutesToKickoff !== undefined) {
    const mtk = Number(req.query.minutesToKickoff);
    if (!Number.isFinite(mtk) || mtk < 0 || mtk > 240) {
      return res
        .status(400)
        .json({ error: 'minutesToKickoff must be a number between 0 and 240.' });
    }
    req.query.minutesToKickoff = mtk;
  }
  next();
}

export const limits = { MAX_MESSAGE_LENGTH };
