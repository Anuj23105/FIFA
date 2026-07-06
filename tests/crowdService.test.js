import { describe, it, expect } from 'vitest';
import { getCrowdSnapshot, statusFor, recommend } from '../src/services/crowdService.js';

describe('statusFor', () => {
  it('maps ratios to statuses', () => {
    expect(statusFor(0.1)).toBe('low');
    expect(statusFor(0.5)).toBe('moderate');
    expect(statusFor(0.7)).toBe('high');
    expect(statusFor(0.9)).toBe('critical');
  });
});

describe('getCrowdSnapshot', () => {
  it('returns a stable, deterministic snapshot for the same inputs', () => {
    const a = getCrowdSnapshot('metlife', 45);
    const b = getCrowdSnapshot('metlife', 45);
    expect(a.gates).toEqual(b.gates);
    expect(a.averageOccupancy).toBe(b.averageOccupancy);
  });

  it('produces one entry per gate', () => {
    const snap = getCrowdSnapshot('sofi', 30);
    expect(snap.gates.length).toBe(5);
    for (const g of snap.gates) {
      expect(g.occupancy).toBeGreaterThanOrEqual(0);
      expect(g.occupancy).toBeLessThanOrEqual(1);
      expect(['low', 'moderate', 'high', 'critical']).toContain(g.status);
    }
  });

  it('always includes at least one recommendation', () => {
    const snap = getCrowdSnapshot('bmo', 45);
    expect(snap.recommendations.length).toBeGreaterThan(0);
  });

  it('throws a coded error for unknown venues', () => {
    expect(() => getCrowdSnapshot('nope', 45)).toThrowError(/Unknown venue/);
    try {
      getCrowdSnapshot('nope', 45);
    } catch (e) {
      expect(e.code).toBe('VENUE_NOT_FOUND');
    }
  });
});

describe('recommend', () => {
  it('advises redirection when a gate is critical', () => {
    const gates = [
      { gate: 'A', occupancy: 0.95, status: 'critical' },
      { gate: 'B', occupancy: 0.2, status: 'low' },
    ];
    const recs = recommend(gates, 45);
    expect(recs.join(' ')).toMatch(/Gate A/);
    expect(recs.join(' ')).toMatch(/Gate B/);
  });

  it('adds a near-kickoff priority note', () => {
    const gates = [{ gate: 'A', occupancy: 0.5, status: 'moderate' }];
    const recs = recommend(gates, 10);
    expect(recs.join(' ')).toMatch(/Kickoff is near/);
  });
});
