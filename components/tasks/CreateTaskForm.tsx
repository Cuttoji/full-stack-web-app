'use client';

import { useState } from 'react';
import { Button, Input, Select, Modal } from '@/components/ui';
import { CreateTaskRequest, SubUnit, User, Car } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

interface CreateTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskRequest) => Promise<void>;
  subUnits: SubUnit[];
  technicians: User[];
  cars: Car[];
}

export function CreateTaskForm({
  isOpen,
  onClose,
  onSubmit,
  subUnits,
  technicians,
  cars,
}: CreateTaskFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    location: '',
    customerName: '',
    customerPhone: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    isLoop: false,
    loopPattern: '',
    loopEndDate: '',
    subUnitId: '',
    carId: '',
    assigneeIds: [],
    priority: 1,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        title: '',
        description: '',
        location: '',
        customerName: '',
        customerPhone: '',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        isLoop: false,
        loopPattern: '',
        loopEndDate: '',
        subUnitId: '',
        carId: '',
        assigneeIds: [],
        priority: 1,
        notes: '',
      });
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({
      ...prev,
      assigneeIds: selectedOptions,
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="สร้างงานใหม่" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 text-gray-800">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="ชื่องาน"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="ระบุชื่องาน"
            />
          </div>

          <Input
            label="ชื่อลูกค้า"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            placeholder="ระบุชื่อลูกค้า"
          />

          <Input
            label="เบอร์โทรลูกค้า"
            name="customerPhone"
            value={formData.customerPhone}
            onChange={handleChange}
            placeholder="0xx-xxx-xxxx"
          />

          <div className="md:col-span-2">
            <Input
              label="สถานที่"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="ระบุสถานที่ปฏิบัติงาน"
            />
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="date"
            label="วันที่เริ่ม"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            required
          />

          <Input
            type="date"
            label="วันที่สิ้นสุด"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            required
          />

          <Input
            type="time"
            label="เวลาเริ่ม"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
          />

          <Input
            type="time"
            label="เวลาสิ้นสุด"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
          />
        </div>

        {/* Loop Settings */}
        <div className="space-y-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="isLoop"
              checked={formData.isLoop}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-900">งานวนซ้ำ</span>
          </label>

          {formData.isLoop && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
              <Select
                label="รูปแบบการวนซ้ำ"
                name="loopPattern"
                value={formData.loopPattern || ''}
                onChange={handleChange}
                options={[
                  { value: 'daily', label: 'ทุกวัน' },
                  { value: 'weekly', label: 'ทุกสัปดาห์' },
                  { value: 'monthly', label: 'ทุกเดือน' },
                ]}
                placeholder="เลือกรูปแบบ"
              />

              <Input
                type="date"
                label="วันสิ้นสุดการวนซ้ำ"
                name="loopEndDate"
                value={formData.loopEndDate || ''}
                onChange={handleChange}
              />
            </div>
          )}
        </div>

        {/* Assignment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="กลุ่มงาน"
            name="subUnitId"
            value={formData.subUnitId || ''}
            onChange={handleChange}
            options={subUnits.map((unit) => ({
              value: unit.id,
              label: unit.name,
            }))}
            placeholder="เลือกกลุ่มงาน"
          />

          <Select
            label="รถ/เครื่องมือ"
            name="carId"
            value={formData.carId || ''}
            onChange={handleChange}
            options={cars
              .filter((car) => car.status === 'AVAILABLE')
              .map((car) => ({
                value: car.id,
                label: `${car.licensePlate} - ${car.brand} ${car.model || ''}`.trim(),
              }))}
            placeholder="เลือกรถ"
          />

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              มอบหมายให้
            </label>
            <select
              multiple
              name="assigneeIds"
              value={formData.assigneeIds}
              onChange={handleAssigneeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              size={4}
            >
              {technicians.length > 0 ? (
                technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} ({tech.subUnit?.name || 'ไม่ระบุ'})
                  </option>
                ))
              ) : (
                <option disabled>ไม่มีรายชื่อช่าง</option>
              )}
            </select>
            <p className="mt-1 text-xs text-gray-700">
              กด Ctrl/Cmd ค้างเพื่อเลือกหลายคน
            </p>
          </div>
        </div>

        {/* Description & Notes */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              รายละเอียดงาน
            </label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ระบุรายละเอียดงาน..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              หมายเหตุ
            </label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="หมายเหตุเพิ่มเติม..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" isLoading={isLoading}>
            สร้างงาน
          </Button>
        </div>
      </form>
    </Modal>
  );
}
