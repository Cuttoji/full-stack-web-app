import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  successResponse,
  errorResponse,
  notFound,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
  handleApiError,
  ApiErrorCode,
} from '@/lib/apiResponse';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('API Response Utilities', () => {
  describe('successResponse', () => {
    it('should return 200 status by default', async () => {
      const response = successResponse({ data: 'test' });
      expect(response.status).toBe(200);
    });

    it('should return custom status code', async () => {
      const response = successResponse({ data: 'test' }, undefined, 201);
      expect(response.status).toBe(201);
    });

    it('should return JSON content type', async () => {
      const response = successResponse({ data: 'test' });
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should include success: true in response body', async () => {
      const response = successResponse({ data: 'test' });
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('should include provided data in response body', async () => {
      const testData = { users: [{ id: 1, name: 'Test' }] };
      const response = successResponse(testData);
      const body = await response.json();
      expect(body.data).toEqual(testData);
    });

    it('should include message when provided', async () => {
      const response = successResponse({ data: 'test' }, 'Success message');
      const body = await response.json();
      expect(body.message).toBe('Success message');
    });
  });

  describe('errorResponse', () => {
    it('should return provided status code', async () => {
      const response = errorResponse('Error message', 400);
      expect(response.status).toBe(400);
    });

    it('should include success: false in response body', async () => {
      const response = errorResponse('Error message', 400);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    it('should include error message in response body', async () => {
      const response = errorResponse('Test error', 400);
      const body = await response.json();
      expect(body.error).toBe('Test error');
    });

    it('should include error code when provided', async () => {
      const response = errorResponse('Test error', 400, { code: ApiErrorCode.BAD_REQUEST });
      const body = await response.json();
      expect(body.code).toBe('BAD_REQUEST');
    });
  });

  describe('notFound', () => {
    it('should return 404 status', async () => {
      const response = notFound();
      expect(response.status).toBe(404);
    });

    it('should use default message when none provided', async () => {
      const response = notFound();
      const body = await response.json();
      expect(body.error).toBe('ไม่พบข้อมูลที่ต้องการ');
    });

    it('should use custom message when provided', async () => {
      const response = notFound('ไม่พบผู้ใช้');
      const body = await response.json();
      expect(body.error).toBe('ไม่พบผู้ใช้');
    });
  });

  describe('unauthorized', () => {
    it('should return 401 status', async () => {
      const response = unauthorized();
      expect(response.status).toBe(401);
    });

    it('should use default message when none provided', async () => {
      const response = unauthorized();
      const body = await response.json();
      expect(body.error).toBe('กรุณาเข้าสู่ระบบ');
    });
  });

  describe('forbidden', () => {
    it('should return 403 status', async () => {
      const response = forbidden();
      expect(response.status).toBe(403);
    });

    it('should use default message when none provided', async () => {
      const response = forbidden();
      const body = await response.json();
      expect(body.error).toBe('คุณไม่มีสิทธิ์ดำเนินการนี้');
    });
  });

  describe('badRequest', () => {
    it('should return 400 status', async () => {
      const response = badRequest('Invalid input');
      expect(response.status).toBe(400);
    });

    it('should include error message', async () => {
      const response = badRequest('Invalid input');
      const body = await response.json();
      expect(body.error).toBe('Invalid input');
    });
  });

  describe('serverError', () => {
    it('should return 500 status', async () => {
      const response = serverError();
      expect(response.status).toBe(500);
    });

    it('should use default message when none provided', async () => {
      const response = serverError();
      const body = await response.json();
      expect(body.error).toBe('เกิดข้อผิดพลาดในระบบ');
    });
  });

  describe('handleApiError', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 500 for generic errors', async () => {
      const error = new Error('Something went wrong');
      const response = handleApiError(error);
      expect(response.status).toBe(500);
    });

    it('should handle Prisma unique constraint errors', async () => {
      const error = {
        code: 'P2002',
        name: 'PrismaClientKnownRequestError',
        meta: { target: ['email'] },
        clientVersion: '5.0.0',
      };
      const response = handleApiError(error);
      // Prisma errors get mapped through dbErrors handler
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle Prisma not found errors', async () => {
      const error = {
        code: 'P2025',
        name: 'PrismaClientKnownRequestError',
        message: 'Record not found',
        clientVersion: '5.0.0',
      };
      const response = handleApiError(error);
      // Prisma errors get mapped through dbErrors handler
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle string errors', async () => {
      const response = handleApiError('Simple error string');
      expect(response.status).toBe(500);
    });
  });
});
