/**
 * Operational intelligence routes for organisers and venue staff.
 */

import { Router } from 'express';
import { getCrowdSnapshot } from '../services/crowdService.js';
import { validateCrowd } from '../middleware/validate.js';
import { venues } from '../data/venues.js';

const router = Router();

/** GET /api/venues - list host venues with metadata. */
router.get('/venues', (_req, res) => {
  res.json({
    venues: venues.map((v) => ({
      id: v.id,
      name: v.name,
      city: v.city,
      country: v.country,
      capacity: v.capacity,
      role: v.role,
    })),
  });
});

/**
 * GET /api/crowd/:venueId?minutesToKickoff=45
 * Real-time-style crowd snapshot with AI recommendations.
 */
router.get('/crowd/:venueId', validateCrowd, (req, res, next) => {
  try {
    const mtk = req.query.minutesToKickoff ?? 45;
    const snapshot = getCrowdSnapshot(req.params.venueId, Number(mtk));
    res.json(snapshot);
  } catch (err) {
    if (err.code === 'VENUE_NOT_FOUND') {
      return res.status(404).json({ error: 'Venue not found.' });
    }
    next(err);
  }
});

export default router;
