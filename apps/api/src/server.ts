import { createApp } from './app.js';
import { getConfig } from './config.js';
import { prisma } from './lib/prisma.js';

const app = createApp();
const config = getConfig();
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`API server listening on port ${config.port}`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.once('SIGINT', () => {
  void shutdown();
});
process.once('SIGTERM', () => {
  void shutdown();
});
