import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePrismaError, isPrismaError, getHttpStatusForDbError, DatabaseErrorCode } from '@/lib/dbErrors';
import { Prisma } from '@prisma/client';

describe('Database Error Handling', () => {
  describe('handlePrismaError', () => {
    it('should handle unique constraint violation', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['email'] },
      });

      const result = handlePrismaError(error);
      expect(result.code).toBe(DatabaseErrorCode.UNIQUE_CONSTRAINT);
      expect(result.field).toBe('email');
    });

    it('should handle foreign key constraint violation', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
        code: 'P2003',
        clientVersion: '5.0.0',
      });

      const result = handlePrismaError(error);
      expect(result.code).toBe(DatabaseErrorCode.FOREIGN_KEY_CONSTRAINT);
    });

    it('should handle record not found', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });

      const result = handlePrismaError(error);
      expect(result.code).toBe(DatabaseErrorCode.NOT_FOUND);
    });

    it('should handle connection timeout', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Connection pool timeout', {
        code: 'P2024',
        clientVersion: '5.0.0',
      });

      const result = handlePrismaError(error);
      expect(result.code).toBe(DatabaseErrorCode.TIMEOUT);
    });

    it('should handle unknown Prisma error codes', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unknown error', {
        code: 'P9999',
        clientVersion: '5.0.0',
      });

      const result = handlePrismaError(error);
      expect(result.code).toBe(DatabaseErrorCode.UNKNOWN);
    });

    it('should handle validation errors', () => {
      const error = new Prisma.PrismaClientValidationError('Validation failed', {
        clientVersion: '5.0.0',
      });

      const result = handlePrismaError(error);
      expect(result.code).toBe(DatabaseErrorCode.VALIDATION_ERROR);
    });

    it('should handle unknown errors', () => {
      const result = handlePrismaError(new Error('Regular error'));
      expect(result.code).toBe(DatabaseErrorCode.UNKNOWN);
    });
  });

  describe('isPrismaError', () => {
    it('should identify Prisma known request errors', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      expect(isPrismaError(error)).toBe(true);
    });

    it('should identify Prisma validation errors', () => {
      const error = new Prisma.PrismaClientValidationError('Error', {
        clientVersion: '5.0.0',
      });
      expect(isPrismaError(error)).toBe(true);
    });

    it('should return false for regular errors', () => {
      expect(isPrismaError(new Error('Regular error'))).toBe(false);
      expect(isPrismaError('string error')).toBe(false);
      expect(isPrismaError(null)).toBe(false);
    });
  });

  describe('getHttpStatusForDbError', () => {
    it('should return 404 for NOT_FOUND', () => {
      expect(getHttpStatusForDbError({ code: DatabaseErrorCode.NOT_FOUND, message: '' })).toBe(404);
    });

    it('should return 400 for UNIQUE_CONSTRAINT', () => {
      expect(getHttpStatusForDbError({ code: DatabaseErrorCode.UNIQUE_CONSTRAINT, message: '' })).toBe(400);
    });

    it('should return 400 for VALIDATION_ERROR', () => {
      expect(getHttpStatusForDbError({ code: DatabaseErrorCode.VALIDATION_ERROR, message: '' })).toBe(400);
    });

    it('should return 409 for FOREIGN_KEY_CONSTRAINT', () => {
      expect(getHttpStatusForDbError({ code: DatabaseErrorCode.FOREIGN_KEY_CONSTRAINT, message: '' })).toBe(409);
    });

    it('should return 503 for CONNECTION_ERROR', () => {
      expect(getHttpStatusForDbError({ code: DatabaseErrorCode.CONNECTION_ERROR, message: '' })).toBe(503);
    });

    it('should return 503 for TIMEOUT', () => {
      expect(getHttpStatusForDbError({ code: DatabaseErrorCode.TIMEOUT, message: '' })).toBe(503);
    });

    it('should return 500 for UNKNOWN', () => {
      expect(getHttpStatusForDbError({ code: DatabaseErrorCode.UNKNOWN, message: '' })).toBe(500);
    });
  });
});
