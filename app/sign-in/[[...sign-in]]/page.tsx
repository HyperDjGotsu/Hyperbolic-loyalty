import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <span className="font-display text-2xl font-bold text-primary">GSHC Player Pass</span>
        <p className="text-sm text-secondary mt-1">Welcome back</p>
      </div>
      <SignIn forceRedirectUrl="/dashboard" />
      <p className="mt-6 text-xs text-tertiary text-center">
        © 2026 Hyperbolic Creative
      </p>
    </div>
  );
}
