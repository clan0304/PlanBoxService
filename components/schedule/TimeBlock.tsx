'use client';

import { useState } from 'react';
import type { TimeBlock as TimeBlockType } from '@/types/database';
import { colorOptions, formatTime, getDuration } from '@/lib/utils';
import { updateTimeBlock, deleteTimeBlock } from '@/lib/planner-api';
import { useRouter } from 'next/navigation';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface TimeBlockProps {
  block: TimeBlockType;
  onEdit?: (block: TimeBlockType) => void;
}

export default function TimeBlock({ block, onEdit }: TimeBlockProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Get color classes based on color_tag
  const colorClass = colorOptions[block.color_tag];

  // Calculate duration for display
  const duration = getDuration(block.start_time, block.end_time);
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
  // ADAPTIVE DISPLAY LOGIC
  // ============================================

  /**
   * Display rules based on block height (duration):
   * - < 30 min: Only time range (too small for title)
   * - 30-59 min: Time + truncated title (ellipsis)
   * - 60-89 min: Time + full title
   * - 90+ min: Time + title + notes (if present)
   */
  const showTitle = duration >= 30;
  const showFullTitle = duration >= 60;
  const showNotes = duration >= 90 && block.notes;

  // ============================================
  // ACTION HANDLERS
  // ============================================

  // Toggle completion
  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    e.stopPropagation();
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
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="group/block relative h-full">
          {/* MAIN BLOCK */}
          <div
            onClick={() => onEdit?.(block)}
            className={`
              group relative h-full rounded-lg border-l-4 p-3 shadow-sm transition-all
              cursor-pointer hover:shadow-md overflow-hidden
              ${colorClass.bg} ${colorClass.borderLeft} ${colorClass.hover}
              ${block.is_completed ? 'opacity-60' : ''}
              ${isLoading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            {/* Time Range - Always visible */}
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={colorClass.text}>
                {formatTime(block.start_time)} - {formatTime(block.end_time)}
              </span>
              <span className={`${colorClass.text} opacity-70`}>
                {durationText}
              </span>
            </div>

            {/* Title - Adaptive based on duration */}
            {showTitle && (
              <div
                className={`
                  mt-1 font-medium ${colorClass.text}
                  ${block.is_completed ? 'line-through' : ''}
                  ${showFullTitle ? 'line-clamp-2' : 'truncate'}
                `}
              >
                {displayText}
              </div>
            )}

            {/* Notes - Only for large blocks */}
            {showNotes && (
              <div
                className={`mt-1 text-xs ${colorClass.text} opacity-75 line-clamp-1`}
              >
                {block.notes}
              </div>
            )}

            {/* Action Buttons - Show on hover */}
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

            {/* Completion indicator */}
            {block.is_completed && (
              <div className="absolute left-2 top-2 text-lg">✓</div>
            )}
          </div>
        </div>
      </HoverCardTrigger>

      {/* HOVER CARD - Shows full details on hover */}
      <HoverCardContent side="right" align="start" className="w-80">
        <div className="space-y-2">
          {/* Full Title */}
          <h4 className="font-semibold text-gray-900">{displayText}</h4>

          {/* Time Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>🕐</span>
            <span>
              {formatTime(block.start_time)} - {formatTime(block.end_time)}
            </span>
            <span className="text-gray-400">•</span>
            <span>{durationText}</span>
          </div>

          {/* Notes */}
          {block.notes && (
            <div className="border-t pt-2">
              <p className="text-sm text-gray-600">{block.notes}</p>
            </div>
          )}

          {/* Status */}
          {block.is_completed && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-2 text-sm text-green-700">
              <span>✓</span>
              <span>Completed</span>
            </div>
          )}

          {/* Source Info */}
          {block.brain_dump_item && (
            <div className="border-t pt-2 text-xs text-gray-500">
              From Brain Dump
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
