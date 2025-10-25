// ============================================
// DATABASE TYPES
// ============================================
// Auto-generated types for Supabase tables
// Corresponds to: supabase-schema.sql

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: 'free' | 'pro' | 'premium';
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  first_signed_in_at: string;
  last_signed_in_at: string;
  created_at: string;
  updated_at: string;
}

export interface DailyPlanner {
  id: string;
  user_id: string;
  planner_date: string; // ISO date string: "2025-01-15"
  created_at: string;
  updated_at: string;
}

export interface BrainDumpItem {
  id: string;
  planner_id: string;
  user_id: string;
  text: string;
  is_completed: boolean;
  is_priority: boolean; // Auto-updated by trigger
  is_scheduled: boolean; // Auto-updated by trigger
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TopPriority {
  id: string;
  planner_id: string;
  user_id: string;
  brain_dump_item_id: string | null;
  custom_text: string | null;
  priority_slot: 1 | 2 | 3;
  is_completed: boolean;
  created_at: string;
  updated_at: string;

  // Joined data (when using .select('*, brain_dump_items(*)'))
  brain_dump_item?: BrainDumpItem;
}

export type ColorTag = 'blue' | 'orange' | 'pink' | 'teal' | 'purple';

export interface TimeBlock {
  id: string;
  planner_id: string;
  user_id: string;
  start_time: string; // "08:30:00"
  end_time: string; // "09:45:00"
  brain_dump_item_id: string | null;
  custom_text: string | null;
  notes: string | null;
  color_tag: ColorTag;
  is_completed: boolean;
  created_at: string;
  updated_at: string;

  // Joined data (when using .select('*, brain_dump_items(*)'))
  brain_dump_item?: BrainDumpItem;
}

// ============================================
// COMBINED TYPES (for fetching full planner)
// ============================================

export interface FullPlanner extends DailyPlanner {
  brain_dump_items: BrainDumpItem[];
  top_priorities: TopPriority[];
  time_blocks: TimeBlock[];
}

// ============================================
// INPUT TYPES (for creating/updating records)
// ============================================

export interface CreateBrainDumpItemInput {
  planner_id: string;
  user_id: string;
  text: string;
  order_index?: number;
}

export interface UpdateBrainDumpItemInput {
  text?: string;
  is_completed?: boolean;
  order_index?: number;
}

export interface CreateTopPriorityInput {
  planner_id: string;
  user_id: string;
  priority_slot: 1 | 2 | 3;
  brain_dump_item_id?: string;
  custom_text?: string;
}

export interface UpdateTopPriorityInput {
  brain_dump_item_id?: string | null;
  custom_text?: string | null;
  is_completed?: boolean;
}

export interface CreateTimeBlockInput {
  planner_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  brain_dump_item_id?: string;
  custom_text?: string;
  notes?: string;
  color_tag?: ColorTag;
}

export interface UpdateTimeBlockInput {
  start_time?: string;
  end_time?: string;
  brain_dump_item_id?: string | null;
  custom_text?: string | null;
  notes?: string | null;
  color_tag?: ColorTag;
  is_completed?: boolean;
}

// ============================================
// UTILITY TYPES
// ============================================

export interface TimeRange {
  start: string;
  end: string;
}

export interface PlannerStats {
  totalBrainDumpItems: number;
  completedBrainDumpItems: number;
  totalPriorities: number;
  completedPriorities: number;
  totalTimeBlocks: number;
  completedTimeBlocks: number;
  scheduledHours: number;
}
