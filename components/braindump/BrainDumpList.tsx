'use client';

import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { BrainDumpItem } from '@/types/database';
import BrainDumpItemComponent from './BrainDumpItem';
import BrainDumpInput from './BrainDumpInput';

interface BrainDumpListProps {
  items: BrainDumpItem[];
  plannerId: string;
  // ✨ NEW: Pass priority item IDs to calculate accurate stats
  priorityItemIds?: string[];
}

export default function BrainDumpList({
  items,
  plannerId,
  priorityItemIds = [],
}: BrainDumpListProps) {
  // Extract IDs for SortableContext
  const itemIds = items.map((item) => item.id);

  // ✨ FIXED: Calculate stats using actual priority relationships
  const stats = {
    total: items.length,
    completed: items.filter((i) => i.is_completed).length,
    // Use the passed priorityItemIds instead of is_priority flag
    prioritized: priorityItemIds.length,
    scheduled: items.filter((i) => i.is_scheduled).length,
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-bold">Brain Dump</h3>

      {/* Input for adding new items */}
      <BrainDumpInput plannerId={plannerId} />

      {/* Sortable List of items */}
      {items.length > 0 ? (
        // @ts-expect-error - React 19 + @dnd-kit type compatibility issue
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((item) => (
              <BrainDumpItemComponent key={item.id} item={item} />
            ))}
          </ul>
        </SortableContext>
      ) : (
        <p className="text-center text-sm italic text-gray-400 py-8">
          No items yet. Start adding your thoughts!
        </p>
      )}

      {/* Stats - Using calculated stats */}
      {items.length > 0 && (
        <div className="mt-4 flex gap-4 border-t pt-3 text-xs text-gray-600">
          <span>
            Total: <strong>{stats.total}</strong>
          </span>
          <span>
            Completed: <strong>{stats.completed}</strong>
          </span>
          <span>
            Prioritized: <strong>{stats.prioritized}</strong>
          </span>
          <span>
            Scheduled: <strong>{stats.scheduled}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
