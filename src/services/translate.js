/**
 * Multilingual support utilities.
 *
 * Language detection uses lexical signals across the primary FIFA World Cup
 * 2026 host and visitor languages. Localised UI strings back the offline
 * grounded engine so the assistant can greet and frame answers in the
 * user's language even without a live translation model.
 */

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'pt', 'de'];

/**
 * Distinctive hint tokens per language. Cognates that are spelled identically
 * in English (e.g. "transport", "accessible", "ticket") are deliberately
 * excluded to avoid misclassifying English text. Multi-word phrases are also
 * supported and matched as substrings.
 */
const LANGUAGE_HINTS = {
  es: ['dónde', 'donde', 'estadio', 'cómo', 'como', 'puerta', 'transporte', 'ayuda', 'gracias', 'entrada', 'accesible', 'reciclar', 'silla de ruedas'],
  fr: ['où', 'stade', 'comment', 'porte', 'fauteuil', 'aide', 'merci', 'billet', 'accès', 'recycler'],
  pt: ['onde', 'estádio', 'estadio', 'portão', 'portao', 'ajuda', 'obrigado', 'bilhete', 'acessível', 'cadeira de rodas'],
  de: ['wo', 'stadion', 'wie', 'eingang', 'rollstuhl', 'verkehr', 'hilfe', 'danke', 'barrierefrei', 'zugang'],
};

/**
 * Detect the most likely language of a message.
 * Single-word hints are matched on word boundaries (to avoid substring false
 * positives such as "wo" inside "how"); multi-word hints match as phrases.
 * Defaults to English when no strong signal is found.
 * @param {string} text
 * @returns {string} ISO 639-1 language code
 */
export function detectLanguage(text) {
  const lower = String(text || '').toLowerCase();
  if (!lower.trim()) return 'en';

  const tokens = new Set(
    lower.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean),
  );

  const scores = {};
  for (const [lang, hints] of Object.entries(LANGUAGE_HINTS)) {
    scores[lang] = hints.reduce((acc, hint) => {
      const hit = hint.includes(' ') ? lower.includes(hint) : tokens.has(hint);
      return hit ? acc + 1 : acc;
    }, 0);
  }

  let bestLang = 'en';
  let bestScore = 0;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }
  return bestScore > 0 ? bestLang : 'en';
}

/** Localised phrase pack for the grounded engine. */
const PHRASES = {
  greeting: {
    en: 'Here to help with your match day.',
    es: 'Aquí para ayudarte en el día del partido.',
    fr: 'Ici pour vous aider le jour du match.',
    pt: 'Aqui para ajudar no dia do jogo.',
    de: 'Hier, um Ihnen am Spieltag zu helfen.',
  },
  atVenue: {
    en: 'At',
    es: 'En',
    fr: 'À',
    pt: 'No',
    de: 'Im',
  },
  followUp: {
    en: 'Ask me about navigation, transport, accessibility, or crowd levels.',
    es: 'Pregúntame sobre navegación, transporte, accesibilidad o niveles de multitud.',
    fr: 'Demandez-moi la navigation, le transport, l’accessibilité ou l’affluence.',
    pt: 'Pergunte sobre navegação, transporte, acessibilidade ou lotação.',
    de: 'Fragen Sie mich zu Wegführung, Verkehr, Barrierefreiheit oder Andrang.',
  },
};

/**
 * Get a localised phrase, falling back to English.
 * @param {keyof typeof PHRASES} key
 * @param {string} lang
 * @returns {string}
 */
export function phrase(key, lang) {
  const pack = PHRASES[key];
  if (!pack) return '';
  return pack[lang] || pack.en;
}

export default { detectLanguage, phrase, SUPPORTED_LANGUAGES };
