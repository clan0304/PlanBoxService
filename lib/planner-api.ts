// ============================================
// PLANNER API - DATABASE OPERATIONS
// ============================================
// Server-side functions for database operations

'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import {
  type BrainDumpItem,
  type CreateBrainDumpItemInput,
  type UpdateBrainDumpItemInput,
  type TopPriority,
  type CreateTopPriorityInput,
  type UpdateTopPriorityInput,
  type TimeBlock,
  type CreateTimeBlockInput,
  type UpdateTimeBlockInput,
  type DailyPlanner,
  type FullPlanner,
} from '@/types/database';

// ============================================
// DAILY PLANNER OPERATIONS
// ============================================

/**
 * Get or create a planner for a specific date
 * Handles race conditions by catching duplicate key errors and retrying
 */
export async function getOrCreatePlanner(date: string): Promise<DailyPlanner> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createServerSupabaseClient();

  // Try to get existing planner first
  const { data: existingPlanner } = await supabase
    .from('daily_planners')
    .select('*')
    .eq('user_id', userId)
    .eq('planner_date', date)
    .single();

  if (existingPlanner) {
    return existingPlanner as DailyPlanner;
  }

  // Create new planner if doesn't exist
  const { data: newPlanner, error } = await supabase
    .from('daily_planners')
    .insert({
      user_id: userId,
      planner_date: date,
    })
    .select()
    .single();

  // Handle race condition: if another request created it simultaneously
  if (error) {
    // Check if it's a duplicate key error (PostgreSQL error code 23505)
    if (error.code === '23505') {
      console.log(
        `⚠️ Race condition detected for planner ${date}, retrying fetch...`
      );

      // Another request created it, try to fetch it again
      const { data: retryPlanner, error: retryError } = await supabase
        .from('daily_planners')
        .select('*')
        .eq('user_id', userId)
        .eq('planner_date', date)
        .single();

      if (retryError || !retryPlanner) {
        throw new Error(
          `Failed to get planner after retry: ${
            retryError?.message || 'Unknown error'
          }`
        );
      }

      console.log(`✅ Successfully retrieved planner after race condition`);
      return retryPlanner as DailyPlanner;
    }

    // Other errors should throw normally
    throw new Error(`Failed to create planner: ${error.message}`);
  }

  return newPlanner as DailyPlanner;
}

/**
 * Get full planner with all related data
 */
export async function getFullPlanner(date: string): Promise<FullPlanner> {
  const planner = await getOrCreatePlanner(date);
  const supabase = createServerSupabaseClient();

  // Fetch all related data in parallel
  const [brainDumpResult, prioritiesResult, timeBlocksResult] =
    await Promise.all([
      supabase
        .from('brain_dump_items')
        .select('*')
        .eq('planner_id', planner.id)
        .order('order_index', { ascending: true }),
      supabase
        .from('top_priorities')
        .select('*, brain_dump_items(*)')
        .eq('planner_id', planner.id)
        .order('priority_slot', { ascending: true }),
      supabase
        .from('time_blocks')
        .select('*, brain_dump_items(*)')
        .eq('planner_id', planner.id)
        .order('start_time', { ascending: true }),
    ]);

  return {
    ...planner,
    brain_dump_items: (brainDumpResult.data || []) as BrainDumpItem[],
    top_priorities: (prioritiesResult.data || []) as TopPriority[],
    time_blocks: (timeBlocksResult.data || []) as TimeBlock[],
  };
}

// ============================================
// BRAIN DUMP OPERATIONS
// ============================================

/**
 * Create a new brain dump item
 */
export async function createBrainDumpItem(
  input: Omit<CreateBrainDumpItemInput, 'user_id'>
): Promise<BrainDumpItem> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createServerSupabaseClient();

  // Get highest order_index for this planner
  const { data: existingItems } = await supabase
    .from('brain_dump_items')
    .select('order_index')
    .eq('planner_id', input.planner_id)
    .order('order_index', { ascending: false })
    .limit(1);

  const newOrderIndex = (existingItems?.[0]?.order_index ?? -1) + 1;

  const { data, error } = await supabase
    .from('brain_dump_items')
    .insert({
      ...input,
      user_id: userId,
      order_index: input.order_index ?? newOrderIndex,
    })
    .select()
    .single();

  if (error)
    throw new Error(`Failed to create brain dump item: ${error.message}`);
  return data as BrainDumpItem;
}

/**
 * Update a brain dump item
 */
export async function updateBrainDumpItem(
  id: string,
  updates: UpdateBrainDumpItemInput
): Promise<BrainDumpItem> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('brain_dump_items')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error)
    throw new Error(`Failed to update brain dump item: ${error.message}`);
  return data as BrainDumpItem;
}

/**
 * Delete a brain dump item
 */
export async function deleteBrainDumpItem(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('brain_dump_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error)
    throw new Error(`Failed to delete brain dump item: ${error.message}`);
}

// ============================================
// TOP PRIORITIES OPERATIONS
// ============================================

/**
 * Create or update a priority
 * Uses upsert to handle both create and update in one call
 */
export async function upsertTopPriority(
  input: Omit<CreateTopPriorityInput, 'user_id'>
): Promise<TopPriority> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('top_priorities')
    .upsert(
      {
        ...input,
        user_id: userId,
      },
      {
        onConflict: 'planner_id,priority_slot',
      }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert priority: ${error.message}`);
  return data as TopPriority;
}

/**
 * Update a priority
 */
export async function updateTopPriority(
  id: string,
  updates: UpdateTopPriorityInput
): Promise<TopPriority> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('top_priorities')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update priority: ${error.message}`);
  return data as TopPriority;
}

/**
 * Delete a priority
 */
export async function deleteTopPriority(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('top_priorities')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete priority: ${error.message}`);
}

/**
 * Swap a priority item - replaces existing priority with new brain dump item
 * If the slot is occupied, the old item's is_priority flag is automatically reset via trigger
 *
 * @param plannerId - The planner ID
 * @param prioritySlot - The priority slot number (1, 2, or 3)
 * @param brainDumpItemId - The brain dump item ID to add to priorities
 */
export async function swapPriorityItem(
  plannerId: string,
  prioritySlot: number,
  brainDumpItemId: string
): Promise<TopPriority> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createServerSupabaseClient();

  // Use upsert to automatically replace if exists, or insert if empty
  // The database triggers will handle setting/unsetting is_priority flags
  const { data, error } = await supabase
    .from('top_priorities')
    .upsert(
      {
        planner_id: plannerId,
        user_id: userId,
        priority_slot: prioritySlot,
        brain_dump_item_id: brainDumpItemId,
        custom_text: null, // Clear any custom text when using brain dump item
      },
      {
        onConflict: 'planner_id,priority_slot',
      }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to swap priority: ${error.message}`);

  console.log(
    `✅ Priority swapped: Slot ${prioritySlot} → Item ${brainDumpItemId}`
  );
  return data as TopPriority;
}

// ============================================
// TIME BLOCKS OPERATIONS
// ============================================

/**
 * Create a time block
 */
export async function createTimeBlock(
  input: Omit<CreateTimeBlockInput, 'user_id'>
): Promise<TimeBlock> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('time_blocks')
    .insert({
      ...input,
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create time block: ${error.message}`);
  return data as TimeBlock;
}

/**
 * Update a time block
 */
export async function updateTimeBlock(
  id: string,
  updates: UpdateTimeBlockInput
): Promise<TimeBlock> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('time_blocks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update time block: ${error.message}`);
  return data as TimeBlock;
}

/**
 * Delete a time block
 */
export async function deleteTimeBlock(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('time_blocks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete time block: ${error.message}`);
}

/**
 * Reorder brain dump items
 */
export async function reorderBrainDumpItems(
  items: { id: string; order_index: number }[]
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createServerSupabaseClient();

  // Update all items in parallel
  await Promise.all(
    items.map((item) =>
      supabase
        .from('brain_dump_items')
        .update({ order_index: item.order_index })
        .eq('id', item.id)
        .eq('user_id', userId)
    )
  );
}
