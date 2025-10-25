import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const { userId } = await auth();

  // If already authenticated, redirect to dashboard
  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-amber-50 to-orange-100 px-4">
      <div className="max-w-4xl text-center">
        {/* Hero Section */}
        <h1 className="mb-6 text-6xl font-bold text-gray-900">
          Daily Timeboxing Planner
        </h1>
        <p className="mb-8 text-xl text-gray-600">
          Inspired by Elon Musk&apos;s productivity method. Plan your day in
          30-minute blocks, prioritize what matters, and get things done.
        </p>

        {/* Features */}
        <div className="mb-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-2 text-4xl">🧠</div>
            <h3 className="mb-2 text-lg font-semibold">Brain Dump</h3>
            <p className="text-sm text-gray-600">
              Capture all your thoughts and tasks in one place
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-2 text-4xl">⭐</div>
            <h3 className="mb-2 text-lg font-semibold">Top Priorities</h3>
            <p className="text-sm text-gray-600">
              Focus on your 3 most important tasks of the day
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-2 text-4xl">📅</div>
            <h3 className="mb-2 text-lg font-semibold">Timeboxing</h3>
            <p className="text-sm text-gray-600">
              Schedule exactly when you&apos;ll do each task
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <Link
          href="/auth"
          className="inline-flex items-center rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
        >
          Get Started - It&apos;s Free
        </Link>

        {/* Social Proof */}
        <p className="mt-6 text-sm text-gray-600">
          Join thousands of productive people using timeboxing
        </p>
      </div>
    </div>
  );
}
