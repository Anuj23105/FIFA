/**
 * Zero-dependency .env loader with a side effect on import.
 *
 * Importing this module BEFORE config.js guarantees environment variables
 * from a local .env file are available when configuration is first read.
 * Existing process environment values always take precedence.
 */

import { readFileSync, existsSync } from 'node:fs';

function loadDotEnv(path = '.env') {
  if (!existsSync(path)) return;
  try {
    const content = readFileSync(path, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // Non-fatal: fall back to the process environment only.
  }
}

loadDotEnv();
