/**
 * Operational intelligence: real-time-style crowd and flow metrics with
 * AI-generated recommendations for organisers and venue staff.
 *
 * Metrics are deterministically simulated from a seed so the demo is stable
 * and unit-testable, while still varying by gate and time-to-kickoff.
 */

import { venueById } from '../data/venues.js';

/** Deterministic pseudo-random generator (mulberry32) for stable simulation. */
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Classify an occupancy ratio into an operational status.
 * @param {number} ratio 0..1
 */
export function statusFor(ratio) {
  if (ratio >= 0.85) return 'critical';
  if (ratio >= 0.65) return 'high';
  if (ratio >= 0.4) return 'moderate';
  return 'low';
}

/**
 * Produce a crowd snapshot for a venue.
 * @param {string} venueId
 * @param {number} [minutesToKickoff=45] used to scale baseline pressure
 * @returns {object}
 */
export function getCrowdSnapshot(venueId, minutesToKickoff = 45) {
  const venue = venueById.get(venueId);
  if (!venue) {
    const err = new Error(`Unknown venue: ${venueId}`);
    err.code = 'VENUE_NOT_FOUND';
    throw err;
  }

  // Pressure peaks in the 60-30 minute window before kickoff.
  const proximity = Math.max(0, 1 - Math.abs(minutesToKickoff - 45) / 60);
  const rand = seeded(hashString(`${venueId}:${minutesToKickoff}`));

  const gates = venue.gates.map((gate) => {
    const noise = rand() * 0.3;
    const ratio = clamp01(0.35 + proximity * 0.5 + noise - 0.15);
    return {
      gate,
      occupancy: Number(ratio.toFixed(2)),
      status: statusFor(ratio),
      estimatedWaitMinutes: Math.round(ratio * 25),
    };
  });

  const avg = gates.reduce((s, g) => s + g.occupancy, 0) / gates.length;

  return {
    venueId,
    venueName: venue.name,
    minutesToKickoff,
    overallStatus: statusFor(avg),
    averageOccupancy: Number(avg.toFixed(2)),
    gates,
    recommendations: recommend(gates, minutesToKickoff),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate actionable recommendations for staff based on gate metrics.
 * @param {Array<{gate:string,occupancy:number,status:string}>} gates
 * @param {number} minutesToKickoff
 * @returns {string[]}
 */
export function recommend(gates, minutesToKickoff) {
  const recs = [];
  const sorted = [...gates].sort((a, b) => b.occupancy - a.occupancy);
  const busiest = sorted[0];
  const quietest = sorted[sorted.length - 1];

  if (busiest && busiest.status === 'critical') {
    recs.push(
      `Gate ${busiest.gate} is at critical load. Redirect arriving fans to Gate ${quietest.gate} and deploy additional stewards.`,
    );
  } else if (busiest && busiest.status === 'high') {
    recs.push(
      `Gate ${busiest.gate} is filling fast. Open an extra screening lane and promote Gate ${quietest.gate} in the fan app.`,
    );
  }

  if (minutesToKickoff <= 15) {
    recs.push('Kickoff is near. Prioritise express entry for accessibility and family lanes.');
  }
  if (minutesToKickoff >= 75) {
    recs.push('Early window: encourage fans to arrive now to spread the arrival curve.');
  }

  if (recs.length === 0) {
    recs.push('Flow is balanced across all gates. Maintain current staffing.');
  }
  return recs;
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

export default { getCrowdSnapshot, recommend, statusFor };
