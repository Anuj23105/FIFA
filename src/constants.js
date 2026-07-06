/**
 * Shared, named constants. Centralising these removes magic numbers from the
 * codebase and keeps operational thresholds easy to audit and tune.
 */

// Audiences served by the assistant (per the challenge: fans, organizers,
// volunteers, venue staff).
export const ROLES = Object.freeze(['fan', 'staff', 'volunteer', 'organizer']);

// Input limits
export const MAX_MESSAGE_LENGTH = 500;
export const MAX_VENUE_ID_LENGTH = 40;
export const MAX_MINUTES_TO_KICKOFF = 240;

// Crowd model
export const DEFAULT_MINUTES_TO_KICKOFF = 45;
export const CROWD_CACHE_TTL_MS = 10_000;

// Occupancy thresholds (ratio 0..1) -> status
export const OCCUPANCY_THRESHOLDS = Object.freeze({
  critical: 0.85,
  high: 0.65,
  moderate: 0.4,
});

// Retrieval
export const DEFAULT_RETRIEVAL_LIMIT = 3;
export const EXACT_MATCH_SCORE = 3;
export const PARTIAL_MATCH_SCORE = 1;

// HTTP caching (seconds)
export const STATIC_MAX_AGE_S = 3600;
export const VENUES_MAX_AGE_S = 300;
