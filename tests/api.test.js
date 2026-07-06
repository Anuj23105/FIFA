import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

let app;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  app = createApp();
});

describe('GET /api/health', () => {
  it('reports ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(['live', 'grounded']).toContain(res.body.llm);
  });
});

describe('POST /api/chat', () => {
  it('answers a valid question', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'How do I get to MetLife Stadium?' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
    expect(res.body.intent).toBe('transport');
    expect(res.body.venue.id).toBe('metlife');
  });

  it('returns language metadata', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'accessibility at SoFi Stadium' });
    expect(res.status).toBe(200);
    expect(res.body.language).toBe('en');
    expect(typeof res.body.confidence).toBe('number');
  });
});

describe('POST /api/chat — role awareness', () => {
  it('accepts a valid role and echoes it back', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'crowd levels at SoFi Stadium', role: 'staff' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('staff');
  });

  it('defaults to fan when no role is given', async () => {
    const res = await request(app).post('/api/chat').send({ message: 'gate at SoFi Stadium' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('fan');
  });

  it('rejects an invalid role', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'gate at SoFi Stadium', role: 'hacker' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/decision-support', () => {
  it('returns prioritised actions for a live situation', async () => {
    const res = await request(app)
      .post('/api/decision-support')
      .send({ situation: 'Overcrowding and long queues building before kickoff' });
    expect(res.status).toBe(200);
    expect(res.body.intent).toBe('crowd');
    expect(Array.isArray(res.body.actions)).toBe(true);
    expect(res.body.actions.length).toBeGreaterThan(0);
    expect(res.body.generator).toBeTruthy();
  });

  it('handles a medical/safety situation', async () => {
    const res = await request(app)
      .post('/api/decision-support')
      .send({ situation: 'medical emergency near section 112, need first aid' });
    expect(res.status).toBe(200);
    expect(res.body.intent).toBe('safety');
    expect(res.body.actions.join(' ')).toMatch(/first-aid|control room/i);
  });

  it('rejects an empty situation', async () => {
    const res = await request(app).post('/api/decision-support').send({ situation: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/roles', () => {
  it('lists supported audiences', async () => {
    const res = await request(app).get('/api/roles');
    expect(res.status).toBe(200);
    expect(res.body.roles).toContain('fan');
    expect(res.body.roles).toContain('staff');
    expect(res.body.roles).toContain('volunteer');
    expect(res.body.roles).toContain('organizer');
  });
});

describe('POST /api/chat — input validation', () => {
  it('rejects an empty message', async () => {
    const res = await request(app).post('/api/chat').send({ message: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('rejects a non-string message', async () => {
    const res = await request(app).post('/api/chat').send({ message: 42 });
    expect(res.status).toBe(400);
  });

  it('rejects an over-long message', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'a'.repeat(600) });
    expect(res.status).toBe(400);
  });

  it('sanitises control characters from input', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'accessibility\u0000 at SoFi Stadium' });
    expect(res.status).toBe(200);
    expect(res.body.venue.id).toBe('sofi');
  });
});

describe('GET /api/venues', () => {
  it('lists host venues', async () => {
    const res = await request(app).get('/api/venues');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.venues)).toBe(true);
    expect(res.body.venues.length).toBeGreaterThan(0);
    expect(res.body.venues[0]).toHaveProperty('name');
  });
});

describe('GET /api/crowd/:venueId', () => {
  it('returns a crowd snapshot', async () => {
    const res = await request(app).get('/api/crowd/metlife?minutesToKickoff=30');
    expect(res.status).toBe(200);
    expect(res.body.venueId).toBe('metlife');
    expect(res.body.gates.length).toBeGreaterThan(0);
    expect(res.body.recommendations.length).toBeGreaterThan(0);
  });

  it('404s for unknown venues', async () => {
    const res = await request(app).get('/api/crowd/unknownvenue');
    expect(res.status).toBe(404);
  });

  it('rejects an out-of-range minutesToKickoff', async () => {
    const res = await request(app).get('/api/crowd/metlife?minutesToKickoff=999');
    expect(res.status).toBe(400);
  });

  it('rejects an invalid venue id format', async () => {
    const res = await request(app).get('/api/crowd/bad_id!!');
    expect(res.status).toBe(400);
  });
});

describe('unknown API route', () => {
  it('returns 404 json', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });
});
