// app/dashboard/page.tsx - Updated to handle date selection

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getFullPlanner } from '@/lib/planner-api';
import { getToday } from '@/lib/utils';
import DashboardContent from '@/components/dashboard/DashboardContent';

interface DashboardPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/auth');
  }

  const user = await currentUser();

  // Get date from query params or use today
  const params = await searchParams;
  const date = params.date || getToday();

  // Get planner data for the selected date
  const planner = await getFullPlanner(date);

  return (
    <>
      <DashboardContent
        planner={planner}
        userName={user?.firstName || 'User'}
        date={date}
      />
      {/* Position UserButton absolutely in the header */}
      <div className="fixed top-4 right-4 z-10">
        <UserButton afterSignOutUrl="/" />
      </div>
    </>
  );
}
