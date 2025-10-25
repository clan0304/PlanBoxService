import { SignIn } from '@clerk/nextjs';

export default function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="w-full max-w-md px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Daily Timeboxing Planner
          </h1>
          <p className="text-gray-600">
            Manage your time like a pro with timeboxing
          </p>
        </div>

        {/* Clerk Sign In Component */}
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-xl rounded-xl bg-white',
              headerTitle: 'text-2xl font-semibold',
              headerSubtitle: 'text-gray-600',
              socialButtonsBlockButton:
                'border-2 hover:border-blue-500 transition-all',
              socialButtonsBlockButtonText: 'font-medium',
              footerActionText: 'text-gray-600',
              footerActionLink: 'text-blue-600 hover:text-blue-700',
            },
          }}
        />

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
