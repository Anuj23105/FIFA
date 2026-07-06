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
