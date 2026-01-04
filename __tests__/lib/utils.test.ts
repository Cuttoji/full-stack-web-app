import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatDateRange,
  hasDateOverlap,
  isDateInRange,
  calculateWorkingDays,
  generateJobNumber,
  isValidEmail,
  isValidPhone,
  truncate,
  capitalize,
  groupBy,
  uniqueBy,
  getErrorMessage,
  getFileExtension,
  isImageFile,
  formatFileSize,
  getStatusColor,
} from '@/lib/utils';

describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('should format Date object correctly', () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      expect(formatDate(date)).toBe('15/01/2025');
    });

    it('should format ISO string correctly', () => {
      expect(formatDate('2025-01-15')).toBe('15/01/2025');
    });

    it('should support custom format', () => {
      const date = new Date(2025, 0, 15);
      expect(formatDate(date, 'yyyy-MM-dd')).toBe('2025-01-15');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const date = new Date(2025, 0, 15, 14, 30);
      expect(formatDateTime(date)).toBe('15/01/2025 14:30');
    });
  });

  describe('formatDateRange', () => {
    it('should format date range', () => {
      const result = formatDateRange('2025-01-15', '2025-01-20');
      expect(result).toBe('15/01/2025 - 20/01/2025');
    });

    it('should show single date if same', () => {
      const result = formatDateRange('2025-01-15', '2025-01-15');
      expect(result).toBe('15/01/2025');
    });
  });

  describe('hasDateOverlap', () => {
    it('should detect overlapping dates', () => {
      const start1 = new Date(2025, 0, 10);
      const end1 = new Date(2025, 0, 15);
      const start2 = new Date(2025, 0, 13);
      const end2 = new Date(2025, 0, 20);
      expect(hasDateOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should return false for non-overlapping dates', () => {
      const start1 = new Date(2025, 0, 10);
      const end1 = new Date(2025, 0, 12);
      const start2 = new Date(2025, 0, 15);
      const end2 = new Date(2025, 0, 20);
      expect(hasDateOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it('should detect adjacent dates as overlapping', () => {
      const start1 = new Date(2025, 0, 10);
      const end1 = new Date(2025, 0, 15);
      const start2 = new Date(2025, 0, 15);
      const end2 = new Date(2025, 0, 20);
      expect(hasDateOverlap(start1, end1, start2, end2)).toBe(true);
    });
  });

  describe('isDateInRange', () => {
    it('should return true for date within range', () => {
      const date = new Date(2025, 0, 15);
      const start = new Date(2025, 0, 10);
      const end = new Date(2025, 0, 20);
      expect(isDateInRange(date, start, end)).toBe(true);
    });

    it('should return false for date outside range', () => {
      const date = new Date(2025, 0, 25);
      const start = new Date(2025, 0, 10);
      const end = new Date(2025, 0, 20);
      expect(isDateInRange(date, start, end)).toBe(false);
    });
  });

  describe('calculateWorkingDays', () => {
    it('should calculate working days excluding weekends', () => {
      // Mon Jan 13, 2025 to Fri Jan 17, 2025 = 5 working days
      const start = new Date(2025, 0, 13);
      const end = new Date(2025, 0, 17);
      expect(calculateWorkingDays(start, end)).toBe(5);
    });

    it('should exclude weekend days', () => {
      // Fri Jan 17, 2025 to Mon Jan 20, 2025 = 2 working days (Fri + Mon)
      const start = new Date(2025, 0, 17);
      const end = new Date(2025, 0, 20);
      expect(calculateWorkingDays(start, end)).toBe(2);
    });
  });
});

describe('Job Number Generator', () => {
  describe('generateJobNumber', () => {
    it('should generate job number with default prefix', () => {
      const jobNumber = generateJobNumber();
      expect(jobNumber).toMatch(/^JOB-\d{6}-[A-Z0-9]{4}$/);
    });

    it('should generate job number with custom prefix', () => {
      const jobNumber = generateJobNumber('TASK');
      expect(jobNumber).toMatch(/^TASK-\d{6}-[A-Z0-9]{4}$/);
    });

    it('should generate unique job numbers', () => {
      const jobNumber1 = generateJobNumber();
      const jobNumber2 = generateJobNumber();
      expect(jobNumber1).not.toBe(jobNumber2);
    });
  });
});

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.th')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate correct phone numbers', () => {
      expect(isValidPhone('0812345678')).toBe(true);
      expect(isValidPhone('081-234-5678')).toBe(true);
      expect(isValidPhone('021234567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('12345')).toBe(false);
      expect(isValidPhone('abc1234567')).toBe(false);
    });
  });
});

describe('String Utilities', () => {
  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('Hi', 5)).toBe('Hi');
    });

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('WORLD')).toBe('World');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });
  });
});

describe('Array Utilities', () => {
  describe('groupBy', () => {
    it('should group array by key', () => {
      const data = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
      ];
      const result = groupBy(data, 'category');
      expect(result['A']).toHaveLength(2);
      expect(result['B']).toHaveLength(1);
    });
  });

  describe('uniqueBy', () => {
    it('should remove duplicates by key', () => {
      const data = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'C' },
      ];
      const result = uniqueBy(data, 'id');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('A');
    });
  });
});

describe('Error Handling', () => {
  describe('getErrorMessage', () => {
    it('should extract message from Error', () => {
      const error = new Error('Test error');
      expect(getErrorMessage(error)).toBe('Test error');
    });

    it('should return string as is', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should handle unknown types', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
      expect(getErrorMessage(123)).toBe('An unknown error occurred');
    });
  });
});

describe('File Utilities', () => {
  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('image.test.jpg')).toBe('jpg');
    });

    it('should handle no extension', () => {
      expect(getFileExtension('filename')).toBe('');
    });
  });

  describe('isImageFile', () => {
    it('should identify image files', () => {
      expect(isImageFile('photo.jpg')).toBe(true);
      expect(isImageFile('image.PNG')).toBe(true);
      expect(isImageFile('icon.svg')).toBe(true);
    });

    it('should reject non-image files', () => {
      expect(isImageFile('document.pdf')).toBe(false);
      expect(isImageFile('data.json')).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should format with decimals', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });
});

describe('Status Color Utilities', () => {
  describe('getStatusColor', () => {
    it('should return correct colors for status', () => {
      expect(getStatusColor('WAITING')).toBe('#9CA3AF');
      expect(getStatusColor('IN_PROGRESS')).toBe('#3B82F6');
      expect(getStatusColor('DONE')).toBe('#22C55E');
      expect(getStatusColor('CANCELLED')).toBe('#EF4444');
    });

    it('should return default color for unknown status', () => {
      expect(getStatusColor('UNKNOWN')).toBe('#9CA3AF');
    });
  });
});
