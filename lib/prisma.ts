import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, PoolConfig } from 'pg';
import 'dotenv/config';

// Global store for Prisma client and pool - prevents connection leaks
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

// Pool configuration for connection management
function getPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return {
    connectionString,
    // Connection pool settings to prevent leaks
    max: parseInt(process.env.DATABASE_POOL_MAX || '10'), // Maximum connections
    min: parseInt(process.env.DATABASE_POOL_MIN || '2'),  // Minimum connections
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 10000, // Connection timeout 10s
    maxUses: 7500, // Close connection after 7500 uses (prevents stale connections)
  };
}

// Create or reuse PostgreSQL pool
function getOrCreatePool(): Pool {
  if (!globalForPrisma.pgPool) {
    const config = getPoolConfig();
    globalForPrisma.pgPool = new Pool(config);

    // Handle pool errors
    globalForPrisma.pgPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });

    // Cleanup on process exit
    if (typeof process !== 'undefined') {
      process.on('beforeExit', async () => {
        if (globalForPrisma.pgPool) {
          await globalForPrisma.pgPool.end();
        }
      });
    }
  }
  
  return globalForPrisma.pgPool;
}

// Create Prisma client using shared pool
function createPrismaClient(): PrismaClient {
  const pool = getOrCreatePool();
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });
}

// Singleton Prisma client
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache in development/non-production to prevent multiple instances during hot reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper to get pool stats (useful for monitoring)
export function getPoolStats(): { totalCount: number; idleCount: number; waitingCount: number } | null {
  if (globalForPrisma.pgPool) {
    return {
      totalCount: globalForPrisma.pgPool.totalCount,
      idleCount: globalForPrisma.pgPool.idleCount,
      waitingCount: globalForPrisma.pgPool.waitingCount,
    };
  }
  return null;
}

// Graceful shutdown helper
export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
  }
  if (globalForPrisma.pgPool) {
    await globalForPrisma.pgPool.end();
  }
}

export default prisma;
