/**
 * Fan/staff assistant routes (the GenAI conversational surface).
 */

import { Router } from 'express';
import { answer, decisionSupport } from '../services/aiService.js';
import { validateChat, validateDecisionSupport } from '../middleware/validate.js';
import { SUPPORTED_LANGUAGES } from '../services/translate.js';
import { ROLES } from '../constants.js';

const router = Router();

/**
 * POST /api/chat
 * Body: { message: string, role?: 'fan'|'staff'|'volunteer'|'organizer' }
 * Returns a grounded, language-aware, role-tailored assistant response.
 */
router.post('/chat', validateChat, async (req, res, next) => {
  try {
    const result = await answer(req.body.message, { role: req.body.role });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/decision-support
 * Body: { situation: string }
 * Real-time GenAI decision support for organisers, volunteers, and staff.
 */
router.post('/decision-support', validateDecisionSupport, async (req, res, next) => {
  try {
    const result = await decisionSupport(req.body.situation);
    res.json(result);
  } catch (err) {
    if (err.code === 'EMPTY_MESSAGE') {
      return res.status(400).json({ error: 'A non-empty message is required.' });
    }
    next(err);
  }
});

/** GET /api/languages - advertise supported languages. */
router.get('/languages', (_req, res) => {
  res.json({ languages: SUPPORTED_LANGUAGES });
});

/** GET /api/roles - advertise supported audiences. */
router.get('/roles', (_req, res) => {
  res.json({ roles: ROLES });
});

export default router;
