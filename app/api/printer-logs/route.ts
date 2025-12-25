import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { ApiResponse, CreatePrinterLogRequest, PrinterLog } from '@/lib/types';

// POST /api/printer-logs - Create printer log
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const body: CreatePrinterLogRequest = await request.json();
    const {
      taskId,
      printerModel,
      serialNumber,
      symptom,
      diagnosis,
      solution,
      partsUsed,
      partsDetail,
      laborTime,
      notes,
    } = body;

    if (!taskId || !symptom || !solution) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณากรอกข้อมูลที่จำเป็น (อาการ/วิธีแก้ไข)' },
        { status: 400 }
      );
    }

    // Verify task exists and is printer type
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { subUnit: true },
    });

    if (!task) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบงาน' },
        { status: 404 }
      );
    }

    if (task.subUnit?.type !== 'PRINTER') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'งานนี้ไม่ใช่งานปริ้นเตอร์' },
        { status: 400 }
      );
    }

    const printerLog = await prisma.printerLog.create({
      data: {
        taskId,
        technicianId: currentUser.id,
        printerModel,
        serialNumber,
        symptom,
        diagnosis,
        solution,
        partsUsed,
        partsDetail: partsDetail as any,
        laborTime,
        notes,
      },
      include: {
        task: {
          select: { id: true, jobNumber: true, title: true },
        },
        technician: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json<ApiResponse<PrinterLog>>({
      success: true,
      data: printerLog as any,
      message: 'บันทึกข้อมูลการซ่อมสำเร็จ',
    });
  } catch (error) {
    console.error('Create printer log error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}

// GET /api/printer-logs - Get printer logs
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const technicianId = searchParams.get('technicianId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    if (taskId) where.taskId = taskId;
    if (technicianId) where.technicianId = technicianId;

    const [logs, total] = await Promise.all([
      prisma.printerLog.findMany({
        where,
        include: {
          task: {
            select: { id: true, jobNumber: true, title: true, customerName: true },
          },
          technician: {
            select: { id: true, name: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.printerLog.count({ where }),
    ]);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        data: logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get printer logs error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}
