'use client';

import {
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DndWrapper from '@/components/dnd/DndWrapper';
import BrainDumpList from '@/components/braindump/BrainDumpList';
import PrioritySlot from '@/components/priorities/PrioritySlot';
import TimeBlock from '@/components/schedule/TimeBlock';
import TimeBlockModal, {
  type TimeBlockFormData,
} from '@/components/schedule/TimeBlockModal';
import DateNavigator from '@/components/dashboard/DateNavigator';
import type {
  FullPlanner,
  TopPriority,
  TimeBlock as TimeBlockType,
} from '@/types/database';
import {
  swapPriorityItem,
  updateTopPriority,
  reorderBrainDumpItems,
  reorderPrioritySlots,
  createTimeBlock,
  updateTimeBlock,
} from '@/lib/planner-api';
import { timeToMinutes } from '@/lib/utils';

// ============================================
// DROPPABLE TIME SLOT COMPONENT (for drag & drop)
// ============================================
interface DroppableTimeSlotProps {
  hour: number;
  onSlotClick: () => void;
}

function DroppableTimeSlot({ hour, onSlotClick }: DroppableTimeSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `time-slot-${hour}`,
    data: {
      type: 'time-slot',
      hour,
    },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onSlotClick}
      className={`
        flex-1 cursor-pointer transition-colors
        ${isOver ? 'bg-blue-50' : 'hover:bg-gray-50'}
      `}
    >
      <div className="flex h-full items-center justify-center text-xs text-gray-400">
        {isOver ? 'Drop here to schedule' : ''}
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD CONTENT COMPONENT
// ============================================

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
  // ✨ Local state for optimistic updates
  const [localBrainDump, setLocalBrainDump] = useState(
    planner.brain_dump_items
  );
  const [localPriorities, setLocalPriorities] = useState(
    planner.top_priorities
  );

  const [isUpdating, setIsUpdating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const router = useRouter();

  // ✨ Time block modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlockType | null>(null);
  const [droppedHour, setDroppedHour] = useState<number | null>(null);

  // ✨ FIX: Sync local state when server data changes (after refresh)
  useEffect(() => {
    // Get IDs of items that are actually in priorities (from server)
    const priorityItemIds = new Set(
      planner.top_priorities
        .filter((p) => p.brain_dump_item_id)
        .map((p) => p.brain_dump_item_id)
    );

    // Update brain dump items with correct is_priority flags
    const syncedBrainDump = planner.brain_dump_items.map((item) => ({
      ...item,
      is_priority: priorityItemIds.has(item.id),
    }));

    setLocalBrainDump(syncedBrainDump);
    setLocalPriorities(planner.top_priorities);
  }, [planner.brain_dump_items, planner.top_priorities]);

  // ✨ Calculate which brain dump items are in priorities (for accurate stats)
  const priorityItemIds = useMemo(() => {
    return localPriorities
      .filter((p) => p.brain_dump_item_id)
      .map((p) => p.brain_dump_item_id as string);
  }, [localPriorities]);

  // Configure sensors for better drag experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // ============================================
  // DATE NAVIGATION HANDLER
  // ============================================

  const handleDateChange = (newDate: string) => {
    // Navigate to the new date
    router.push(`/dashboard?date=${newDate}`);
  };

  // ============================================
  // DRAG EVENT HANDLERS
  // ============================================

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      console.log('❌ Not dropped over a valid target');
      return;
    }

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    console.log('🎯 Drag ended:', {
      active: active.id,
      activeType,
      over: over.id,
      overType,
    });

    // ============================================
    // SCENARIO 1: Reordering Brain Dump Items
    // ============================================
    if (activeType === 'brain-dump-item' && overType === 'brain-dump-item') {
      handleBrainDumpReorder(active.id as string, over.id as string);
      return;
    }

    // ============================================
    // SCENARIO 2: Brain Dump → Priority (Cross-Section)
    // ============================================
    if (activeType === 'brain-dump-item' && overType === 'priority-slot') {
      const overSlot = over.data.current?.slot;
      handleCrossSectionDrag(active.id as string, overSlot);
      return;
    }

    // ============================================
    // SCENARIO 3: Reordering Priority Slots
    // ============================================
    if (activeType === 'priority-slot' && overType === 'priority-slot') {
      handlePriorityReorder(active.data.current?.slot, over.data.current?.slot);
      return;
    }

    // ============================================
    // SCENARIO 4: Brain Dump → Time Slot (Schedule)
    // ============================================
    if (activeType === 'brain-dump-item' && overType === 'time-slot') {
      const overHour = over.data.current?.hour;
      handleDropOnTimeSlot(active.id as string, overHour);
      return;
    }

    console.log('ℹ️ No matching drag scenario');
  }

  // ============================================
  // SCENARIO HANDLERS WITH OPTIMISTIC UPDATES
  // ============================================

  /**
   * ✨ OPTIMISTIC: Handle reordering brain dump items
   */
  async function handleBrainDumpReorder(activeId: string, overId: string) {
    if (activeId === overId) return;

    console.log(`🔄 Reordering brain dump: ${activeId} → ${overId}`);

    // Find indices
    const oldIndex = localBrainDump.findIndex((i) => i.id === activeId);
    const newIndex = localBrainDump.findIndex((i) => i.id === overId);

    if (oldIndex === -1 || newIndex === -1) {
      console.error('❌ Could not find items in list');
      return;
    }

    // ✨ OPTIMISTIC UPDATE: Update UI immediately
    const reordered = arrayMove(localBrainDump, oldIndex, newIndex);
    setLocalBrainDump(reordered);

    // Create updates with new order_index values
    const updates = reordered.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));

    // Save in background
    setIsUpdating(true);
    try {
      await reorderBrainDumpItems(updates);
      router.refresh();
      console.log('✅ Brain dump reordered successfully');
    } catch (error) {
      console.error('❌ Failed to reorder brain dump:', error);
      // ✨ ROLLBACK: Revert on error
      setLocalBrainDump(planner.brain_dump_items);
      alert('Failed to reorder items. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }

  /**
   * ✨ OPTIMISTIC: Handle dragging brain dump item to priority slot
   */
  async function handleCrossSectionDrag(
    brainDumpItemId: string,
    prioritySlot: number
  ) {
    console.log(
      `➡️ Cross-section: Item ${brainDumpItemId} → Slot ${prioritySlot}`
    );

    // Find the brain dump item
    const brainDumpItem = localBrainDump.find((i) => i.id === brainDumpItemId);
    if (!brainDumpItem) return;

    // Find if there's an existing priority in this slot
    const existingPriority = localPriorities.find(
      (p) => p.priority_slot === prioritySlot
    );
    const oldBrainDumpItemId = existingPriority?.brain_dump_item_id;

    // ✨ OPTIMISTIC UPDATE 1: Update priorities immediately
    let updatedPriorities: TopPriority[];
    if (existingPriority) {
      // Replace existing priority
      updatedPriorities = localPriorities.map((p) =>
        p.priority_slot === prioritySlot
          ? {
              ...p,
              brain_dump_item_id: brainDumpItemId,
              brain_dump_item: brainDumpItem,
            }
          : p
      );
    } else {
      // Add new priority
      updatedPriorities = [
        ...localPriorities,
        {
          id: `temp-${Date.now()}`,
          planner_id: planner.id,
          user_id: planner.user_id,
          priority_slot: prioritySlot as 1 | 2 | 3,
          brain_dump_item_id: brainDumpItemId,
          custom_text: null,
          is_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          brain_dump_item: brainDumpItem,
        },
      ];
    }

    setLocalPriorities(updatedPriorities);

    // ✨ OPTIMISTIC UPDATE 2: Update is_priority flags in brain dump items
    setLocalBrainDump((prev) =>
      prev.map((item) => {
        // Set is_priority = true for the new item
        if (item.id === brainDumpItemId) {
          return { ...item, is_priority: true };
        }
        // Set is_priority = false for the old item (if it was replaced)
        if (oldBrainDumpItemId && item.id === oldBrainDumpItemId) {
          // Check if this item is still in other priority slots
          const stillInPriorities = updatedPriorities.some(
            (p) => p.brain_dump_item_id === item.id
          );
          return { ...item, is_priority: stillInPriorities };
        }
        return item;
      })
    );

    // Save in background
    setIsUpdating(true);
    try {
      await swapPriorityItem(planner.id, prioritySlot, brainDumpItemId);
      router.refresh();
      console.log('✅ Priority updated successfully');
    } catch (error) {
      console.error('❌ Failed to update priority:', error);
      // ✨ ROLLBACK: Revert on error
      setLocalPriorities(planner.top_priorities);
      setLocalBrainDump(planner.brain_dump_items);
      alert('Failed to update priority. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }

  /**
   * ✨ OPTIMISTIC: Handle reordering priority slots
   */
  async function handlePriorityReorder(activeSlot: number, overSlot: number) {
    if (activeSlot === overSlot) return;

    console.log(
      `🔄 Reordering priorities: Slot ${activeSlot} → Slot ${overSlot}`
    );

    // Find the priorities for these slots
    const activePriority = localPriorities.find(
      (p) => p.priority_slot === activeSlot
    );
    const overPriority = localPriorities.find(
      (p) => p.priority_slot === overSlot
    );

    if (!activePriority) {
      console.error('❌ Active priority not found');
      return;
    }

    // ✨ OPTIMISTIC UPDATE: Swap slots immediately
    let updatedPriorities: TopPriority[];
    if (!overPriority) {
      // Just move to empty slot
      updatedPriorities = localPriorities.map((p) =>
        p.id === activePriority.id
          ? { ...p, priority_slot: overSlot as 1 | 2 | 3 }
          : p
      );
    } else {
      // Swap two priorities
      updatedPriorities = localPriorities.map((p) => {
        if (p.id === activePriority.id)
          return { ...p, priority_slot: overSlot as 1 | 2 | 3 };
        if (p.id === overPriority.id)
          return { ...p, priority_slot: activeSlot as 1 | 2 | 3 };
        return p;
      });
    }

    setLocalPriorities(updatedPriorities);

    // Create slot mapping for API
    const slotMapping: { id: string; newSlot: number }[] = [];
    if (!overPriority) {
      slotMapping.push({
        id: activePriority.id,
        newSlot: overSlot,
      });
    } else {
      slotMapping.push(
        { id: activePriority.id, newSlot: overSlot },
        { id: overPriority.id, newSlot: activeSlot }
      );
    }

    // Save in background
    setIsUpdating(true);
    try {
      await reorderPrioritySlots(planner.id, slotMapping);
      router.refresh();
      console.log('✅ Priorities reordered successfully');
    } catch (error) {
      console.error('❌ Failed to reorder priorities:', error);
      // ✨ ROLLBACK: Revert on error
      setLocalPriorities(planner.top_priorities);
      alert('Failed to reorder priorities. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }

  /**
   * Handle priority completion toggle
   */
  async function handleTogglePriorityComplete(
    priorityId: string,
    isCompleted: boolean
  ) {
    // ✨ OPTIMISTIC UPDATE: Update UI immediately
    setLocalPriorities((prev) =>
      prev.map((p) =>
        p.id === priorityId ? { ...p, is_completed: isCompleted } : p
      )
    );

    try {
      await updateTopPriority(priorityId, { is_completed: isCompleted });
      router.refresh();
    } catch (error) {
      console.error('Failed to toggle priority completion:', error);
      // ✨ ROLLBACK: Revert on error
      setLocalPriorities(planner.top_priorities);
      alert('Failed to update priority. Please try again.');
    }
  }

  // ============================================
  // TIME BLOCK HANDLERS
  // ============================================

  /**
   * Handle dropping brain dump item on time slot
   * Opens modal with pre-filled brain dump item
   */
  function handleDropOnTimeSlot(brainDumpItemId: string, hour: number) {
    console.log(`📅 Dropped item ${brainDumpItemId} on hour ${hour}`);

    // Find the brain dump item
    const brainDumpItem = localBrainDump.find((i) => i.id === brainDumpItemId);
    if (!brainDumpItem) return;

    // Store the hour and open modal
    setDroppedHour(hour);
    setEditingBlock(null);
    setIsModalOpen(true);
  }

  /**
   * Handle creating a time block from modal
   */
  async function handleCreateTimeBlock(data: TimeBlockFormData) {
    setIsUpdating(true);
    try {
      await createTimeBlock({
        planner_id: planner.id,
        start_time: data.start_time,
        end_time: data.end_time,
        brain_dump_item_id: data.brain_dump_item_id || undefined,
        custom_text: data.custom_text || undefined,
        notes: data.notes || undefined,
        color_tag: data.color_tag,
      });
      router.refresh();
      console.log('✅ Time block created successfully');
    } catch (error) {
      console.error('❌ Failed to create time block:', error);
      alert('Failed to create time block. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }

  /**
   * Handle updating a time block from modal
   */
  async function handleUpdateTimeBlock(data: TimeBlockFormData) {
    if (!editingBlock) return;

    setIsUpdating(true);
    try {
      await updateTimeBlock(editingBlock.id, {
        start_time: data.start_time,
        end_time: data.end_time,
        brain_dump_item_id: data.brain_dump_item_id,
        custom_text: data.custom_text || null,
        notes: data.notes || null,
        color_tag: data.color_tag,
      });
      router.refresh();
      console.log('✅ Time block updated successfully');
    } catch (error) {
      console.error('❌ Failed to update time block:', error);
      alert('Failed to update time block. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }

  /**
   * Handle saving time block (create or update)
   */
  function handleSaveTimeBlock(data: TimeBlockFormData) {
    if (editingBlock) {
      handleUpdateTimeBlock(data);
    } else {
      handleCreateTimeBlock(data);
    }
  }

  /**
   * Handle clicking on time slot to create block
   */
  function handleTimeSlotClick(hour: number) {
    setDroppedHour(hour);
    setEditingBlock(null);
    setIsModalOpen(true);
  }

  /**
   * Handle clicking on time block to edit
   */
  function handleEditTimeBlock(block: TimeBlockType) {
    setEditingBlock(block);
    setDroppedHour(null);
    setIsModalOpen(true);
  }

  // ============================================
  // RENDER
  // ============================================

  const prioritySlotIds = [1, 2, 3].map((slot) => `priority-slot-${slot}`);

  return (
    <DndWrapper
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
      collisionDetection={closestCenter}
    >
      <div className="min-h-screen bg-linear-to-br from-amber-50 to-orange-100">
        {/* Smooth Loading Indicator */}
        {isUpdating && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-lg border border-gray-200">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-sm font-medium text-gray-700">Saving...</span>
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
          {/* ✨ NEW: Date Navigation with Calendar Popup */}
          <div className="mb-6">
            <DateNavigator currentDate={date} onDateChange={handleDateChange} />
          </div>

          {/* Planner Layout */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column: Priorities & Brain Dump */}
            <div className="space-y-6">
              {/* Top Priorities */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-bold">Top Priorities</h3>
                {/* @ts-expect-error - React 19 + @dnd-kit type compatibility issue */}
                <SortableContext
                  items={prioritySlotIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {[1, 2, 3].map((slot) => {
                      const priority = localPriorities.find(
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
                </SortableContext>
              </div>

              {/* Brain Dump - ✨ Pass priority item IDs for accurate stats */}
              <BrainDumpList
                items={localBrainDump}
                plannerId={planner.id}
                priorityItemIds={priorityItemIds}
              />
            </div>

            {/* Right Column: Timeboxing Schedule */}
            <div className="lg:col-span-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-bold">Schedule</h3>

                {/* Timeline Container with Absolute Positioning */}
                <div className="relative max-h-[600px] overflow-y-auto">
                  {/* Hour Grid Lines */}
                  <div className="relative" style={{ height: '1920px' }}>
                    {' '}
                    {/* 24 hours × 80px */}
                    {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 flex border-t border-gray-200"
                        style={{ top: `${hour * 80}px`, height: '80px' }}
                      >
                        {/* Time Label */}
                        <div className="w-20 shrink-0 py-2 text-sm text-gray-600">
                          {hour === 0
                            ? '12:00 am'
                            : hour === 12
                            ? '12:00 pm'
                            : hour > 12
                            ? `${hour - 12}:00 pm`
                            : `${hour}:00 am`}
                        </div>

                        {/* Droppable Zone */}
                        <DroppableTimeSlot
                          hour={hour}
                          onSlotClick={() => handleTimeSlotClick(hour)}
                        />
                      </div>
                    ))}
                    {/* Absolutely Positioned Time Blocks */}
                    {planner.time_blocks.map((block) => {
                      const startMinutes = timeToMinutes(block.start_time);
                      const endMinutes = timeToMinutes(block.end_time);
                      const topPosition = (startMinutes / 60) * 80; // 80px per hour
                      const height = ((endMinutes - startMinutes) / 60) * 80;

                      return (
                        <div
                          key={block.id}
                          className="absolute left-20 right-4"
                          style={{
                            top: `${topPosition}px`,
                            height: `${height}px`,
                            zIndex: 10,
                          }}
                        >
                          <TimeBlock
                            block={block}
                            onEdit={handleEditTimeBlock}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Time Block Modal */}
        <TimeBlockModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBlock(null);
            setDroppedHour(null);
          }}
          onSave={handleSaveTimeBlock}
          brainDumpItems={localBrainDump}
          existingBlock={editingBlock}
          initialStartTime={
            droppedHour !== null
              ? `${String(droppedHour).padStart(2, '0')}:00`
              : undefined
          }
        />

        {/* Drag Overlay */}
        {/* @ts-expect-error - React 19 + @dnd-kit type compatibility issue */}
        <DragOverlay>
          {activeId ? (
            <div className="rounded border-2 border-blue-500 bg-white p-2 shadow-lg">
              {activeId.startsWith('priority-slot-') ? (
                <div>
                  Priority Slot {activeId.replace('priority-slot-', '')}
                </div>
              ) : (
                <div>{localBrainDump.find((i) => i.id === activeId)?.text}</div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndWrapper>
  );
}
