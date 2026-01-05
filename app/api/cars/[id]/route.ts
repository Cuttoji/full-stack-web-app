import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, getTokenFromHeader, hasPermission } from '@/lib/auth';
import { ApiResponse, Car, Role } from '@/lib/types';

// GET /api/cars/[id] - Get car by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const car = await prisma.car.findUnique({
      where: { id },
    });

    if (!car) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบรถ' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Car>>({
      success: true,
      data: car as Car,
    });
  } catch (error) {
    console.error('Get car error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรถ' },
      { status: 500 }
    );
  }
}

// PATCH /api/cars/[id] - Update car
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    // Only users with canManageCars permission can update cars
    if (!hasPermission(currentUser.role as Role, 'canManageCars')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลรถ' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Check if car exists
    const existingCar = await prisma.car.findUnique({
      where: { id },
    });

    if (!existingCar) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบรถ' },
        { status: 404 }
      );
    }

    // Check if new plate number is unique (if being changed)
    if (body.plateNumber && body.plateNumber !== existingCar.plateNumber) {
      const duplicateCar = await prisma.car.findUnique({
        where: { plateNumber: body.plateNumber },
      });

      if (duplicateCar) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'ทะเบียนรถนี้มีในระบบแล้ว' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (body.plateNumber !== undefined) {
      updateData.plateNumber = body.plateNumber;
      updateData.licensePlate = body.plateNumber;
    }
    if (body.licensePlate !== undefined) {
      updateData.licensePlate = body.licensePlate;
      updateData.plateNumber = body.licensePlate;
    }
    if (body.name !== undefined) updateData.name = body.name;
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.year !== undefined) updateData.year = body.year;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.mileage !== undefined) updateData.mileage = body.mileage;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.lastServiceDate !== undefined) {
      updateData.lastServiceDate = body.lastServiceDate ? new Date(body.lastServiceDate) : null;
    }
    if (body.nextServiceDate !== undefined) {
      updateData.nextServiceDate = body.nextServiceDate ? new Date(body.nextServiceDate) : null;
    }
    if (body.insuranceExpiry !== undefined) {
      updateData.insuranceExpiry = body.insuranceExpiry ? new Date(body.insuranceExpiry) : null;
    }
    if (body.registrationExpiry !== undefined) {
      updateData.registrationExpiry = body.registrationExpiry ? new Date(body.registrationExpiry) : null;
    }

    const car = await prisma.car.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json<ApiResponse<Car>>({
      success: true,
      data: car as Car,
      message: 'อัปเดตข้อมูลรถสำเร็จ',
    });
  } catch (error) {
    console.error('Update car error:', error);
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดตรถ';
    return NextResponse.json<ApiResponse>(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/cars/[id] - Delete car
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser || !hasPermission(currentUser.role as Role, 'canManageCars')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ในการลบรถ' },
        { status: 403 }
      );
    }

    // Check if car is being used in any tasks
    const tasksUsingCar = await prisma.task.count({
      where: { carId: id },
    });

    if (tasksUsingCar > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `ไม่สามารถลบรถได้ เนื่องจากมีงานที่ใช้รถนี้อยู่ ${tasksUsingCar} งาน` },
        { status: 400 }
      );
    }

    await prisma.car.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'ลบรถสำเร็จ',
    });
  } catch (error) {
    console.error('Delete car error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบรถ' },
      { status: 500 }
    );
  }
}
