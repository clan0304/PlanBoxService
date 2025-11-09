'use client';

import { useState, useRef, useEffect } from 'react';
import type { TimeBlock } from '@/types/database';
import {
  colorOptions,
  formatTime,
  getDuration,
  minutesToTime,
  timeToMinutes,
} from '@/lib/utils';
import { updateTimeBlock, deleteTimeBlock } from '@/lib/planner-api';
import { useRouter } from 'next/navigation';

interface ResizableTimeBlockProps {
  block: TimeBlock;
  onEdit?: (block: TimeBlock) => void;
  onResizePreview?: (
    blockId: string,
    tempStartTime: string,
    tempEndTime: string
  ) => void;
  onResizeEnd?: () => void;
}

type ResizeHandle = 'top' | 'bottom' | null;

export default function ResizableTimeBlock({
  block,
  onEdit,
  onResizePreview,
  onResizeEnd: onResizeEndCallback,
}: ResizableTimeBlockProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [tempStartTime, setTempStartTime] = useState(block.start_time);
  const [tempEndTime, setTempEndTime] = useState(block.end_time);

  const blockRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const originalStartMinutes = useRef<number>(0);
  const originalEndMinutes = useRef<number>(0);

  const router = useRouter();

  // Get color classes based on color_tag
  const colorClass = colorOptions[block.color_tag];

  // Calculate duration for display
  const displayStartTime = isResizing ? tempStartTime : block.start_time;
  const displayEndTime = isResizing ? tempEndTime : block.end_time;
  const duration = getDuration(displayStartTime, displayEndTime);
  const durationText =
    duration >= 60
      ? `${Math.floor(duration / 60)}h ${
          duration % 60 > 0 ? `${duration % 60}m` : ''
        }`.trim()
      : `${duration}m`;

  // Get display text
  const displayText =
    block.brain_dump_item?.text || block.custom_text || '(No title)';

  // ============================================
  // RESIZE HANDLERS
  // ============================================

  const handleResizeStart = (e: React.MouseEvent, handle: 'top' | 'bottom') => {
    e.stopPropagation(); // Prevent triggering edit
    e.preventDefault(); // Prevent any default behavior

    setIsResizing(true);
    setResizeHandle(handle);
    startY.current = e.clientY;
    originalStartMinutes.current = timeToMinutes(block.start_time);
    originalEndMinutes.current = timeToMinutes(block.end_time);

    // Add global mouse event listeners
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);

    console.log(`🔧 Resize started: ${handle} edge`);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !resizeHandle) return;

    const deltaY = e.clientY - startY.current;
    // Convert pixels to minutes (80px per hour = 1.33px per minute)
    const deltaMinutes = Math.round(deltaY / 1.33);

    // Snap to 15-minute intervals for better UX
    const snappedDelta = Math.round(deltaMinutes / 15) * 15;

    if (resizeHandle === 'top') {
      // Resizing from top (changing start time)
      let newStartMinutes = originalStartMinutes.current + snappedDelta;

      // Constrain: start time must be at least 15 minutes before end time
      const minStartMinutes = originalEndMinutes.current - 15;
      newStartMinutes = Math.max(0, Math.min(newStartMinutes, minStartMinutes));

      setTempStartTime(minutesToTime(newStartMinutes));

      // Notify parent of preview changes for real-time visual update
      onResizePreview?.(block.id, minutesToTime(newStartMinutes), tempEndTime);
    } else {
      // Resizing from bottom (changing end time)
      let newEndMinutes = originalEndMinutes.current + snappedDelta;

      // Constrain: end time must be at least 15 minutes after start time
      const minEndMinutes = originalStartMinutes.current + 15;
      newEndMinutes = Math.max(minEndMinutes, Math.min(newEndMinutes, 1440)); // Max 24 hours (1440 minutes)

      setTempEndTime(minutesToTime(newEndMinutes));

      // Notify parent of preview changes for real-time visual update
      onResizePreview?.(block.id, tempStartTime, minutesToTime(newEndMinutes));
    }
  };

  const handleResizeEnd = async () => {
    // Remove global listeners
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);

    if (!isResizing) return;

    // Check if time actually changed
    if (tempStartTime !== block.start_time || tempEndTime !== block.end_time) {
      setIsLoading(true);
      try {
        await updateTimeBlock(block.id, {
          start_time: tempStartTime,
          end_time: tempEndTime,
        });
        router.refresh();
      } catch (error) {
        console.error('Failed to resize time block:', error);
        alert('Failed to resize time block. Please try again.');
        // Reset to original times
        setTempStartTime(block.start_time);
        setTempEndTime(block.end_time);
      } finally {
        setIsLoading(false);
      }
    }

    setIsResizing(false);
    setResizeHandle(null);

    // Notify parent that resize ended
    onResizeEndCallback?.();
  };

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // OTHER HANDLERS
  // ============================================

  // Toggle completion
  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering edit
    setIsLoading(true);
    try {
      await updateTimeBlock(block.id, {
        is_completed: !block.is_completed,
      });
      router.refresh();
    } catch (error) {
      console.error('Failed to toggle completion:', error);
      alert('Failed to update time block. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete block
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering edit
    if (!confirm('Are you sure you want to delete this time block?')) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteTimeBlock(block.id);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete time block:', error);
      alert('Failed to delete time block. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="group/block relative h-full">
      {/* TOP RESIZE HANDLE - Outside block */}
      <div
        onMouseDown={(e) => handleResizeStart(e, 'top')}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log('🛑 Top handle clicked - prevented modal');
        }}
        className={`
          absolute left-0 right-0 -top-2 h-4 cursor-ns-resize z-60
          transition-opacity
          ${
            isResizing && resizeHandle === 'top'
              ? 'opacity-100'
              : 'opacity-0 group-hover/block:opacity-100'
          }
        `}
        title="Drag to adjust start time"
      >
        <div className="absolute inset-x-0 top-1.5 h-1.5 bg-blue-500 rounded-lg shadow-sm" />
      </div>

      {/* MAIN BLOCK */}
      <div
        ref={blockRef}
        onClick={() => !isResizing && onEdit?.(block)}
        className={`
          group relative h-full rounded-lg border-l-4 p-3 shadow-sm transition-all
          ${colorClass.bg} ${colorClass.borderLeft} ${colorClass.hover}
          ${block.is_completed ? 'opacity-60' : ''}
          ${
            isResizing
              ? 'shadow-lg ring-2 ring-blue-400 z-50'
              : 'cursor-pointer hover:shadow-md'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        {/* Time Range */}
        <div className="mb-1 flex items-center justify-between text-xs font-semibold">
          <span className={colorClass.text}>
            {formatTime(displayStartTime)} - {formatTime(displayEndTime)}
          </span>
          <span className={`${colorClass.text} opacity-70`}>
            {durationText}
          </span>
        </div>

        {/* Title */}
        <div
          className={`mb-1 font-medium ${colorClass.text} ${
            block.is_completed ? 'line-through' : ''
          }`}
        >
          {displayText}
        </div>

        {/* Notes */}
        {block.notes && (
          <div className={`text-xs ${colorClass.text} opacity-75`}>
            {block.notes}
          </div>
        )}

        {/* Action Buttons - Show on hover */}
        {!isResizing && (
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleToggleComplete}
              disabled={isLoading}
              className={`rounded px-2 py-1 text-xs ${colorClass.text} hover:bg-white hover:bg-opacity-50`}
              title={block.is_completed ? 'Mark incomplete' : 'Mark complete'}
            >
              {block.is_completed ? '↩️' : '✓'}
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className={`rounded px-2 py-1 text-xs ${colorClass.text} hover:bg-white hover:bg-opacity-50`}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        )}

        {/* Completion indicator */}
        {block.is_completed && (
          <div className="absolute left-2 top-2 text-lg">✓</div>
        )}

        {/* Resizing feedback */}
        {isResizing && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold shadow-lg">
              {formatTime(displayStartTime)} - {formatTime(displayEndTime)}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM RESIZE HANDLE - Outside block */}
      <div
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          console.log('🛑 Bottom handle clicked - prevented modal');
        }}
        className={`
          absolute left-0 right-0 -bottom-2 h-4 cursor-ns-resize z-60
          transition-opacity
          ${
            isResizing && resizeHandle === 'bottom'
              ? 'opacity-100'
              : 'opacity-0 group-hover/block:opacity-100'
          }
        `}
        title="Drag to adjust end time"
      >
        <div className="absolute inset-x-0 bottom-1.5 h-1.5 bg-blue-500 rounded-lg shadow-sm" />
      </div>
    </div>
  );
}
