/**
 * Server bootstrap.
 *
 * `./loadEnv.js` is imported first (before anything that reads config) so a
 * local .env file is applied to the environment before configuration is built.
 */

import './loadEnv.js';
import { createApp } from './app.js';
import config from './config.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`PitchPal running on http://localhost:${config.port}`);
  console.log(
    `GenAI mode: ${config.llm.enabled ? 'live LLM' : 'grounded engine (no API key set)'}`,
  );
});

// Graceful shutdown.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}

export default server;
