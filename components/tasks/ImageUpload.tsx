'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ImageUploadProps {
  onImageCapture?: (imageBase64: string) => void;
  onCapture?: (imageUrl: string) => void;
  imageType?: 'BEFORE' | 'AFTER' | 'EVIDENCE';
  existingImages?: string[];
  onRemoveImage?: (index: number) => void;
  maxImages?: number;
  required?: boolean;
}

export function ImageUpload({
  onImageCapture,
  onCapture,
  imageType = 'EVIDENCE',
  existingImages = [],
  onRemoveImage,
  maxImages = 5,
  required = false,
}: ImageUploadProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = (imageBase64: string) => {
    if (onImageCapture) {
      onImageCapture(imageBase64);
    }
    if (onCapture) {
      // Convert to data URL for onCapture
      onCapture(`data:image/jpeg;base64,${imageBase64}`);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
        handleImageCapture(imageBase64.split(',')[1]);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        handleImageCapture(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const imageTypeLabels = {
    BEFORE: 'ก่อนทำงาน',
    AFTER: 'หลังทำงาน',
    EVIDENCE: 'หลักฐาน',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-900">
          รูปภาพ{imageTypeLabels[imageType]}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <span className="text-sm text-gray-900">
          {existingImages.length}/{maxImages}
        </span>
      </div>

      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {existingImages.map((img, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`}
                alt={`${imageTypeLabels[imageType]} ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              {onRemoveImage && (
                <button
                  onClick={() => onRemoveImage(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Camera Preview */}
      {isCapturing && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
            <Button onClick={capturePhoto} variant="primary">
              <Camera className="w-5 h-5 mr-2" />
              ถ่ายรูป
            </Button>
            <Button onClick={stopCamera} variant="secondary">
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Upload Buttons */}
      {!isCapturing && existingImages.length < maxImages && (
        <div className="flex space-x-3">
          <Button onClick={startCamera} variant="outline" className="flex-1">
            <Camera className="w-5 h-5 mr-2" />
            ถ่ายรูป
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex-1"
          >
            <Upload className="w-5 h-5 mr-2" />
            อัปโหลด
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Empty State */}
      {existingImages.length === 0 && !isCapturing && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-900" />
          <p className="mt-2 text-sm text-gray-900">
            ยังไม่มีรูปภาพ{imageTypeLabels[imageType]}
          </p>
        </div>
      )}
    </div>
  );
}
