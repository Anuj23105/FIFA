import { describe, it, expect } from 'vitest';
import { detectLanguage, phrase, SUPPORTED_LANGUAGES } from '../src/services/translate.js';

describe('detectLanguage', () => {
  it('defaults to English', () => {
    expect(detectLanguage('where is the gate')).toBe('en');
    expect(detectLanguage('')).toBe('en');
  });

  it('detects Spanish', () => {
    expect(detectLanguage('¿dónde está el estadio?')).toBe('es');
  });

  it('detects French', () => {
    expect(detectLanguage('où est le stade et comment y aller')).toBe('fr');
  });

  it('detects Portuguese', () => {
    expect(detectLanguage('onde fica o estádio')).toBe('pt');
  });

  it('detects German', () => {
    expect(detectLanguage('wo ist der eingang zum stadion')).toBe('de');
  });
});

describe('phrase', () => {
  it('returns a localised phrase', () => {
    expect(phrase('followUp', 'es')).toMatch(/accesibilidad/i);
  });

  it('falls back to English for unknown language', () => {
    expect(phrase('greeting', 'zz')).toBe(phrase('greeting', 'en'));
  });

  it('exposes the supported languages list', () => {
    expect(SUPPORTED_LANGUAGES).toContain('en');
    expect(SUPPORTED_LANGUAGES).toContain('es');
  });
});
