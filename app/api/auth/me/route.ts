import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { ApiResponse, AuthUser } from '@/lib/types';

// GET /api/auth/me - Get current user
export const GET = withAuth(async (_request, user) => {
  return NextResponse.json<ApiResponse<AuthUser>>({
    success: true,
    data: user,
  });
});
