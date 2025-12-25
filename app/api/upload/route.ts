import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { ApiResponse } from '@/lib/types';

// POST /api/upload - Handle image uploads (base64)
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

    const body = await request.json();
    const { taskId, imageBase64, imageType, description } = body;

    if (!taskId || !imageBase64 || !imageType) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ไม่พบงาน' },
        { status: 404 }
      );
    }

    // In production, you would upload to Cloudinary or other storage
    // For now, we'll store the base64 directly (not recommended for production)
    // This should be replaced with actual cloud storage integration
    
    // Example Cloudinary integration:
    // const cloudinary = require('cloudinary').v2;
    // const result = await cloudinary.uploader.upload(imageBase64, { folder: 'task-images' });
    // const imageUrl = result.secure_url;

    // For demo purposes, we'll just store a placeholder URL
    const imageUrl = `data:image/jpeg;base64,${imageBase64.substring(0, 100)}...`; // Truncated for DB
    
    const taskImage = await prisma.taskImage.create({
      data: {
        taskId,
        uploadedBy: currentUser.id,
        imageUrl: imageBase64, // In production, use actual cloud URL
        imageType,
        description,
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: taskImage,
      message: 'อัปโหลดรูปภาพสำเร็จ',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ' },
      { status: 500 }
    );
  }
}
