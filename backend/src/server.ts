import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { prisma } from './db';

const PORT = process.env.PORT || 5000;
const app = createApp();

async function startServer() {
  try {
    // Verify database connectivity with retry for serverless cold-start
    const maxRetries = 5;
    let connected = false;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await prisma.$connect();
        connected = true;
        console.log(' Successfully connected to PostgreSQL database via Prisma');
        break;
      } catch (err) {
        console.warn(` Database connection attempt ${attempt}/${maxRetries} failed. Retrying in 2s... (Neon database may be waking from sleep)`);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          throw err;
        }
      }
    }
    if (!connected) return;

    const server = app.listen(PORT, () => {
      console.log(` Mini RFQ Portal Backend running on http://localhost:${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n Received ${signal}, closing server gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log(' Database disconnected. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGUSR2', () => shutdown('SIGUSR2'));
  } catch (error) {
    console.error(' Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
