'use client';

import { useState } from 'react';
import { Button, Input, Modal } from '@/components/ui';
import { CreatePrinterLogRequest, PartDetail } from '@/lib/types';
import { Plus, Trash2 } from 'lucide-react';

export interface PrinterLogFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePrinterLogRequest) => Promise<void>;
  taskId?: string;
}

export function PrinterLogForm({ isOpen, onClose, onSubmit, taskId }: PrinterLogFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<CreatePrinterLogRequest, 'taskId'>>({
    printerModel: '',
    serialNumber: '',
    problemDescription: '',
    symptom: '',
    diagnosis: '',
    solution: '',
    partsUsed: '',
    partsDetail: [],
    laborTime: undefined,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit({ ...formData, taskId });
      onClose();
    } catch (error) {
      console.error('Error creating printer log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'laborTime' ? (value ? parseInt(value) : undefined) : value,
    }));
  };

  const addPart = () => {
    setFormData((prev) => ({
      ...prev,
      partsDetail: [...(prev.partsDetail || []), { name: '', quantity: 1, price: 0 }],
    }));
  };

  const removePart = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      partsDetail: prev.partsDetail?.filter((_, i) => i !== index) || [],
    }));
  };

  const updatePart = (index: number, field: keyof PartDetail, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      partsDetail: prev.partsDetail?.map((part, i) =>
        i === index ? { ...part, [field]: value } : part
      ) || [],
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="บันทึกการซ่อมปริ้นเตอร์" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Printer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="รุ่นเครื่องพิมพ์"
            name="printerModel"
            value={formData.printerModel || ''}
            onChange={handleChange}
            placeholder="เช่น HP LaserJet Pro M404dn"
          />

          <Input
            label="Serial Number"
            name="serialNumber"
            value={formData.serialNumber || ''}
            onChange={handleChange}
            placeholder="ระบุ S/N"
          />
        </div>

        {/* Problem & Solution */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              อาการ/ปัญหา <span className="text-red-500">*</span>
            </label>
            <textarea
              name="symptom"
              value={formData.symptom}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="อธิบายอาการหรือปัญหาที่พบ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              การวินิจฉัย
            </label>
            <textarea
              name="diagnosis"
              value={formData.diagnosis || ''}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ระบุสาเหตุของปัญหา..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              วิธีแก้ไข <span className="text-red-500">*</span>
            </label>
            <textarea
              name="solution"
              value={formData.solution}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="อธิบายขั้นตอนการแก้ไข..."
            />
          </div>
        </div>

        {/* Parts Used */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-900">
              อะไหล่ที่ใช้
            </label>
            <Button type="button" variant="ghost" size="sm" onClick={addPart}>
              <Plus className="w-4 h-4 mr-1" />
              เพิ่มอะไหล่
            </Button>
          </div>

          {formData.partsDetail && formData.partsDetail.length > 0 && (
            <div className="space-y-2">
              {formData.partsDetail.map((part, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder="ชื่ออะไหล่"
                    value={part.name}
                    onChange={(e) => updatePart(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="จำนวน"
                    value={part.quantity}
                    onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value))}
                    className="w-20"
                    min={1}
                  />
                  <Input
                    type="number"
                    placeholder="ราคา"
                    value={part.price || ''}
                    onChange={(e) => updatePart(index, 'price', parseFloat(e.target.value))}
                    className="w-28"
                    min={0}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePart(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Input
            label="สรุปอะไหล่ที่ใช้"
            name="partsUsed"
            value={formData.partsUsed || ''}
            onChange={handleChange}
            placeholder="เช่น Toner 1 ตลับ, Drum 1 ชุด"
          />
        </div>

        {/* Labor Time & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="number"
            label="เวลาทำงาน (นาที)"
            name="laborTime"
            value={formData.laborTime || ''}
            onChange={handleChange}
            min={0}
            placeholder="ระบุเวลาที่ใช้"
          />

          <div className="md:col-span-2">
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
            บันทึก
          </Button>
        </div>
      </form>
    </Modal>
  );
}
