import { Prisma } from '@prisma/client';

// Database error types
export enum DatabaseErrorCode {
  CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  UNIQUE_CONSTRAINT = 'DB_UNIQUE_CONSTRAINT',
  FOREIGN_KEY_CONSTRAINT = 'DB_FOREIGN_KEY',
  NOT_FOUND = 'DB_NOT_FOUND',
  VALIDATION_ERROR = 'DB_VALIDATION_ERROR',
  TIMEOUT = 'DB_TIMEOUT',
  UNKNOWN = 'DB_UNKNOWN_ERROR',
}

export interface DatabaseError {
  code: DatabaseErrorCode;
  message: string;
  field?: string;
  originalError?: unknown;
}

/**
 * Handle Prisma errors and convert to user-friendly messages
 */
export function handlePrismaError(error: unknown): DatabaseError {
  // Prisma Client Known Request Error
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        const field = (error.meta?.target as string[])?.join(', ') || 'field';
        return {
          code: DatabaseErrorCode.UNIQUE_CONSTRAINT,
          message: `ข้อมูล ${field} นี้มีอยู่ในระบบแล้ว`,
          field,
          originalError: error,
        };

      case 'P2003': // Foreign key constraint violation
        return {
          code: DatabaseErrorCode.FOREIGN_KEY_CONSTRAINT,
          message: 'ไม่สามารถดำเนินการได้เนื่องจากมีข้อมูลที่เกี่ยวข้อง',
          originalError: error,
        };

      case 'P2025': // Record not found
        return {
          code: DatabaseErrorCode.NOT_FOUND,
          message: 'ไม่พบข้อมูลที่ต้องการ',
          originalError: error,
        };

      case 'P2024': // Connection pool timeout
        return {
          code: DatabaseErrorCode.TIMEOUT,
          message: 'การเชื่อมต่อฐานข้อมูลหมดเวลา กรุณาลองใหม่อีกครั้ง',
          originalError: error,
        };

      default:
        return {
          code: DatabaseErrorCode.UNKNOWN,
          message: 'เกิดข้อผิดพลาดในฐานข้อมูล',
          originalError: error,
        };
    }
  }

  // Prisma Client Validation Error
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      code: DatabaseErrorCode.VALIDATION_ERROR,
      message: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
      originalError: error,
    };
  }

  // Prisma Client Initialization Error
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      code: DatabaseErrorCode.CONNECTION_ERROR,
      message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้',
      originalError: error,
    };
  }

  // Prisma Client Rust Panic Error
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      code: DatabaseErrorCode.UNKNOWN,
      message: 'เกิดข้อผิดพลาดร้ายแรงในฐานข้อมูล',
      originalError: error,
    };
  }

  // Unknown error
  return {
    code: DatabaseErrorCode.UNKNOWN,
    message: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
    originalError: error,
  };
}

/**
 * Check if error is a Prisma error
 */
export function isPrismaError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  );
}

/**
 * Get HTTP status code for database error
 */
export function getHttpStatusForDbError(dbError: DatabaseError): number {
  switch (dbError.code) {
    case DatabaseErrorCode.NOT_FOUND:
      return 404;
    case DatabaseErrorCode.UNIQUE_CONSTRAINT:
    case DatabaseErrorCode.VALIDATION_ERROR:
      return 400;
    case DatabaseErrorCode.FOREIGN_KEY_CONSTRAINT:
      return 409;
    case DatabaseErrorCode.CONNECTION_ERROR:
    case DatabaseErrorCode.TIMEOUT:
      return 503;
    default:
      return 500;
  }
}
