/**
 * Lightweight intent classifier for fan queries.
 * Maps free text to an operational domain used for routing and grounding.
 */

const INTENT_PATTERNS = [
  { intent: 'accessibility', weight: 2, patterns: [/wheelchair/, /accessib/, /disab/, /step[- ]?free/, /sensory/, /quiet room/, /hearing/, /mobility/, /companion/] },
  { intent: 'navigation', patterns: [/gate/, /entrance/, /where.*(seat|section|find)/, /how do i get to my/, /wayfind/, /lost/, /which gate/, /map/] },
  { intent: 'crowd', patterns: [/crowd/, /busy/, /queue/, /line/, /how long.*wait/, /congest/, /packed/, /rush/] },
  { intent: 'transport', patterns: [/transport/, /transit/, /train/, /\bbus\b/, /metro/, /subway/, /park/, /rideshare/, /uber/, /drive/, /shuttle/, /get there/, /\bget to\b/, /how.*reach/, /way to reach/] },
  { intent: 'sustainability', patterns: [/sustainab/, /recycl/, /waste/, /water refill/, /carbon/, /\beco\b/, /environment/, /compost/] },
  { intent: 'safety', patterns: [/emergency/, /medical/, /first aid/, /lost child/, /security/, /evacuat/, /\bhelp\b/, /injured/] },
  { intent: 'tickets', patterns: [/ticket/, /\bqr\b/, /scan/, /\bbag\b/, /prohibit/, /allowed/, /entry requirement/] },
];

/**
 * Classify a query into an operational intent.
 * @param {string} text
 * @returns {{intent: string, confidence: number}}
 */
export function classifyIntent(text) {
  const lower = String(text || '').toLowerCase();
  if (!lower.trim()) return { intent: 'general', confidence: 0 };

  let best = { intent: 'general', score: 0 };
  for (const entry of INTENT_PATTERNS) {
    let score = 0;
    for (const p of entry.patterns) {
      if (p.test(lower)) score += entry.weight || 1;
    }
    if (score > best.score) best = { intent: entry.intent, score };
  }

  if (best.score === 0) return { intent: 'general', confidence: 0 };
  const confidence = Math.min(1, best.score / 3);
  return { intent: best.intent, confidence: Number(confidence.toFixed(2)) };
}

export default classifyIntent;
