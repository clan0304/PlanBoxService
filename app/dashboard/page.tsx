import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getFullPlanner } from '@/lib/planner-api';
import { getToday } from '@/lib/utils';
import DashboardContent from '@/components/dashboard/DashboardContent';

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
    <>
      <DashboardContent 
        planner={planner} 
        userName={user?.firstName || 'User'}
        date={today}
      />
      {/* Position UserButton absolutely in the header */}
      <div className="fixed top-4 right-4 z-10">
        <UserButton afterSignOutUrl="/" />
      </div>
    </>
  );
}