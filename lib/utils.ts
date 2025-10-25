import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// TIME UTILITIES
// ============================================

/**
 * Converts time string to minutes since midnight
 * @example timeToMinutes("09:30:00") => 570
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to time string
 * @example minutesToTime(570) => "09:30:00"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(
    2,
    '0'
  )}:00`;
}

/**
 * Formats time for display (12-hour format)
 * @example formatTime("09:30:00") => "9:30 am"
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/**
 * Adds minutes to a time string
 * @example addMinutes("09:30:00", 60) => "10:30:00"
 */
export function addMinutes(time: string, minutes: number): string {
  const totalMinutes = timeToMinutes(time) + minutes;
  return minutesToTime(totalMinutes);
}

/**
 * Calculates duration between two times in minutes
 * @example getDuration("09:00:00", "10:30:00") => 90
 */
export function getDuration(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

/**
 * Calculates duration and formats it
 * @example formatDuration("09:00:00", "10:30:00") => "1h 30m"
 */
export function formatDuration(startTime: string, endTime: string): string {
  const minutes = getDuration(startTime, endTime);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Formats date for display
 * @example formatDate("2025-01-15") => "Wednesday, January 15"
 */
export function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats date in short format
 * @example formatDateShort("2025-01-15") => "Jan 15"
 */
export function formatDateShort(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Gets today's date in YYYY-MM-DD format
 */
export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Adds days to a date
 * @example addDays("2025-01-15", 1) => "2025-01-16"
 */
export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Checks if date is today
 */
export function isToday(date: string): boolean {
  return date === getToday();
}

// ============================================
// COLOR UTILITIES
// ============================================

export const colorOptions = {
  blue: {
    bg: 'bg-blue-200',
    border: 'border-blue-400',
    borderLeft: 'border-l-blue-500',
    text: 'text-blue-900',
    hover: 'hover:bg-blue-300',
  },
  orange: {
    bg: 'bg-orange-200',
    border: 'border-orange-400',
    borderLeft: 'border-l-orange-500',
    text: 'text-orange-900',
    hover: 'hover:bg-orange-300',
  },
  pink: {
    bg: 'bg-pink-200',
    border: 'border-pink-400',
    borderLeft: 'border-l-pink-500',
    text: 'text-pink-900',
    hover: 'hover:bg-pink-300',
  },
  teal: {
    bg: 'bg-teal-200',
    border: 'border-teal-400',
    borderLeft: 'border-l-teal-500',
    text: 'text-teal-900',
    hover: 'hover:bg-teal-300',
  },
  purple: {
    bg: 'bg-purple-200',
    border: 'border-purple-400',
    borderLeft: 'border-l-purple-500',
    text: 'text-purple-900',
    hover: 'hover:bg-purple-300',
  },
} as const;

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validates time format (HH:MM:SS)
 */
export function isValidTime(time: string): boolean {
  const regex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
  return regex.test(time);
}

/**
 * Validates date format (YYYY-MM-DD)
 */
export function isValidDate(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  const d = new Date(date + 'T00:00:00');
  return !isNaN(d.getTime());
}

/**
 * Checks if time block overlaps with existing blocks
 */
export function hasTimeOverlap(
  newStart: string,
  newEnd: string,
  existingBlocks: { start_time: string; end_time: string }[]
): boolean {
  const newStartMin = timeToMinutes(newStart);
  const newEndMin = timeToMinutes(newEnd);

  return existingBlocks.some((block) => {
    const blockStartMin = timeToMinutes(block.start_time);
    const blockEndMin = timeToMinutes(block.end_time);

    return (
      (newStartMin >= blockStartMin && newStartMin < blockEndMin) ||
      (newEndMin > blockStartMin && newEndMin <= blockEndMin) ||
      (newStartMin <= blockStartMin && newEndMin >= blockEndMin)
    );
  });
}
