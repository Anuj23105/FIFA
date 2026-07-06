/**
 * Fan/staff assistant routes (the GenAI conversational surface).
 */

import { Router } from 'express';
import { answer } from '../services/aiService.js';
import { validateChat } from '../middleware/validate.js';
import { SUPPORTED_LANGUAGES } from '../services/translate.js';

const router = Router();

/**
 * POST /api/chat
 * Body: { message: string }
 * Returns a grounded, language-aware assistant response.
 */
router.post('/chat', validateChat, async (req, res, next) => {
  try {
    const result = await answer(req.body.message);
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

export default router;
