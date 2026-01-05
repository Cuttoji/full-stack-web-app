'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button, Input, Select, Modal } from '@/components/ui';
import { CreateTaskRequest, SubUnit, User, Car } from '@/lib/types';
import { X, Calendar, Repeat, Search } from 'lucide-react';

interface CreateTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskRequest) => Promise<void>;
  subUnits: SubUnit[];
  technicians: User[];
  cars: Car[];
}

// Helper function to get day name in Thai
const getDayName = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  return days[date.getDay()];
};

type TaskType = 'single' | 'recurring' | null;

export function CreateTaskForm({
  isOpen,
  onClose,
  onSubmit,
  subUnits,
  technicians,
  cars,
}: CreateTaskFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [taskType, setTaskType] = useState<TaskType>(null);
  const [technicianSearch, setTechnicianSearch] = useState('');
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
    notes: '',
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTaskType(null);
      setTechnicianSearch('');
    }
  }, [isOpen]);

  // Auto-sync: When startDate changes, sync with loop settings
  useEffect(() => {
    if (formData.startDate) {
      setFormData(prev => ({
        ...prev,
        // Auto-set endDate if empty or before startDate
        endDate: prev.endDate && prev.endDate >= prev.startDate ? prev.endDate : prev.startDate,
      }));
    }
  }, [formData.startDate]);

  // Auto-sync: When endDate changes, sync with loopEndDate
  useEffect(() => {
    if (formData.isLoop && formData.endDate) {
      setFormData(prev => ({
        ...prev,
        loopEndDate: prev.loopEndDate && prev.loopEndDate >= prev.endDate ? prev.loopEndDate : prev.endDate,
      }));
    }
  }, [formData.endDate, formData.isLoop]);

  // Set isLoop based on taskType
  useEffect(() => {
    if (taskType === 'recurring') {
      setFormData(prev => ({ ...prev, isLoop: true }));
    } else if (taskType === 'single') {
      setFormData(prev => ({ ...prev, isLoop: false, loopPattern: '', loopEndDate: '' }));
    }
  }, [taskType]);

  // Smart Pattern: Generate label based on start date and pattern
  const smartPatternLabel = useMemo(() => {
    if (!formData.startDate || !formData.loopPattern) return '';
    
    const dayName = getDayName(formData.startDate);
    const date = new Date(formData.startDate);
    const dayOfMonth = date.getDate();
    
    switch (formData.loopPattern) {
      case 'daily':
        return 'ทุกวัน (จ.-ส.) ข้ามวันอาทิตย์';
      case 'weekly':
        return `ทุกวัน${dayName}ของสัปดาห์`;
      case 'monthly':
        return `ทุกวันที่ ${dayOfMonth} ของเดือน`;
      default:
        return '';
    }
  }, [formData.startDate, formData.loopPattern]);

  // Filter technicians based on search
  const filteredTechnicians = useMemo(() => {
    if (!technicianSearch.trim()) return technicians;
    const search = technicianSearch.toLowerCase();
    return technicians.filter(tech => 
      tech.name.toLowerCase().includes(search) ||
      tech.subUnit?.name?.toLowerCase().includes(search)
    );
  }, [technicians, technicianSearch]);

  // Validation
  const validateForm = (): boolean => {
    setValidationError('');
    
    // Check if loopEndDate is before startDate
    if (formData.isLoop && formData.loopEndDate && formData.startDate) {
      if (formData.loopEndDate < formData.startDate) {
        setValidationError('วันสิ้นสุดการวนซ้ำต้องไม่ก่อนวันที่เริ่มงาน');
        return false;
      }
    }
    
    // Check if endDate is before startDate
    if (formData.endDate && formData.startDate) {
      if (formData.endDate < formData.startDate) {
        setValidationError('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
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
        notes: '',
      });
      setValidationError('');
      setTaskType(null);
      setTechnicianSearch('');
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
    // Clear validation error when user makes changes
    if (validationError) setValidationError('');
  };

  // Toggle technician selection (Chips/Tags style)
  const toggleTechnician = (techId: string) => {
    setFormData((prev) => ({
      ...prev,
      assigneeIds: (prev.assigneeIds || []).includes(techId)
        ? (prev.assigneeIds || []).filter(id => id !== techId)
        : [...(prev.assigneeIds || []), techId],
    }));
  };

  // Remove technician from selection
  const removeTechnician = (techId: string) => {
    setFormData((prev) => ({
      ...prev,
      assigneeIds: (prev.assigneeIds || []).filter(id => id !== techId),
    }));
  };

  // Get selected technicians info
  const selectedTechnicians = technicians.filter(t => (formData.assigneeIds || []).includes(t.id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="สร้างงานใหม่" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 text-gray-800 dark:text-gray-200">
        {/* Validation Error */}
        {validationError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            ⚠️ {validationError}
          </div>
        )}

        {/* Task Type Selection */}
        {!taskType && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center">เลือกประเภทงาน</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTaskType('single')}
                className="p-6 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all group"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Calendar className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">งานรายวัน</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">งานที่ทำครั้งเดียว หรือช่วงสั้นๆ</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTaskType('recurring')}
                className="p-6 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all group"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <Repeat className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">งานระยะยาว / วนซ้ำ</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">งานที่ต้องทำซ้ำเป็นประจำ</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Main Form - Show after task type is selected */}
        {taskType && (
          <>
            {/* Task Type Badge */}
            <div className="flex items-center justify-between">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                taskType === 'single' 
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                  : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
              }`}>
                {taskType === 'single' ? (
                  <><Calendar className="w-4 h-4" /> งานรายวัน</>
                ) : (
                  <><Repeat className="w-4 h-4" /> งานระยะยาว / วนซ้ำ</>
                )}
              </div>
              <button
                type="button"
                onClick={() => setTaskType(null)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
              >
                เปลี่ยนประเภท
              </button>
            </div>

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

            {/* Date & Time Section - Different UI based on task type */}
            {taskType === 'single' ? (
              /* Single Task Date Section */
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  กำหนดวันและเวลา
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      type="date"
                      label="วันที่ทำงาน"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                    />
                    {formData.startDate && (
                      <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                        📅 วัน{getDayName(formData.startDate)}
                      </p>
                    )}
                  </div>

                  <Input
                    type="date"
                    label="วันที่เสร็จ (ถ้าหลายวัน)"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    min={formData.startDate}
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
              </div>
            ) : (
              /* Recurring Task Date Section */
              <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-100 dark:border-green-800">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-green-600 dark:text-green-400" />
                  กำหนดการวนซ้ำ
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      type="date"
                      label="วันเริ่มต้น"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                    />
                    {formData.startDate && (
                      <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                        📅 เริ่มวัน{getDayName(formData.startDate)}
                      </p>
                    )}
                  </div>

                  <div>
                    <Select
                      label="รูปแบบการวนซ้ำ"
                      name="loopPattern"
                      value={formData.loopPattern || ''}
                      onChange={handleChange}
                      options={[
                        { value: 'daily', label: 'ทุกวัน (จ.-ส.)' },
                        { value: 'weekly', label: 'ทุกสัปดาห์' },
                        { value: 'monthly', label: 'ทุกเดือน' },
                      ]}
                      placeholder="เลือกรูปแบบ"
                    />
                    {smartPatternLabel && (
                      <p className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">
                        🔄 {smartPatternLabel}
                      </p>
                    )}
                  </div>

                  <Input
                    type="date"
                    label="วันสิ้นสุดการวนซ้ำ"
                    name="loopEndDate"
                    value={formData.loopEndDate || ''}
                    onChange={handleChange}
                    min={formData.startDate}
                    required
                  />

                  <div className="grid grid-cols-2 gap-2">
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
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-1">
                  <span className="text-amber-500">ℹ️</span>
                  งานวนซ้ำจะข้ามวันอาทิตย์โดยอัตโนมัติ
                </p>
              </div>
            )}

            {/* Assignment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Technician Selection with Search */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  มอบหมายให้
                </label>
                
                {/* Selected Technicians as Chips */}
                {selectedTechnicians.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTechnicians.map((tech) => (
                      <span
                        key={tech.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                      >
                        {tech.name}
                        <button
                          type="button"
                          onClick={() => removeTechnician(tech.id)}
                          className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search Input */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อช่าง..."
                    value={technicianSearch}
                    onChange={(e) => setTechnicianSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                </div>

                {/* Available Technicians */}
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto">
                  {filteredTechnicians.length > 0 ? (
                    filteredTechnicians.map((tech) => {
                      const isSelected = (formData.assigneeIds || []).includes(tech.id);
                      return (
                        <button
                          key={tech.id}
                          type="button"
                          onClick={() => toggleTechnician(tech.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400'
                          }`}
                        >
                          {tech.name}
                          {tech.subUnit?.name && (
                            <span className={`ml-1 text-xs ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                              ({tech.subUnit.name})
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                      {technicianSearch ? 'ไม่พบช่างที่ค้นหา' : 'ไม่มีรายชื่อช่าง'}
                    </p>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  คลิกเพื่อเลือก/ยกเลิกช่าง
                </p>
              </div>
            </div>

            {/* Description & Notes */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                  รายละเอียดงาน
                </label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  placeholder="ระบุรายละเอียดงาน..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                  <span className="flex items-center gap-1">
                    📄 รายละเอียดเอกสารที่ต้องตรวจสอบ
                  </span>
                </label>
                <textarea
                  name="documentDetails"
                  value={formData.documentDetails || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  placeholder="เช่น: ใบเสร็จ, ใบส่งมอบงาน, รูปภาพก่อน-หลัง..."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  ระบุเอกสารที่ช่างต้องตรวจสอบก่อนจบงาน
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                  หมายเหตุ
                </label>
                <textarea
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  placeholder="หมายเหตุเพิ่มเติม..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="secondary" onClick={onClose}>
                ยกเลิก
              </Button>
              <Button type="submit" isLoading={isLoading}>
                สร้างงาน
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
