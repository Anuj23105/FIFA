/**
 * Knowledge base for retrieval-augmented generation (RAG).
 * Each document is tagged with an intent domain and keywords used for
 * lightweight lexical retrieval. Kept small and structured so responses
 * are always grounded in verifiable content.
 */

export const knowledgeDocuments = [
  {
    id: 'nav-general',
    domain: 'navigation',
    keywords: ['gate', 'entrance', 'find', 'section', 'seat', 'wayfinding', 'map', 'lost', 'direction'],
    text:
      'Every ticket lists a recommended gate that matches your seating block. ' +
      'Digital wayfinding kiosks are placed at each entrance and concourse junction. ' +
      'Follow the colour-coded signage that corresponds to your seating tier, and staff in bright vests can guide you to your section.',
  },
  {
    id: 'crowd-general',
    domain: 'crowd',
    keywords: ['crowd', 'busy', 'queue', 'line', 'wait', 'congestion', 'entry', 'exit', 'flow'],
    text:
      'Entry gates are busiest 60 to 30 minutes before kickoff. ' +
      'To avoid congestion, arrive at least 90 minutes early or use the less-busy gates highlighted in the app. ' +
      'After the match, staggered exit guidance is broadcast to spread the outbound flow across all gates.',
  },
  {
    id: 'transport-general',
    domain: 'transport',
    keywords: ['transport', 'transit', 'train', 'bus', 'metro', 'parking', 'park', 'rideshare', 'drive', 'shuttle'],
    text:
      'Public transit is the fastest way to reach the stadium on match day. ' +
      'Event rail and bus services run at increased frequency, and rideshare has a dedicated pickup zone away from pedestrian gates. ' +
      'Parking is limited and should be reserved in advance where available.',
  },
  {
    id: 'accessibility-general',
    domain: 'accessibility',
    keywords: [
      'accessible', 'accessibility', 'wheelchair', 'disability', 'disabled', 'step-free',
      'sensory', 'quiet', 'companion', 'hearing', 'visual', 'assistance', 'mobility',
    ],
    text:
      'All host venues provide step-free routes, accessible seating with companion spaces, and accessible washrooms on every concourse. ' +
      'Sensory or quiet rooms are available for guests who need a calm space, and assistive listening devices can be collected from Guest Services. ' +
      'Accessibility stewards are stationed at main gates to provide escorts from transit drop-off points.',
  },
  {
    id: 'sustainability-general',
    domain: 'sustainability',
    keywords: ['sustainability', 'recycle', 'recycling', 'waste', 'green', 'water', 'refill', 'carbon', 'eco', 'environment'],
    text:
      'PitchPal venues run zero-landfill programmes with clearly labelled recycling and compost stations throughout the concourses. ' +
      'Free water refill points reduce single-use plastic, and choosing public transit or the official low-emission shuttles is the biggest way fans can cut their match-day carbon footprint.',
  },
  {
    id: 'safety-general',
    domain: 'safety',
    keywords: ['safety', 'emergency', 'medical', 'first aid', 'help', 'security', 'lost child', 'evacuation'],
    text:
      'First aid stations are located near the main concourses and marked on the venue map. ' +
      'In an emergency, alert the nearest steward or dial the venue control room via any Guest Services desk. ' +
      'Lost children are escorted to the designated family reunion point announced at each gate.',
  },
  {
    id: 'tickets-general',
    domain: 'tickets',
    keywords: ['ticket', 'entry', 'scan', 'qr', 'bag', 'prohibited', 'security check', 'allowed'],
    text:
      'Tickets are digital and scanned from your phone at the gate, so keep screen brightness high. ' +
      'Only small bags are permitted and all guests pass through a security screening, so travel light to speed up entry.',
  },
];

/**
 * Rank knowledge documents by lexical overlap with the query.
 * @param {string} query
 * @param {number} [limit=3]
 * @returns {Array<{doc: object, score: number}>}
 */
export function retrieve(query, limit = 3) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const scored = knowledgeDocuments
    .map((doc) => ({ doc, score: scoreDocument(doc, tokens) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function scoreDocument(doc, tokens) {
  let score = 0;
  for (const token of tokens) {
    for (const kw of doc.keywords) {
      if (kw === token) score += 3;
      else if (kw.includes(token) || token.includes(kw)) score += 1;
    }
  }
  return score;
}
