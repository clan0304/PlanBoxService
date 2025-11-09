'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { updateBrainDumpItem, deleteBrainDumpItem } from '@/lib/planner-api';
import { useRouter } from 'next/navigation';
import type { BrainDumpItem } from '@/types/database';
import { toast } from 'sonner';

interface BrainDumpItemProps {
  item: BrainDumpItem;
}

export default function BrainDumpItemComponent({ item }: BrainDumpItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // ============================================
  // DRAG & DROP SETUP - NOW USING SORTABLE
  // ============================================
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: item.is_completed || isEditing, // Can't drag completed or editing items
    data: {
      type: 'brain-dump-item',
      item: item,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  // Toggle completion
  const handleToggleComplete = async () => {
    setIsLoading(true);
    try {
      await updateBrainDumpItem(item.id, {
        is_completed: !item.is_completed,
      });
      router.refresh();
    } catch (error) {
      console.error('Failed to toggle completion:', error);
      alert('Failed to update item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save edited text
  const handleSave = async () => {
    if (!editText.trim()) {
      alert('Text cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      await updateBrainDumpItem(item.id, {
        text: editText.trim(),
      });
      setIsEditing(false);
      router.refresh();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to update', {
        description: 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditText(item.text);
    setIsEditing(false);
  };

  // Delete item
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteBrainDumpItem(item.id);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // STYLING HELPERS
  // ============================================

  // Get border color based on status
  const getBorderClass = () => {
    if (item.is_priority && item.is_scheduled) {
      return 'border-l-4 border-l-purple-500'; // Both
    } else if (item.is_priority) {
      return 'border-l-4 border-l-blue-500'; // Priority only
    } else if (item.is_scheduled) {
      return 'border-l-4 border-l-green-500'; // Scheduled only
    }
    return '';
  };

  // Get cursor style
  const getCursorClass = () => {
    if (item.is_completed || isEditing) {
      return 'cursor-default';
    }
    return 'cursor-grab active:cursor-grabbing';
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-2 rounded border border-gray-200 p-2 
        transition-all hover:shadow-md
        ${getBorderClass()}
        ${getCursorClass()}
        ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-blue-400 z-50' : ''}
        ${item.is_completed ? 'bg-gray-50' : 'bg-white'}
      `}
    >
      {/* Drag Handle - Only visible when draggable */}
      {!item.is_completed && !isEditing && (
        <div
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing touch-none"
          title="Drag to reorder or move to priority"
        >
          <span className="text-gray-400 hover:text-gray-600">⋮⋮</span>
        </div>
      )}

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={item.is_completed}
        onChange={handleToggleComplete}
        disabled={isLoading}
        className="h-4 w-4 cursor-pointer shrink-0"
      />

      {/* Text content */}
      {isEditing ? (
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          disabled={isLoading}
          className="flex-1 rounded border border-blue-500 px-2 py-1 focus:outline-none"
          autoFocus
        />
      ) : (
        <span
          className={`flex-1 cursor-text ${
            item.is_completed ? 'line-through opacity-50' : ''
          }`}
          onClick={() => !item.is_completed && setIsEditing(true)}
        >
          {item.text}
        </span>
      )}

      {/* Status indicators */}
      <div className="flex gap-1 shrink-0">
        {item.is_priority && (
          <span className="text-xs text-blue-600" title="In priorities">
            ⭐
          </span>
        )}
        {item.is_scheduled && (
          <span className="text-xs text-green-600" title="Scheduled">
            📅
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 shrink-0">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="rounded px-2 py-1 text-xs text-green-600 hover:bg-green-50"
              title="Save (Enter)"
            >
              ✓
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
              title="Cancel (Esc)"
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              disabled={isLoading || item.is_completed}
              className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Edit"
            >
              ✏️
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              title="Delete"
            >
              🗑️
            </button>
          </>
        )}
      </div>
    </li>
  );
}
