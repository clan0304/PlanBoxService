'use client';

import { DragEndEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DndWrapper from '@/components/dnd/DndWrapper';
import BrainDumpList from '@/components/braindump/BrainDumpList';
import PrioritySlot from '@/components/priorities/PrioritySlot';
import type { FullPlanner } from '@/types/database';
import { swapPriorityItem, updateTopPriority } from '@/lib/planner-api';

interface DashboardContentProps {
  planner: FullPlanner;
  userName: string;
  date: string;
}

export default function DashboardContent({
  planner,
  userName,
  date,
}: DashboardContentProps) {
  const [isSwapping, setIsSwapping] = useState(false);
  const router = useRouter();

  // Handle drag end event
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      console.log('❌ Not dropped over a valid target');
      return;
    }

    const overId = over.id as string;
    if (!overId.startsWith('priority-slot-')) {
      console.log('❌ Not dropped over a priority slot');
      return;
    }

    const prioritySlot = parseInt(overId.replace('priority-slot-', ''));
    const brainDumpItemId = active.id as string;

    console.log(`✅ Swapping: Item ${brainDumpItemId} → Slot ${prioritySlot}`);

    setIsSwapping(true);
    try {
      await swapPriorityItem(planner.id, prioritySlot, brainDumpItemId);
      router.refresh();
      console.log('✅ Swap successful!');
    } catch (error) {
      console.error('❌ Failed to swap priority:', error);
      alert('Failed to update priority. Please try again.');
    } finally {
      setIsSwapping(false);
    }
  }

  // Handle priority completion toggle
  async function handleTogglePriorityComplete(
    priorityId: string,
    isCompleted: boolean
  ) {
    try {
      await updateTopPriority(priorityId, { is_completed: isCompleted });
      router.refresh();
    } catch (error) {
      console.error('Failed to toggle priority completion:', error);
      alert('Failed to update priority. Please try again.');
    }
  }

  return (
    <DndWrapper onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-linear-to-br from-amber-50 to-orange-100">
        {/* Loading overlay during swap */}
        {isSwapping && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20">
            <div className="rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                <span className="font-medium">Updating priorities...</span>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Daily Timeboxing Planner
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {userName}!
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 py-8">
          {/* Date Navigation */}
          <div className="mb-6 rounded-lg bg-white p-4 shadow">
            <div className="flex items-center justify-between">
              <button className="rounded px-4 py-2 hover:bg-gray-100">←</button>
              <h2 className="text-xl font-semibold">{date}</h2>
              <button className="rounded px-4 py-2 hover:bg-gray-100">→</button>
            </div>
          </div>

          {/* Planner Layout */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column: Priorities & Brain Dump */}
            <div className="space-y-6">
              {/* Top Priorities - NOW USING PrioritySlot COMPONENT */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-bold">Top Priorities</h3>
                <div className="space-y-3">
                  {[1, 2, 3].map((slot) => {
                    const priority = planner.top_priorities.find(
                      (p) => p.priority_slot === slot
                    );
                    return (
                      <PrioritySlot
                        key={slot}
                        slot={slot as 1 | 2 | 3}
                        priority={priority}
                        onToggleComplete={handleTogglePriorityComplete}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Brain Dump */}
              <BrainDumpList
                items={planner.brain_dump_items}
                plannerId={planner.id}
              />
            </div>

            {/* Right Column: Timeboxing Schedule */}
            <div className="lg:col-span-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-bold">Schedule</h3>

                {/* Timeline */}
                <div className="space-y-2">
                  {Array.from({ length: 19 }, (_, i) => i + 5).map((hour) => (
                    <div key={hour} className="flex border-t border-gray-200">
                      <div className="w-20 shrink-0 py-2 text-sm text-gray-600">
                        {hour === 12
                          ? '12:00 pm'
                          : hour > 12
                          ? `${hour - 12}:00 pm`
                          : `${hour}:00 am`}
                      </div>
                      <div className="flex-1 py-2">
                        {planner.time_blocks
                          .filter((block) => {
                            const blockHour = parseInt(
                              block.start_time.split(':')[0]
                            );
                            return blockHour === hour;
                          })
                          .map((block) => (
                            <div
                              key={block.id}
                              className="mb-2 rounded-lg bg-blue-200 p-2 text-sm"
                            >
                              <div className="font-semibold">
                                {block.start_time.substring(0, 5)} -{' '}
                                {block.end_time.substring(0, 5)}
                              </div>
                              <div>
                                {block.brain_dump_item?.text ||
                                  block.custom_text}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </DndWrapper>
  );
}
