import { NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';
import { handlePrismaError, isPrismaError, getHttpStatusForDbError } from '@/lib/dbErrors';
import { apiLogger } from '@/lib/logger';

/**
 * Standard error codes for API responses
 */
export enum ApiErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  
  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Client errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Not found (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Conflict (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Rate limiting (429)
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

interface ErrorResponseOptions {
  code?: ApiErrorCode;
  details?: Record<string, unknown>;
  logError?: boolean;
  context?: string;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  status: number,
  options?: ErrorResponseOptions
): NextResponse<ApiResponse> {
  const { code, details, logError = true, context } = options || {};

  if (logError) {
    apiLogger.warn(`API Error: ${message}`, {
      data: { status, code, context, details },
    });
  }

  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: message,
      ...(code && { code }),
      ...(details && { details }),
    },
    { status }
  );
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * Handle any error and return appropriate response
 */
export function handleApiError(
  error: unknown,
  context?: string
): NextResponse<ApiResponse> {
  // Handle Prisma errors
  if (isPrismaError(error)) {
    const dbError = handlePrismaError(error);
    apiLogger.error(`Database error in ${context || 'API'}`, {
      data: { code: dbError.code },
      error: error instanceof Error ? error : undefined,
    });
    return errorResponse(
      dbError.message,
      getHttpStatusForDbError(dbError),
      { code: ApiErrorCode.DATABASE_ERROR, logError: false }
    );
  }

  // Handle standard errors
  if (error instanceof Error) {
    apiLogger.error(`Error in ${context || 'API'}: ${error.message}`, {
      error,
    });
    return errorResponse(
      'เกิดข้อผิดพลาดในระบบ',
      500,
      { code: ApiErrorCode.INTERNAL_ERROR, logError: false }
    );
  }

  // Unknown error
  apiLogger.error(`Unknown error in ${context || 'API'}`, {
    data: { error: String(error) },
  });
  return errorResponse(
    'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
    500,
    { code: ApiErrorCode.INTERNAL_ERROR, logError: false }
  );
}

// Convenience functions for common error responses
export const unauthorized = (message = 'กรุณาเข้าสู่ระบบ') =>
  errorResponse(message, 401, { code: ApiErrorCode.UNAUTHORIZED });

export const forbidden = (message = 'คุณไม่มีสิทธิ์ดำเนินการนี้') =>
  errorResponse(message, 403, { code: ApiErrorCode.FORBIDDEN });

export const notFound = (message = 'ไม่พบข้อมูลที่ต้องการ') =>
  errorResponse(message, 404, { code: ApiErrorCode.NOT_FOUND });

export const badRequest = (message = 'ข้อมูลไม่ถูกต้อง') =>
  errorResponse(message, 400, { code: ApiErrorCode.BAD_REQUEST });

export const conflict = (message = 'ข้อมูลซ้ำกับที่มีอยู่แล้ว') =>
  errorResponse(message, 409, { code: ApiErrorCode.CONFLICT });

export const rateLimited = (message = 'คำขอมากเกินไป กรุณารอสักครู่') =>
  errorResponse(message, 429, { code: ApiErrorCode.RATE_LIMITED });

export const serverError = (message = 'เกิดข้อผิดพลาดในระบบ') =>
  errorResponse(message, 500, { code: ApiErrorCode.INTERNAL_ERROR });
