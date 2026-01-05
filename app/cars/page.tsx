'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useRoleAccess } from '@/contexts/AuthContext';
import { Button, Card, Modal } from '@/components/ui';
import { Car, CarStatus, CreateCarRequest } from '@/lib/types';
import { CAR_STATUS_LABELS } from '@/lib/types';
import {
  Plus,
  Car as CarIcon,
  Search,
  Edit,
  Trash2,
  Calendar,
  Wrench,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function CarsPage() {
  const { isAdmin, isHeadTech } = useRoleAccess();
  
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Form states
  const [formData, setFormData] = useState<CreateCarRequest>({
    licensePlate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    status: CarStatus.AVAILABLE,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCars = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/cars?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setCars(data.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch cars:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const handleCreateCar = async () => {
    setFormError('');
    
    if (!formData.licensePlate || !formData.brand || !formData.model) {
      setFormError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/cars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setIsCreateModalOpen(false);
        resetForm();
        fetchCars();
      } else {
        setFormError(result.error || 'ไม่สามารถเพิ่มรถได้');
      }
    } catch {
      setFormError('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCar = async () => {
    if (!selectedCar) return;
    setFormError('');

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/cars/${selectedCar.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setIsEditModalOpen(false);
        setSelectedCar(null);
        resetForm();
        fetchCars();
      } else {
        setFormError(result.error || 'ไม่สามารถอัปเดตได้');
      }
    } catch {
      setFormError('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCar = async () => {
    if (!selectedCar) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/cars/${selectedCar.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (result.success) {
        setIsDeleteConfirmOpen(false);
        setSelectedCar(null);
        fetchCars();
      } else {
        alert(result.error || 'ไม่สามารถลบได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (car: Car) => {
    setSelectedCar(car);
    setFormData({
      licensePlate: car.licensePlate,
      brand: car.brand,
      model: car.model || '',
      year: car.year || new Date().getFullYear(),
      status: car.status,
      mileage: car.mileage || undefined,
      lastMaintenanceDate: car.lastMaintenanceDate
        ? new Date(car.lastMaintenanceDate).toISOString().split('T')[0]
        : undefined,
      notes: car.notes || undefined,
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const openDeleteConfirm = (car: Car) => {
    setSelectedCar(car);
    setIsDeleteConfirmOpen(true);
  };

  const resetForm = () => {
    setFormData({
      licensePlate: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      status: CarStatus.AVAILABLE,
    });
    setFormError('');
  };

  const getStatusColor = (status: CarStatus) => {
    switch (status) {
      case CarStatus.AVAILABLE:
        return 'bg-green-100 text-green-700';
      case CarStatus.IN_USE:
        return 'bg-blue-100 text-blue-700';
      case CarStatus.MAINTENANCE:
        return 'bg-yellow-100 text-yellow-700';
      case CarStatus.OUT_OF_SERVICE:
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: CarStatus) => {
    switch (status) {
      case CarStatus.AVAILABLE:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case CarStatus.IN_USE:
        return <CarIcon className="w-5 h-5 text-blue-500" />;
      case CarStatus.MAINTENANCE:
        return <Wrench className="w-5 h-5 text-yellow-500" />;
      case CarStatus.OUT_OF_SERVICE:
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <CarIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const canManage = isAdmin || isHeadTech;

  return (
    <DashboardLayout>
      <div className="space-y-6 text-gray-800 mt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">จัดการรถ</h1>
            <p className="text-gray-700">ดูและจัดการรถทั้งหมด</p>
          </div>
          {canManage && (
            <Button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              เพิ่มรถ
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">ว่าง</p>
                <p className="text-2xl font-bold text-green-600">
                  {cars.filter((c) => c.status === CarStatus.AVAILABLE).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">ใช้งานอยู่</p>
                <p className="text-2xl font-bold text-blue-600">
                  {cars.filter((c) => c.status === CarStatus.IN_USE).length}
                </p>
              </div>
              <CarIcon className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">ซ่อมบำรุง</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {cars.filter((c) => c.status === CarStatus.MAINTENANCE).length}
                </p>
              </div>
              <Wrench className="w-8 h-8 text-yellow-500" />
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">ไม่พร้อมใช้งาน</p>
                <p className="text-2xl font-bold text-red-600">
                  {cars.filter((c) => c.status === CarStatus.OUT_OF_SERVICE).length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card padding="sm">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 w-full md:max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาทะเบียน, ยี่ห้อ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ทุกสถานะ</option>
              <option value="AVAILABLE">ว่าง</option>
              <option value="IN_USE">ใช้งานอยู่</option>
              <option value="MAINTENANCE">ซ่อมบำรุง</option>
              <option value="OUT_OF_SERVICE">ไม่พร้อมใช้งาน</option>
            </select>
          </div>
        </Card>

        {/* Cars List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : cars.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cars.map((car) => (
              <Card key={car.id} className="relative">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(car.status)}
                      <div>
                        <h3 className="font-semibold text-gray-900">{car.licensePlate}</h3>
                        <p className="text-sm text-gray-700">
                          {car.brand} {car.model}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(car.status)}`}
                    >
                      {CAR_STATUS_LABELS[car.status]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {car.year && (
                      <div>
                        <p className="text-gray-700">ปี</p>
                        <p className="font-medium">{car.year + 543}</p>
                      </div>
                    )}
                    {car.mileage && (
                      <div>
                        <p className="text-gray-700">เลขไมล์</p>
                        <p className="font-medium">{car.mileage.toLocaleString()} กม.</p>
                      </div>
                    )}
                  </div>

                  {car.lastMaintenanceDate && (
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Calendar className="w-4 h-4" />
                      <span>ซ่อมบำรุงล่าสุด: {formatDate(car.lastMaintenanceDate)}</span>
                    </div>
                  )}

                  {car.notes && (
                    <p className="text-sm text-gray-700 line-clamp-2">{car.notes}</p>
                  )}

                  {canManage && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => openEditModal(car)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        แก้ไข
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDeleteConfirm(car)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12 text-gray-700">
              <CarIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">ไม่พบรถ</p>
              <p className="text-sm">ลองเปลี่ยนตัวกรองหรือเพิ่มรถใหม่</p>
            </div>
          </Card>
        )}
      </div>

      {/* Create/Edit Car Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedCar(null);
          resetForm();
        }}
        title={isEditModalOpen ? 'แก้ไขข้อมูลรถ' : 'เพิ่มรถใหม่'}
      >
        <div className="space-y-4 text-gray-800">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ทะเบียนรถ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.licensePlate || ''}
              onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="กข 1234"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ยี่ห้อ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Toyota"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รุ่น <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Hilux Revo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ปี</label>
              <input
                type="number"
                value={formData.year || new Date().getFullYear()}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เลขไมล์</label>
              <input
                type="number"
                value={formData.mileage || ''}
                onChange={(e) =>
                  setFormData({ ...formData, mileage: e.target.value ? parseInt(e.target.value) : undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as CarStatus })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="AVAILABLE">ว่าง</option>
              <option value="IN_USE">ใช้งานอยู่</option>
              <option value="MAINTENANCE">ซ่อมบำรุง</option>
              <option value="OUT_OF_SERVICE">ไม่พร้อมใช้งาน</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              วันที่ซ่อมบำรุงล่าสุด
            </label>
            <input
              type="date"
              value={formData.lastMaintenanceDate || ''}
              onChange={(e) => setFormData({ ...formData, lastMaintenanceDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="รายละเอียดเพิ่มเติม..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedCar(null);
                resetForm();
              }}
            >
              ยกเลิก
            </Button>
            <Button
              className="flex-1"
              onClick={isEditModalOpen ? handleUpdateCar : handleCreateCar}
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {isEditModalOpen ? 'บันทึก' : 'เพิ่ม'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setSelectedCar(null);
        }}
        title="ยืนยันการลบ"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-medium text-red-900">คุณต้องการลบรถนี้หรือไม่?</p>
              <p className="text-sm text-red-700">
                {selectedCar?.licensePlate} - {selectedCar?.brand} {selectedCar?.model}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setSelectedCar(null);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteCar}
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              ลบ
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
