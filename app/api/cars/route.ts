import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader, hasPermission } from '@/lib/auth';
import { ApiResponse, CreateCarRequest, Car, Role, PaginatedResponse, CarStatus } from '@/lib/types';
import { USE_MOCK_DB } from '@/lib/mockDb';
import { mockCars } from '@/lib/mockData';

// GET /api/cars - Get all cars
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') as CarStatus | null;
    const search = searchParams.get('search') || '';

    if (USE_MOCK_DB) {
      let filteredCars = [...mockCars];

      if (status) {
        filteredCars = filteredCars.filter(c => c.status === status);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filteredCars = filteredCars.filter(c =>
          c.name.toLowerCase().includes(searchLower) ||
          c.plateNumber.toLowerCase().includes(searchLower)
        );
      }

      const total = filteredCars.length;
      const paginatedCars = filteredCars.slice((page - 1) * limit, page * limit);

      return NextResponse.json<ApiResponse<PaginatedResponse<Car>>>({
        success: true,
        data: {
          data: paginatedCars as Car[],
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Get cars error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรถ' },
      { status: 500 }
    );
  }
}

// POST /api/cars - Create new car (Head Tech/Admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser || !hasPermission(currentUser.role as Role, 'canManageCars')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'คุณไม่มีสิทธิ์ในการจัดการรถ' },
        { status: 403 }
      );
    }

    const body: CreateCarRequest = await request.json();
    const { plateNumber, name, type, description } = body;

    if (!plateNumber || !name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณากรอกทะเบียนรถและชื่อรถ' },
        { status: 400 }
      );
    }

    if (USE_MOCK_DB) {
      // Check if plate number exists
      const existingCar = mockCars.find(c => c.plateNumber === plateNumber);
      if (existingCar) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'ทะเบียนรถนี้มีในระบบแล้ว' },
          { status: 400 }
        );
      }

      const newCar = {
        id: `car-${Date.now()}`,
        plateNumber,
        licensePlate: plateNumber,
        name,
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        type: type || 'รถยนต์',
        status: 'AVAILABLE' as CarStatus,
        mileage: 0,
        description: description || '',
        lastMaintenance: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return NextResponse.json<ApiResponse<Car>>({
        success: true,
        data: newCar as Car,
        message: 'เพิ่มรถสำเร็จ (Mock)',
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Create car error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการเพิ่มรถ' },
      { status: 500 }
    );
  }
}
