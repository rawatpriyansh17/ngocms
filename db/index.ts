import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql';

config({ path: '.env' }); // or .env.local

export const db = drizzle({ connection: {
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncUrl: process.env.TURSO_SYNC_URL!,
      syncInterval: 1000, // More frequent sync
      concurrency: 50, // Higher concurrency
      // Add connection reuse
      intMode: 'number',
      // Enable embedded replicas for faster reads
      encryptionKey: undefined,
}});
