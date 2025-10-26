'use client';

import type { BrainDumpItem } from '@/types/database';
import BrainDumpItemComponent from './BrainDumpItem';
import BrainDumpInput from './BrainDumpInput';

interface BrainDumpListProps {
  items: BrainDumpItem[];
  plannerId: string;
}

export default function BrainDumpList({
  items,
  plannerId,
}: BrainDumpListProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-bold">Brain Dump</h3>

      {/* Input for adding new items */}
      <BrainDumpInput plannerId={plannerId} />

      {/* List of items */}
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <BrainDumpItemComponent key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <p className="text-center text-sm italic text-gray-400 py-8">
          No items yet. Start adding your thoughts!
        </p>
      )}

      {/* Stats */}
      {items.length > 0 && (
        <div className="mt-4 flex gap-4 border-t pt-3 text-xs text-gray-600">
          <span>
            Total: <strong>{items.length}</strong>
          </span>
          <span>
            Completed:{' '}
            <strong>{items.filter((i) => i.is_completed).length}</strong>
          </span>
          <span>
            Prioritized:{' '}
            <strong>{items.filter((i) => i.is_priority).length}</strong>
          </span>
          <span>
            Scheduled:{' '}
            <strong>{items.filter((i) => i.is_scheduled).length}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
