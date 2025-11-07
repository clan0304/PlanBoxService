# 🎯 Daily Timeboxing Planner - Project Summary

This document summarizes the complete architecture, decisions, and implementation details of the Daily Timeboxing Planner project.

---

## 📖 Project Overview

### **Concept**

A productivity web application inspired by Elon Musk's timeboxing methodology. Users plan their day by:

1. **Brain Dumping** - Capturing all thoughts and tasks
2. **Prioritizing** - Selecting 3 most important tasks
3. **Timeboxing** - Scheduling tasks in visual time blocks

### **Core Philosophy**

- **From Chaos to Clarity**: Natural funnel from unstructured thoughts → focused priorities → scheduled actions
- **Single Source of Truth**: Brain dump items are referenced (not duplicated) in priorities and schedule
- **Visual Planning**: Calendar-style time blocks (flexible duration) instead of rigid grid cells
- **OAuth-Only**: Google authentication only (no email/password complexity)
- **Free MVP**: Launch free, add Stripe subscription later

---

## 🏗️ Architecture Decisions

### **1. Authentication: OAuth-Only Approach**

**Decision**: Use Google OAuth exclusively via Clerk (no email/password)

**Reasoning**:

- OAuth handles both sign-in and sign-up automatically
- No need for separate sign-up flow or email verification
- Users prefer familiar "Continue with Google" button
- Simpler UX and implementation
- More secure (delegated to Google)

**Implementation**:

- Single `/auth` page for both sign-in and sign-up
- Clerk handles all OAuth complexity
- Automatic account creation on first sign-in

### **2. Database: Clerk + Supabase Integration**

**Decision**: Use Clerk for auth, Supabase for data, sync via webhooks

**Reasoning**:

- Clerk excels at authentication and user management
- Supabase excels at PostgreSQL with RLS
- Native integration (as of April 2025) simplifies setup
- No shared JWT secrets needed - uses JWKS verification
- Best of both worlds

**Implementation**:

- Clerk stores user identity (name, email, photo)
- Supabase stores app data (planners, tasks, time blocks)
- `user_id` (TEXT) references Clerk user ID in all tables
- Webhook syncs user creation/updates/deletion
- RLS policies use `auth.jwt()->>'sub'` to verify user

### **3. Users Table: Future-Ready Design**

**Decision**: Create users table now with Stripe fields (empty for MVP)

**Reasoning**:

- Easy to add paid features later without migration
- Can track analytics even in free version
- Foreign keys provide referential integrity
- No backfill needed when adding Stripe
- Just populate Stripe fields via webhook when ready

**Structure**:

```sql
users (
  id TEXT PRIMARY KEY,  -- Clerk user ID
  email TEXT,
  subscription_tier DEFAULT 'free',
  stripe_customer_id TEXT,  -- NULL for now
  stripe_subscription_id TEXT,  -- NULL for now
  ...
)
```

### **4. Brain Dump: Array with Individual Items**

**Decision**: Store brain dump as individual database rows, not plain text

**Reasoning**:

- Users can delete single items easily
- Can check off completed items
- Can drag individual items to priorities/schedule
- Can track which items are prioritized/scheduled
- Better for future features (search, filters, analytics)

**Alternative Considered**: Plain text textarea (rejected - too limiting)

### **5. Data Model: Reference Pattern**

**Decision**: Brain dump items are master records; priorities/time blocks reference them

**Reasoning**:

- Single source of truth (edit once, updates everywhere)
- Can track item lifecycle (brain dump → priority → scheduled)
- Visual indicators show item status
- Allows flexible input (reference brain dump OR type directly)

**Flow**:

```
brain_dump_item
    ↓ drag (creates reference)
top_priority (brain_dump_item_id) ✓ is_priority flag set
    ↓ drag (creates reference)
time_block (brain_dump_item_id) ✓ is_scheduled flag set
```

**Triggers auto-update flags**:

- When priority created → set `brain_dump_items.is_priority = true`
- When time block created → set `brain_dump_items.is_scheduled = true`
- When deleted → check if any other references exist, if not set to false

### **6. Priorities: Fixed 3 Slots**

**Decision**: Exactly 3 priority slots (not 4, not variable)

**Reasoning**:

- Based on user's reference design
- Forces focus (can't prioritize everything)
- Proven productivity method (Rule of Three)
- Simpler UI layout

**Implementation**:

```sql
priority_slot INTEGER CHECK (priority_slot BETWEEN 1 AND 3)
UNIQUE(planner_id, priority_slot)
```

### **7. Time Blocks: Flexible Duration**

**Decision**: Visual calendar blocks with flexible duration (like Google Calendar)

**Reasoning**:

- Based on user's reference image
- More realistic than fixed 30-min cells
- Visual representation matches mental model
- Different tasks need different durations

**Implementation**:

- Store `start_time` and `end_time` (not just slot number)
- Calculate block height based on duration (80px per hour)
- Position absolutely on timeline
- Allow resizing and dragging

**Alternative Considered**: Fixed 30-minute grid (rejected - too rigid)

### **8. Drag & Drop: @dnd-kit Library**

**Decision**: Use @dnd-kit for drag and drop functionality

**Reasoning**:

- Modern, TypeScript-first library
- Better performance than react-beautiful-dnd
- Active maintenance and development
- Flexible and extensible
- Built-in accessibility support
- Works with Next.js 15 App Router

**Implementation**:

- `@dnd-kit/core` for basic drag & drop
- `@dnd-kit/utilities` for transform utilities
- `useDraggable()` hook for brain dump items
- `useDroppable()` hook for priority slots
- Custom `DndContext` wrapper component
- Visual feedback with opacity, rings, borders
- Loading states during API operations

---

## 🗄️ Database Schema

### **Tables (5 total)**

#### 1. **users**

- Synced from Clerk via webhook
- Ready for Stripe (fields present but NULL)
- Foreign key parent for all other tables

#### 2. **daily_planners**

- One per user per day
- Container for all day's data
- `UNIQUE(user_id, planner_date)`

#### 3. **brain_dump_items**

- Master source for all tasks/thoughts
- Has status flags: `is_priority`, `is_scheduled`
- `order_index` for drag & drop reordering

#### 4. **top_priorities**

- 3 slots per planner
- References `brain_dump_items` OR has `custom_text`
- `CHECK` constraint ensures one or the other

#### 5. **time_blocks**

- Flexible duration (`start_time`, `end_time`)
- References `brain_dump_items` OR has `custom_text`
- Color coding via `color_tag`

### **Key Design Patterns**

**Row Level Security (RLS)**:

- All tables have RLS enabled
- Policies check: `auth.jwt()->>'sub' = user_id`
- Service role can bypass (for webhooks)

**Foreign Keys**:

- All tables reference `users(id)` with `ON DELETE CASCADE`
- Safe deletion: deleting user removes all their data
- Referential integrity enforced

**Triggers**:

- `updated_at` auto-updates on every change
- Status flags (`is_priority`, `is_scheduled`) auto-update

---

## 🔐 Authentication Flow

### **Clerk Configuration**

1. Google OAuth enabled (only provider)
2. Supabase integration activated (native method)
3. JWT tokens include `"role": "authenticated"` claim
4. Clerk domain registered with Supabase

### **Supabase Configuration**

1. Third-party auth provider: Clerk
2. JWKS endpoint: Uses Clerk's public keys
3. Automatic JWT verification (no shared secrets)

### **User Sync Webhook**

```
User signs up with Google
    ↓
Clerk creates user account
    ↓
Webhook fires: user.created
    ↓
API route: /api/webhooks/clerk
    ↓
Supabase: INSERT into users table
    ↓
User can now access dashboard
```

### **Session Flow**

```
Client Component:
  session.getToken() → Clerk JWT
      ↓
  Pass to Supabase client
      ↓
  Supabase verifies with Clerk JWKS
      ↓
  Extracts user_id from 'sub' claim
      ↓
  RLS policies enforce access control
```

---

## 🎨 UI/UX Decisions

### **Single Auth Page**

- One route (`/auth`) for both sign-in and sign-up
- OAuth makes distinction unnecessary
- Simpler navigation and UX

### **Visual Design**

- **Color Palette**: Warm beige/amber (inspired by user's mockup)
- **Time Blocks**: Color-coded cards (blue, orange, pink, teal, purple)
- **Layout**: Three-column responsive grid
  - Left: Priorities (top) + Brain Dump (bottom)
  - Right: Timeline schedule (spans full height)

### **Status Indicators**

Brain dump items show visual status:

- ⭐ Blue border = In priorities (`is_priority: true`)
- 📅 Green border = Scheduled (`is_scheduled: true`)
- 🟪 Purple border = Both priority AND scheduled
- ☑ Strikethrough = Completed

### **Drag & Drop Visual Feedback**

- **Drag Handle**: ⋮⋮ appears on hover
- **Dragging State**: 50% opacity, blue ring, shadow
- **Drop Zone Hover**: Blue border, blue background
- **Cursor Changes**: grab → grabbing
- **Loading State**: Full-screen spinner overlay

---

## 🔧 Technical Implementation

### **Tech Stack**

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Clerk (Google OAuth only)
- **Styling**: Tailwind CSS
- **Drag & Drop**: @dnd-kit
- **Deployment**: Vercel (recommended)

### **File Structure**

```
app/
  ├── layout.tsx              # ClerkProvider wrapper
  ├── page.tsx               # Landing page
  ├── auth/page.tsx          # Single auth page
  ├── dashboard/page.tsx     # Main planner
  └── api/webhooks/clerk/    # User sync

components/
  ├── braindump/
  │   ├── BrainDumpInput.tsx   # Add new items
  │   ├── BrainDumpItem.tsx    # Draggable item ✨ NEW
  │   └── BrainDumpList.tsx    # Container
  ├── priorities/              # ✨ NEW FOLDER
  │   └── PrioritySlot.tsx     # Droppable slot ✨ NEW
  ├── dashboard/
  │   └── DashboardContent.tsx # Main layout ✨ UPDATED
  └── dnd/
      └── DndWrapper.tsx       # DnD context

lib/
  ├── supabase/
  │   ├── client.ts          # Client-side (useSession)
  │   └── server.ts          # Server-side (auth())
  ├── planner-api.ts         # CRUD operations
  └── utils.ts               # Time/date helpers

types/
  └── database.ts            # TypeScript interfaces
```

### **Supabase Client Pattern**

**Client Components** (with `'use client'`):

```typescript
const { session } = useSession();
const supabase = createClerkSupabaseClient(async () => {
  return session?.getToken() ?? null;
});
```

**Server Components** (no directive):

```typescript
const supabase = createServerSupabaseClient();
// Uses auth() internally
```

**Key Difference**:

- Client: Function returns client synchronously, token fetched lazily
- Server: Function returns client synchronously, token fetched on request

### **API Pattern**

All database operations are server actions (`'use server'`):

```typescript
export async function createBrainDumpItem(input) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  const supabase = createServerSupabaseClient();
  // ... perform operation
}
```

Benefits:

- Type-safe
- Automatic RLS enforcement
- No API routes needed for simple CRUD
- Better performance (server-side)

---

## 🎯 Key Features & Workflows

### **Feature 1: Brain Dump Capture**

```
User types thought → Press Enter
    ↓
createBrainDumpItem() server action
    ↓
Insert with auto-incremented order_index
    ↓
Revalidate page
    ↓
New item appears in list
```

### **Feature 2: Drag to Priority** ✨ NEW

```
User hovers over brain dump item → sees ⋮⋮ handle
    ↓
User drags item → item becomes 50% opacity with blue ring
    ↓
User hovers over priority slot → slot highlights blue
    ↓
User drops item → loading spinner appears
    ↓
swapPriorityItem(brain_dump_item_id, slot) server action
    ↓
Database trigger sets is_priority = true
    ↓
Page refreshes automatically
    ↓
Item shows ⭐ indicator in brain dump
    ↓
Priority slot displays referenced text

If slot was occupied:
  → Old item returns to brain dump
  → Old item loses ⭐ indicator
  → New item gains ⭐ indicator
```

### **Feature 3: Drag to Schedule** (Future)

```
Drag item → Drop on time slot
    ↓
createTimeBlock(brain_dump_item_id, start, end)
    ↓
Database trigger sets is_scheduled = true
    ↓
Item shows 📅 indicator in brain dump
    ↓
Visual block appears on timeline
```

### **Feature 4: Date Navigation**

```
User clicks "Next Day"
    ↓
getOrCreatePlanner(tomorrow)
    ↓
Fetch or create planner for date
    ↓
Load all related data (brain dump, priorities, blocks)
    ↓
Render dashboard for new date
```

---

## 🚀 Development Roadmap

### **✅ Phase 1: MVP Foundation (Complete)**

- [x] Database schema with RLS
- [x] Google OAuth authentication
- [x] User sync webhook
- [x] Basic dashboard layout
- [x] Display all data
- [x] CRUD API functions
- [x] Brain dump input and display
- [x] Priority slots display
- [x] Time blocks display

### **🚧 Phase 2: Interactivity (In Progress)**

- [x] **Drag & drop implementation (COMPLETE - Code provided, needs testing)** ✨
  - [x] @dnd-kit packages installed
  - [x] DndContext wrapper created
  - [x] Draggable brain dump items
  - [x] Droppable priority slots
  - [x] Drag end event handling
  - [x] Visual feedback (opacity, rings, borders)
  - [x] Loading states during API calls
  - [x] Error handling with alerts
  - [ ] User testing and validation
- [ ] Time block creation modal
- [ ] Date picker component
- [ ] Completion toggles (partially done)
- [ ] Real-time updates (currently uses router.refresh())

### **📋 Phase 3: Polish**

- [ ] Color customization
- [ ] Time block resizing
- [ ] Drag to schedule functionality
- [ ] Keyboard shortcuts
- [ ] Enhanced loading states
- [ ] Toast notifications (replacing alerts)
- [ ] Mobile responsive design
- [ ] Dark mode

### **💰 Phase 4: Monetization**

- [ ] Stripe integration
- [ ] Subscription checkout
- [ ] Stripe webhooks
- [ ] Feature gating (free vs pro)
- [ ] Usage limits for free tier
- [ ] Pro features:
  - [ ] Unlimited history
  - [ ] Advanced analytics
  - [ ] PDF export
  - [ ] Recurring tasks
  - [ ] Templates

### **📈 Phase 5: Advanced Features**

- [ ] Weekly/monthly views
- [ ] Task templates
- [ ] Recurring time blocks
- [ ] Google Calendar integration
- [ ] Email reminders
- [ ] Pomodoro timer
- [ ] Focus mode
- [ ] Analytics dashboard
- [ ] Team sharing (if B2B pivot)

---

## 💡 Important Technical Notes

### **Why No JWT Template?**

As of April 2025, Clerk deprecated JWT templates in favor of native integration:

- **Old way**: Create JWT template with Supabase secret
- **New way**: Activate integration, Supabase uses JWKS
- **Benefits**: No shared secrets, simpler setup, more secure

### **Why Triggers for Status Flags?**

Alternative: Check on every query (slower)

```sql
-- Bad: Query every time
SELECT *,
  EXISTS(SELECT 1 FROM top_priorities WHERE ...) as is_priority
```

Triggers update flags once when data changes:

- Faster queries (indexed boolean)
- Simpler application code
- Consistent state

### **Why Foreign Keys?**

RLS alone doesn't enforce referential integrity:

- Foreign keys prevent orphaned records
- Cascade deletes clean up related data
- Database-level guarantees

### **Why Service Role Key?**

Webhooks need to bypass RLS:

- Webhook doesn't have user JWT
- Needs to create/update/delete users
- Service role has superuser permissions
- ⚠️ Never expose to client!

### **Why @dnd-kit over react-beautiful-dnd?**

@dnd-kit is the modern choice:

- Better TypeScript support
- More performant (uses transform instead of position)
- Active development (react-beautiful-dnd is in maintenance mode)
- Smaller bundle size
- Better accessibility out of the box
- Works seamlessly with Next.js 15 App Router

---

## 🔒 Security Considerations

### **What's Protected**

✅ All database operations via RLS
✅ User can only access their own data
✅ JWT verification via Clerk JWKS
✅ Webhook signature verification (Svix)
✅ Service role key never exposed to client

### **What to Add (Production)**

⚠️ Rate limiting on API routes
⚠️ CSRF protection on webhooks
⚠️ Input validation and sanitization
⚠️ SQL injection prevention (Supabase handles)
⚠️ XSS prevention (React handles)

---

## 📊 Data Flow Examples

### **Loading Dashboard**

```
1. User visits /dashboard
2. Server Component: auth() → get userId
3. getFullPlanner(today) server action
4. Queries with RLS automatically filter by userId:
   - daily_planners WHERE user_id = userId AND date = today
   - brain_dump_items WHERE planner_id = planner.id
   - top_priorities WHERE planner_id = planner.id
   - time_blocks WHERE planner_id = planner.id
5. Combine into FullPlanner object
6. Render on page
```

### **Dragging to Priority** ✨ NEW

```
1. User hovers over brain dump item
2. Sees ⋮⋮ drag handle appear
3. User clicks and holds drag handle
4. useDraggable hook activates:
   - Item opacity → 50%
   - Blue ring appears
   - isDragging = true
5. User drags over priority slot
6. useDroppable hook detects:
   - isOver = true
   - Slot highlights blue
7. User releases mouse
8. DndContext fires onDragEnd event
9. DashboardContent.handleDragEnd():
   - Extracts: brainDumpItemId, prioritySlot
   - Sets isSwapping = true (shows spinner)
   - Calls swapPriorityItem() server action
10. Server action:
    - auth() → verify user
    - createServerSupabaseClient()
    - UPSERT into top_priorities table
11. Database trigger:
    - Sets old item: is_priority = false
    - Sets new item: is_priority = true
12. router.refresh()
13. Page reloads with updated data
14. Priority slot shows new item
15. Brain dump shows ⭐ indicator
```

### **Creating Time Block** (Future)

```
1. User drags brain dump item to 9:00 AM
2. Client captures: brain_dump_item_id, drop time
3. Call createTimeBlock server action:
   - auth() → verify user
   - createServerSupabaseClient()
   - INSERT time_blocks with user_id check
4. Database trigger:
   - UPDATE brain_dump_items SET is_scheduled = true
5. revalidatePath('/dashboard')
6. Page refreshes with new block visible
7. Brain dump item now shows 📅 indicator
```

---

## 🎓 Lessons Learned

### **1. Keep It Simple**

Started with complex JWT templates → Switched to native integration
Simpler is better, especially when officially supported.

### **2. Plan for Future**

Adding users table now (even mostly empty) saves migration pain later.
Easier to add Stripe fields than restructure everything.

### **3. OAuth > Email/Password**

For B2C apps, OAuth reduces friction dramatically.
No verification emails, password resets, or security concerns.

### **4. Visual References Matter**

User provided calendar UI mockup → Guided entire design.
Much better than text descriptions.

### **5. Database Triggers Are Powerful**

Auto-updating status flags simplified application logic.
Database handles consistency automatically.

### **6. Modern Libraries Matter** ✨ NEW

Choosing @dnd-kit over react-beautiful-dnd paid off:

- Better TypeScript support
- Easier to implement
- Better performance
- Active maintenance

---

## 🤝 Project Context

### **User Goals**

- Build timeboxing planner inspired by Elon Musk
- Launch free MVP quickly
- Add paid features later (Stripe)
- Simple, visual, easy to use

### **Technical Constraints**

- Next.js 15 (latest)
- TypeScript (type safety)
- Clerk for auth (already decided)
- Supabase for database (already decided)
- Google OAuth only (no email/password)

### **Design Principles**

1. **From Chaos to Clarity** - Brain dump → Priorities → Schedule
2. **Single Source of Truth** - Reference, don't duplicate
3. **Visual > Text** - Calendar blocks > Grid cells
4. **Simple > Complex** - OAuth only, single auth page
5. **Future-Ready** - Stripe fields ready, extensible schema

---

## 📝 Development Notes

### **Current State** ✨ UPDATED

✅ Complete database schema
✅ Authentication working
✅ User sync operational  
✅ Basic UI displaying data
✅ All CRUD functions ready
✅ **Drag & drop code complete (awaiting user testing)** ✨ NEW
✅ Brain dump items are draggable
✅ Priority slots are droppable
✅ Swap logic implemented
✅ Visual feedback working
✅ Loading states added
✅ Error handling in place

### **Immediate Next Steps**

1. **User testing of drag & drop** ← Current priority
2. Add time block creation modal
3. Implement date navigation (prev/next day)
4. Add time block drag & drop (schedule feature)
5. Enhance completion toggle UX
6. Add toast notifications (replace alerts)

### **Known Limitations**

- **Drag & drop to schedule not implemented yet** (only priorities work)
- No time block editing modal
- No mobile optimization
- No error boundaries
- Date navigation buttons not functional
- Uses `router.refresh()` instead of optimistic updates
- Alert dialogs instead of toast notifications

### **Technical Debt**

- Should add error boundaries
- Need loading skeletons for initial page load
- Should add TypeScript strict null checks
- Need comprehensive end-to-end testing
- Should implement optimistic updates for better UX
- Consider adding undo functionality

### **Files Changed in Drag & Drop Implementation** ✨ NEW

1. **components/braindump/BrainDumpItem.tsx**

   - Added `useDraggable` hook
   - Added drag handle (⋮⋮)
   - Added visual feedback (opacity, ring)
   - Added disabled states

2. **components/priorities/PrioritySlot.tsx** (NEW FILE)

   - Added `useDroppable` hook
   - Added hover state highlighting
   - Added completion toggle

3. **components/dashboard/DashboardContent.tsx**
   - Added `handleDragEnd` function
   - Added `swapPriorityItem` API call
   - Added loading state management
   - Integrated PrioritySlot components

---

## 🎯 Success Metrics (Future)

### **MVP Success**

- [ ] User can sign up in < 30 seconds
- [ ] User can create full day plan in < 5 minutes
- [ ] 80% of users return day 2
- [ ] < 1% error rate

### **Product-Market Fit**

- [ ] 40%+ weekly active users
- [ ] 10+ days average usage per month
- [ ] Net Promoter Score > 40
- [ ] Users recommend to friends

### **Monetization**

- [ ] 5%+ conversion to paid
- [ ] < 5% monthly churn
- [ ] $9/month sustainable price point
- [ ] 12+ month payback period

---

## 🌟 Project Vision

Build the **simplest, most visual timeboxing planner** that helps people:

- Get thoughts out of their head (brain dump)
- Focus on what matters (3 priorities)
- Actually schedule work (visual time blocks)

No complexity, no distractions, just effective daily planning.

**Inspired by**: Elon Musk's 5-minute timeboxing
**Built for**: Anyone who wants to be more intentional with their time
**Different because**: Visual, drag-and-drop, brain dump → schedule flow

---

## 📚 References

### **Documentation**

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Clerk Docs](https://clerk.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Clerk-Supabase Integration](https://clerk.com/docs/integrations/databases/supabase)
- [@dnd-kit Documentation](https://docs.dndkit.com) ✨ NEW

### **Key Articles**

- [Clerk + Supabase Native Integration](https://clerk.com/changelog/2025-03-31-supabase-integration)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Timeboxing Methodology](https://en.wikipedia.org/wiki/Timeboxing)
- [@dnd-kit vs react-beautiful-dnd](https://github.com/clauderic/dnd-kit#comparison-with-react-beautiful-dnd) ✨ NEW

### **Design Inspiration**

- User-provided calendar mockup
- Google Calendar UI
- Notion database views
- Linear issue tracker

---

**Last Updated**: 2025-11-02 ✨ UPDATED
**Status**: Phase 2 In Progress - Drag & Drop Code Complete
**Next Milestone**: User Testing & Time Block Creation

---

_This document should be updated as the project evolves._
