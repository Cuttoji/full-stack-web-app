import { z } from 'zod';

// Server-side environment variable schema (only validated on server)
export const envSchema = z.object({
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  USE_MOCK_DB: z.string().default('false').transform(v => v === 'true'),
  POSTGRES_PASSWORD: z.string().min(1, 'POSTGRES_PASSWORD is required').optional(),
  PGADMIN_DEFAULT_PASSWORD: z.string().min(1, 'PGADMIN_DEFAULT_PASSWORD is required').optional(),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL').optional(),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

/**
 * Check if we're running on the server side
 */
function isServer(): boolean {
  return typeof window === 'undefined';
}

export function validateEnv(env: NodeJS.ProcessEnv): Env {
  if (validatedEnv) return validatedEnv;
  
  // Only validate on server side
  if (!isServer()) {
    // Return dummy values for client-side (these won't be used)
    return {
      JWT_SECRET: 'client-side-placeholder',
      DATABASE_URL: 'postgresql://placeholder',
      NODE_ENV: 'development',
      USE_MOCK_DB: false,
    } as Env;
  }
  
  const result = envSchema.safeParse(env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment variables');
  }
  validatedEnv = result.data;
  return result.data;
}

export function getEnv(): Env {
  if (!validatedEnv) {
    return validateEnv(process.env);
  }
  return validatedEnv;
}
