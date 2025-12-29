'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useRoleAccess } from '@/contexts/AuthContext';
import { Button, Card, StatusBadge, Modal } from '@/components/ui';
import { ImageUpload } from '@/components/tasks/ImageUpload';
import { PrinterLogForm } from '@/components/tasks/PrinterLogForm';
import { Task, TaskStatus, User, Car, CreatePrinterLogRequest } from '@/lib/types';
import { SUB_UNIT_LABELS } from '@/lib/types';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Car as CarIcon,
  Edit,
  CheckCircle,
  XCircle,
  Play,
  Printer,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin, isFinance, isHeadTech, isLeader, isTech } = useRoleAccess();
  
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isImageUploadOpen, setIsImageUploadOpen] = useState(false);
  const [isPrinterLogOpen, setIsPrinterLogOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isChangeCarModalOpen, setIsChangeCarModalOpen] = useState(false);
  
  // Assignment form
  const [availableTechnicians, setAvailableTechnicians] = useState<User[]>([]);
  const [availableCars, setAvailableCars] = useState<Car[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [selectedCar, setSelectedCar] = useState<string>('');
  const [newCarId, setNewCarId] = useState<string>('');
  
  // Evidence images
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);

  const fetchTask = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setTask(data.data);
      } else {
        router.push('/tasks');
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
      router.push('/tasks');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (params.id) {
      fetchTask();
    }
  }, [params.id, fetchTask]);

  const fetchAvailableCars = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/cars', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setAvailableCars(data.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch cars:', error);
    }
  };

  const fetchAssignmentData = async () => {
    const token = localStorage.getItem('token');
    if (!token || !task) return;

    try {
      const [usersRes, carsRes] = await Promise.all([
        fetch(`/api/users?subUnitId=${task.subUnitId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/cars?status=AVAILABLE`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const usersData = await usersRes.json();
      const carsData = await carsRes.json();

      if (usersData.success) setAvailableTechnicians(usersData.data.data);
      if (carsData.success) setAvailableCars(carsData.data.data);
    } catch (error) {
      console.error('Failed to fetch assignment data:', error);
    }
  };

  const handleAssignTask = async () => {
    if (!task || selectedTechnicians.length === 0) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/tasks/${task.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          technicianIds: selectedTechnicians,
          carId: selectedCar || undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchTask();
        setIsAssignModalOpen(false);
        setSelectedTechnicians([]);
        setSelectedCar('');
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Failed to assign task:', error);
      alert('ไม่สามารถมอบหมายงานได้');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    if (!task) return;
    
    // For DONE status, require evidence photos
    if (newStatus === TaskStatus.DONE && evidenceImages.length === 0) {
      setIsImageUploadOpen(true);
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsUpdating(true);
      const body: { status: TaskStatus; images?: { url: string; description?: string }[] } = {
        status: newStatus,
      };
      
      if (newStatus === TaskStatus.DONE && evidenceImages.length > 0) {
        body.images = evidenceImages.map((url) => ({ url }));
      }

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (result.success) {
        await fetchTask();
        setEvidenceImages([]);
        setIsImageUploadOpen(false);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('ไม่สามารถอัปเดตสถานะได้');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelTask = async () => {
    if (!task) return;
    await handleUpdateStatus(TaskStatus.CANCELLED);
    setIsCancelConfirmOpen(false);
  };

  const handleSubmitPrinterLog = async (data: CreatePrinterLogRequest) => {
    const token = localStorage.getItem('token');
    if (!token || !task) return;

    const response = await fetch('/api/printer-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...data, taskId: task.id }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }

    await fetchTask();
  };

  const handleImageCapture = (imageUrl: string) => {
    setEvidenceImages((prev) => [...prev, imageUrl]);
  };

  const handleChangeCar = async () => {
    if (!task || !newCarId) {
      alert('กรุณาเลือกรถ');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ carId: newCarId }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchTask();
        setIsChangeCarModalOpen(false);
        setNewCarId('');
        alert('เปลี่ยนรถสำเร็จ');
      } else {
        alert(result.error || 'ไม่สามารถเปลี่ยนรถได้');
      }
    } catch (error) {
      console.error('Failed to change car:', error);
      alert('เกิดข้อผิดพลาด');
    } finally {
      setIsUpdating(false);
    }
  };

  const openChangeCarModal = () => {
    fetchAvailableCars();
    setNewCarId(task?.carId || '');
    setIsChangeCarModalOpen(true);
  };

  const openAssignModal = () => {
    fetchAssignmentData();
    setIsAssignModalOpen(true);
  };

  // Check permissions
  const canAssign = isHeadTech || isLeader;
  const canUpdateStatus = isLeader || isTech;
  const canCancel = isAdmin || isFinance;
  const isPrinterUnit = task?.subUnit?.type === 'PRINTER';

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4 text-gray-800">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </DashboardLayout>
    );
  }

  if (!task) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-gray-800">
          <p className="text-gray-900">ไม่พบงานที่ต้องการ</p>
          <Link href="/tasks">
            <Button className="mt-4">กลับไปหน้างาน</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 text-gray-800 mt-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/tasks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <StatusBadge status={task.status} type="task" />
            </div>
            <p className="text-gray-900 text-sm mt-1">
              สร้างเมื่อ {formatDateTime(task.createdAt)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Details */}
            <Card>
              <h2 className="text-lg font-semibold mb-4">รายละเอียดงาน</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">คำอธิบาย</h3>
                  <p className="text-gray-900">{task.description || '-'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> วันที่นัดหมาย
                    </h3>
                    <p className="text-gray-900">{formatDate(task.scheduledDate)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> เวลา
                    </h3>
                    <p className="text-gray-900">
                      {task.startTime || '-'} - {task.endTime || '-'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> สถานที่
                  </h3>
                  <p className="text-gray-900">{task.location || '-'}</p>
                </div>

                {task.customerName && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">ลูกค้า</h3>
                    <p className="text-gray-900">{task.customerName}</p>
                    {task.customerPhone && (
                      <p className="text-sm text-gray-900">{task.customerPhone}</p>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">กลุ่มงาน</h3>
                  <p className="text-gray-900">
                    {task.subUnit?.name || '-'}
                    {task.subUnit?.type && (
                      <span className="ml-2 text-sm text-gray-900">
                        ({SUB_UNIT_LABELS[task.subUnit.type as keyof typeof SUB_UNIT_LABELS]})
                      </span>
                    )}
                  </p>
                </div>

                {task.isLoop && task.loopInterval && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-900 mb-1">งานวนซ้ำ</h3>
                    <p className="text-blue-700">
                      ซ้ำทุก{' '}
                      {task.loopInterval === 'DAILY'
                        ? 'วัน'
                        : task.loopInterval === 'WEEKLY'
                        ? 'สัปดาห์'
                        : task.loopInterval === 'MONTHLY'
                        ? 'เดือน'
                        : 'ปี'}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Assignments */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">ผู้รับผิดชอบ</h2>
                {canAssign && task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED && (
                  <Button size="sm" variant="outline" onClick={openAssignModal}>
                    <Edit className="w-4 h-4 mr-1" />
                    มอบหมาย
                  </Button>
                )}
              </div>

              {task.assignments && task.assignments.length > 0 ? (
                <div className="space-y-3">
                  {task.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{assignment.user?.name}</p>
                          <p className="text-sm text-gray-900">{assignment.user?.phone || '-'}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        assignment.isPrimary
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        {assignment.isPrimary ? 'หลัก' : 'ผู้ช่วย'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-900 text-center py-4">ยังไม่มีผู้รับผิดชอบ</p>
              )}

              {task.car && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      <CarIcon className="w-4 h-4" /> รถที่ใช้
                    </h3>
                    {(isAdmin || isFinance) && task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED && (
                      <Button size="sm" variant="ghost" onClick={openChangeCarModal}>
                        <Edit className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-gray-900">
                    {task.car.licensePlate} - {task.car.brand} {task.car.model}
                  </p>
                </div>
              )}
            </Card>

            {/* Evidence Images */}
            {task.images && task.images.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold mb-4">หลักฐานการทำงาน</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {task.images.map((image, index) => (
                    <div key={image.id} className="relative aspect-square">
                      <Image
                        src={image.url}
                        alt={`Evidence ${index + 1}`}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Printer Logs */}
            {isPrinterUnit && task.printerLogs && task.printerLogs.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Printer className="w-5 h-5" />
                  บันทึกการซ่อม
                </h2>
                <div className="space-y-4">
                  {task.printerLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">รุ่นเครื่อง</p>
                          <p className="font-medium">{log.printerModel}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Serial Number</p>
                          <p className="font-medium">{log.serialNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">ปัญหา</p>
                          <p className="font-medium">{log.problemDescription}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">วิธีแก้ไข</p>
                          <p className="font-medium">{log.solution}</p>
                        </div>
                      </div>
                      {log.partsUsed && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-gray-500">อะไหล่ที่ใช้</p>
                          <p className="font-medium">{log.partsUsed}</p>
                        </div>
                      )}
                      {log.notes && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">หมายเหตุ</p>
                          <p className="font-medium">{log.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            {/* Status Actions */}
            {canUpdateStatus && task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED && (
              <Card>
                <h2 className="text-lg font-semibold mb-4">ดำเนินการ</h2>
                <div className="space-y-3">
                  {task.status === TaskStatus.WAITING && (
                    <Button
                      className="w-full"
                      onClick={() => handleUpdateStatus(TaskStatus.IN_PROGRESS)}
                      disabled={isUpdating}
                      leftIcon={<Play className="w-4 h-4" />}
                    >
                      เริ่มทำงาน
                    </Button>
                  )}

                  {task.status === TaskStatus.IN_PROGRESS && (
                    <>
                      <Button
                        className="w-full"
                        variant="success"
                        onClick={() => setIsImageUploadOpen(true)}
                        disabled={isUpdating}
                        leftIcon={<CheckCircle className="w-4 h-4" />}
                      >
                        จบงาน
                      </Button>

                      {isPrinterUnit && (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => setIsPrinterLogOpen(true)}
                          leftIcon={<FileText className="w-4 h-4" />}
                        >
                          บันทึกการซ่อม
                        </Button>
                      )}
                    </>
                  )}

                  {canCancel && (
                    <Button
                      className="w-full"
                      variant="destructive"
                      onClick={() => setIsCancelConfirmOpen(true)}
                      disabled={isUpdating}
                      leftIcon={<XCircle className="w-4 h-4" />}
                    >
                      ยกเลิกงาน
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Task Created By */}
            <Card>
              <h2 className="text-lg font-semibold mb-4">สร้างโดย</h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">{task.createdBy?.name || '-'}</p>
                  <p className="text-sm text-gray-500">{task.createdBy?.role || '-'}</p>
                </div>
              </div>
            </Card>

            {/* Activity */}
            <Card>
              <h2 className="text-lg font-semibold mb-4">ประวัติ</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>สร้างเมื่อ {formatDateTime(task.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>อัปเดตล่าสุด {formatDateTime(task.updatedAt)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="มอบหมายงาน"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เลือกช่าง (เลือกได้หลายคน)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
              {availableTechnicians.map((tech) => (
                <label key={tech.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedTechnicians.includes(tech.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTechnicians((prev) => [...prev, tech.id]);
                      } else {
                        setSelectedTechnicians((prev) => prev.filter((id) => id !== tech.id));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span>{tech.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">รถ (ถ้ามี)</label>
            <select
              value={selectedCar}
              onChange={(e) => setSelectedCar(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ไม่ใช้รถ</option>
              {availableCars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.licensePlate} - {car.brand} {car.model}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setIsAssignModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              className="flex-1"
              onClick={handleAssignTask}
              disabled={selectedTechnicians.length === 0 || isUpdating}
              isLoading={isUpdating}
            >
              ยืนยัน
            </Button>
          </div>
        </div>
      </Modal>

      {/* Image Upload Modal */}
      <Modal
        isOpen={isImageUploadOpen}
        onClose={() => setIsImageUploadOpen(false)}
        title="อัปโหลดหลักฐาน"
      >
        <div className="space-y-4">
          <p className="text-gray-500 text-sm">
            กรุณาถ่ายรูปหลักฐานการทำงานก่อนจบงาน
          </p>

          <ImageUpload onCapture={handleImageCapture} />

          {evidenceImages.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                รูปที่อัปโหลด ({evidenceImages.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {evidenceImages.map((url, index) => (
                  <div key={index} className="relative aspect-square">
                    <Image
                      src={url}
                      alt={`Upload ${index + 1}`}
                      fill
                      className="object-cover rounded"
                    />
                    <button
                      onClick={() => setEvidenceImages((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 z-10"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setIsImageUploadOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              className="flex-1"
              variant="success"
              onClick={() => handleUpdateStatus(TaskStatus.DONE)}
              disabled={evidenceImages.length === 0 || isUpdating}
              isLoading={isUpdating}
            >
              จบงาน
            </Button>
          </div>
        </div>
      </Modal>

      {/* Printer Log Modal */}
      <PrinterLogForm
        isOpen={isPrinterLogOpen}
        onClose={() => setIsPrinterLogOpen(false)}
        onSubmit={handleSubmitPrinterLog}
      />

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        title="ยืนยันการยกเลิก"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-medium text-red-900">คุณต้องการยกเลิกงานนี้หรือไม่?</p>
              <p className="text-sm text-red-700">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setIsCancelConfirmOpen(false)}>
              ไม่
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleCancelTask}
              disabled={isUpdating}
              isLoading={isUpdating}
            >
              ยืนยันยกเลิก
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Car Modal */}
      <Modal
        isOpen={isChangeCarModalOpen}
        onClose={() => {
          setIsChangeCarModalOpen(false);
          setNewCarId('');
        }}
        title="เปลี่ยนรถ"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>หมายเหตุ:</strong> การเปลี่ยนรถจะไม่ตรวจสอบความขัดแย้ง รถ 1 คันสามารถรับหลายงานพร้อมกันได้
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              รถปัจจุบัน
            </label>
            <p className="text-gray-700 p-3 bg-gray-50 rounded-lg">
              {task?.car 
                ? `${task.car.licensePlate} - ${task.car.brand} ${task.car.model}`
                : 'ไม่มี'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              เลือกรถใหม่ <span className="text-red-500">*</span>
            </label>
            <select
              value={newCarId}
              onChange={(e) => setNewCarId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- ไม่ระบุรถ --</option>
              {availableCars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.licensePlate} - {car.brand} {car.model} ({car.status === 'AVAILABLE' ? 'ว่าง' : car.status === 'IN_USE' ? 'ใช้งานอยู่' : car.status})
                </option>
              ))}
            </select>
          </div>

          {task?.car && newCarId && newCarId !== task.carId && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                คุณกำลังเปลี่ยนจาก <strong>{task.car.licensePlate}</strong> เป็นรถคันใหม่
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => {
                setIsChangeCarModalOpen(false);
                setNewCarId('');
              }}
            >
              ยกเลิก
            </Button>
            <Button
              className="flex-1"
              onClick={handleChangeCar}
              disabled={!newCarId || isUpdating}
              isLoading={isUpdating}
            >
              ยืนยันเปลี่ยนรถ
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
