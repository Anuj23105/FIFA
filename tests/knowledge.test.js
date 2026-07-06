import { describe, it, expect } from 'vitest';
import { retrieve, knowledgeDocuments } from '../src/data/knowledge.js';
import { findVenue, venueById } from '../src/data/venues.js';

describe('knowledge retrieval', () => {
  it('retrieves the accessibility document for an accessibility query', () => {
    const results = retrieve('wheelchair accessible seating and sensory room');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].doc.domain).toBe('accessibility');
  });

  it('retrieves transport docs for transport queries', () => {
    const results = retrieve('best train or bus to reach the venue');
    expect(results[0].doc.domain).toBe('transport');
  });

  it('returns nothing for empty query', () => {
    expect(retrieve('')).toEqual([]);
  });

  it('respects the result limit', () => {
    const results = retrieve('transport accessibility crowd recycling safety ticket gate', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('every document has required fields', () => {
    for (const doc of knowledgeDocuments) {
      expect(doc.id).toBeTruthy();
      expect(doc.domain).toBeTruthy();
      expect(Array.isArray(doc.keywords)).toBe(true);
      expect(doc.text.length).toBeGreaterThan(20);
    }
  });
});

describe('venue lookup', () => {
  it('finds a venue by name', () => {
    expect(findVenue('how do I get to MetLife Stadium')?.id).toBe('metlife');
  });

  it('finds a venue by city', () => {
    expect(findVenue('accessibility in Mexico City')?.id).toBe('azteca');
  });

  it('returns null when no venue is mentioned', () => {
    expect(findVenue('what time does the match start')).toBeNull();
  });

  it('has a consistent id map', () => {
    expect(venueById.get('sofi')?.name).toBe('SoFi Stadium');
  });
});
