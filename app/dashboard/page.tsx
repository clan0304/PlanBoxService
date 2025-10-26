import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getFullPlanner } from '@/lib/planner-api';
import { getToday } from '@/lib/utils';
import BrainDumpList from '@/components/braindump/BrainDumpList';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/auth');
  }

  const user = await currentUser();
  const today = getToday();

  // Get today's planner data
  const planner = await getFullPlanner(today);

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 to-orange-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Daily Timeboxing Planner
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.firstName || 'User'}!
              </p>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Date Navigation - TODO: Add DatePicker component */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <button className="rounded px-4 py-2 hover:bg-gray-100">←</button>
            <h2 className="text-xl font-semibold">{today}</h2>
            <button className="rounded px-4 py-2 hover:bg-gray-100">→</button>
          </div>
        </div>

        {/* Planner Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Priorities & Brain Dump */}
          <div className="space-y-6">
            {/* Top Priorities */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-bold">Top Priorities</h3>
              <div className="space-y-3">
                {[1, 2, 3].map((slot) => {
                  const priority = planner.top_priorities.find(
                    (p) => p.priority_slot === slot
                  );
                  return (
                    <div
                      key={slot}
                      className="rounded border-2 border-dashed border-gray-300 p-3"
                    >
                      {priority ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={priority.is_completed}
                            className="h-4 w-4"
                          />
                          <span>
                            {priority.brain_dump_item?.text ||
                              priority.custom_text}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">
                          Drag item here or click to add
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Brain Dump - NOW INTERACTIVE! */}
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
                      {/* TODO: Add TimeBlock components here */}
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
                              {block.brain_dump_item?.text || block.custom_text}
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
  );
}
