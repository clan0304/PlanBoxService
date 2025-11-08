'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  // ✨ NEW: useSortable instead of useDroppable
  // This makes it both draggable AND droppable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: `priority-slot-${slot}`,
    data: {
      type: 'priority-slot',
      slot,
      priority,
    },
    // Disable dragging if empty (can't drag empty slots)
    disabled: !priority,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get display text
  const displayText = priority?.brain_dump_item?.text || priority?.custom_text;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        min-h-20 rounded-lg border-2 p-4 transition-all
        ${
          priority
            ? 'border-solid border-gray-300 bg-white hover:border-gray-400'
            : 'border-dashed border-gray-300 bg-white hover:border-gray-400'
        }
        ${isOver ? 'border-blue-500 bg-blue-50 shadow-lg' : ''}
        ${isDragging ? 'opacity-50 ring-2 ring-blue-400 z-50' : ''}
      `}
    >
      {priority ? (
        <div className="flex items-start gap-2">
          {/* Drag handle - only show when there's content */}
          <div
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing touch-none shrink-0"
            title="Drag to reorder priority"
          >
            <span className="text-gray-400 hover:text-gray-600">⋮⋮</span>
          </div>

          {/* Checkbox */}
          <input
            type="checkbox"
            checked={priority.is_completed}
            onChange={(e) => onToggleComplete?.(priority.id, e.target.checked)}
            className="mt-1 h-4 w-4 cursor-pointer shrink-0"
          />

          {/* Text */}
          <div className="flex-1">
            <span
              className={priority.is_completed ? 'line-through opacity-50' : ''}
            >
              {displayText || '(No text available)'}
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
