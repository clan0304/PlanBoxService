'use client';

import { useDroppable } from '@dnd-kit/core';
import type { TopPriority } from '@/types/database';

interface PrioritySlotProps {
  slot: 1 | 2 | 3;
  priority: TopPriority | undefined;
  onToggleComplete?: (id: string, isCompleted: boolean) => void;
}

export default function PrioritySlot({
  slot,
  priority,
  onToggleComplete,
}: PrioritySlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `priority-slot-${slot}`,
    data: {
      type: 'priority-slot',
      slot,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-20 rounded-lg border-2 border-dashed p-4 transition-all
        ${
          isOver
            ? 'border-blue-500 bg-blue-50 shadow-lg'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }
      `}
    >
      {priority ? (
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={priority.is_completed}
            onChange={(e) => onToggleComplete?.(priority.id, e.target.checked)}
            className="mt-1 h-4 w-4 cursor-pointer shrink-0"
          />
          <div className="flex-1">
            <span
              className={priority.is_completed ? 'line-through opacity-50' : ''}
            >
              {priority.brain_dump_item?.text || priority.custom_text}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-gray-400">
          Drop item here or click to add
        </p>
      )}
    </div>
  );
}
