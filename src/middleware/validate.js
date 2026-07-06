/**
 * Input validation and sanitisation helpers.
 * Defends against oversized payloads and basic injection by constraining
 * type, length, and character content before anything reaches the services.
 */

const MAX_MESSAGE_LENGTH = 500;

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
 * Express middleware validating the chat request body.
 */
export function validateChat(req, res, next) {
  const raw = req.body?.message;
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return res.status(400).json({ error: 'A non-empty "message" string is required.' });
  }
  if (raw.length > MAX_MESSAGE_LENGTH) {
    return res
      .status(400)
      .json({ error: `"message" must be ${MAX_MESSAGE_LENGTH} characters or fewer.` });
  }
  req.body.message = sanitizeText(raw);
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
