import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { envSchema } from '@/lib/env';

describe('Environment Validation', () => {
  describe('envSchema', () => {
    it('should validate valid environment variables', () => {
      const validEnv = {
        JWT_SECRET: 'a-very-secure-secret-key',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        NODE_ENV: 'development',
      };

      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it('should reject missing JWT_SECRET', () => {
      const invalidEnv = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        NODE_ENV: 'development',
      };

      const result = envSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });

    it('should reject short JWT_SECRET', () => {
      const invalidEnv = {
        JWT_SECRET: 'short',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        NODE_ENV: 'development',
      };

      const result = envSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });

    it('should reject invalid DATABASE_URL', () => {
      const invalidEnv = {
        JWT_SECRET: 'a-very-secure-secret-key',
        DATABASE_URL: 'not-a-valid-url',
        NODE_ENV: 'development',
      };

      const result = envSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });

    it('should reject invalid NODE_ENV', () => {
      const invalidEnv = {
        JWT_SECRET: 'a-very-secure-secret-key',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        NODE_ENV: 'invalid',
      };

      const result = envSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });

    it('should accept all valid NODE_ENV values', () => {
      const envs = ['development', 'production', 'test'];
      
      for (const nodeEnv of envs) {
        const result = envSchema.safeParse({
          JWT_SECRET: 'a-very-secure-secret-key',
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
          NODE_ENV: nodeEnv,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should allow optional fields', () => {
      const validEnv = {
        JWT_SECRET: 'a-very-secure-secret-key',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        NODE_ENV: 'development',
        POSTGRES_PASSWORD: 'secret',
        PGADMIN_DEFAULT_PASSWORD: 'admin',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      };

      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });
  });
});
