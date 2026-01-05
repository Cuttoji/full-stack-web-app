import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/middleware';
import { ApiResponse, Role, AuthUser } from '@/lib/types';
import { 
  generateRecurringTasks, 
  cleanupExpiredRecurringTasks,
  getUpcomingRecurringTasks 
} from '@/lib/scheduler';

interface SchedulerResult {
  recurring: {
    created: number;
    skipped: number;
    errors: string[];
  };
  cleanup: {
    expired: number;
  };
  timestamp: string;
}

/**
 * POST /api/scheduler/recurring
 * 
 * Trigger recurring task generation manually
 * Should also be called by a cron job (e.g., Vercel Cron, AWS Lambda)
 * 
 * Cron configuration example:
 * - Vercel: Add to vercel.json
 * - Railway/Render: Use built-in cron
 * - External: Use services like cron-job.org
 */
export const POST = withRole(
  [Role.ADMIN, Role.HEAD_TECH],
  async (request: NextRequest, _currentUser: AuthUser) => {
    try {
      const body = await request.json().catch(() => ({}));
      const daysAhead = typeof body.daysAhead === 'number' ? body.daysAhead : 7;

      // Generate recurring tasks
      const recurringResult = await generateRecurringTasks(daysAhead);
      
      // Cleanup expired recurring task templates
      const expiredCount = await cleanupExpiredRecurringTasks();

      const result: SchedulerResult = {
        recurring: recurringResult,
        cleanup: {
          expired: expiredCount,
        },
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json<ApiResponse<SchedulerResult>>({
        success: true,
        data: result,
        message: `สร้างงานซ้ำ ${recurringResult.created} รายการ, ข้าม ${recurringResult.skipped} รายการ`,
      });
    } catch (error) {
      console.error('Scheduler error:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'เกิดข้อผิดพลาดในการประมวลผล Scheduler' },
        { status: 500 }
      );
    }
  }
);

/**
 * GET /api/scheduler/recurring
 * 
 * Preview upcoming recurring tasks
 */
export const GET = withRole(
  [Role.ADMIN, Role.HEAD_TECH, Role.LEADER],
  async (request: NextRequest, _currentUser: AuthUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const daysAhead = parseInt(searchParams.get('daysAhead') || '30');

      const upcoming = await getUpcomingRecurringTasks(daysAhead);

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          upcoming,
          totalTasks: upcoming.reduce((sum, t) => sum + t.nextDates.length, 0),
          daysAhead,
        },
      });
    } catch (error) {
      console.error('Get upcoming recurring tasks error:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลงานซ้ำ' },
        { status: 500 }
      );
    }
  }
);
