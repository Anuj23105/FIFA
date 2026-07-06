import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../src/services/intent.js';

describe('classifyIntent', () => {
  it('detects accessibility with high priority', () => {
    const r = classifyIntent('I need a wheelchair accessible entrance');
    expect(r.intent).toBe('accessibility');
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('detects transport queries', () => {
    expect(classifyIntent('which train goes to the stadium').intent).toBe('transport');
    expect(classifyIntent('where can I park my car').intent).toBe('transport');
  });

  it('detects navigation queries', () => {
    expect(classifyIntent('which gate should I use').intent).toBe('navigation');
  });

  it('detects crowd queries', () => {
    expect(classifyIntent('how busy is the queue right now').intent).toBe('crowd');
  });

  it('detects sustainability queries', () => {
    expect(classifyIntent('where do I recycle my bottle').intent).toBe('sustainability');
  });

  it('detects safety queries', () => {
    expect(classifyIntent('I need first aid, someone is injured').intent).toBe('safety');
  });

  it('returns general for empty or unknown input', () => {
    expect(classifyIntent('').intent).toBe('general');
    expect(classifyIntent('lorem ipsum dolor').intent).toBe('general');
  });

  it('prioritises accessibility over other overlapping signals', () => {
    // Mentions transport AND wheelchair; accessibility is weighted higher.
    const r = classifyIntent('is there wheelchair access from the train');
    expect(r.intent).toBe('accessibility');
  });
});
