import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-orbitron">
            HYPERBOLIC
          </div>
          <div className="text-orange-400 text-sm font-bold tracking-widest mt-1">— GAMES —</div>
          <p className="text-slate-400 mt-4">Sign in to continue your journey</p>
        </div>
        
        <SignIn 
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-slate-900 border border-slate-700 shadow-2xl",
              headerTitle: "text-cyan-400 font-orbitron",
              headerSubtitle: "text-slate-400",
              formButtonPrimary: "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400",
              formFieldInput: "bg-slate-800 border-slate-700 text-white",
              footerActionLink: "text-cyan-400 hover:text-cyan-300",
              identifierPreview: "text-white",
              formFieldLabel: "text-slate-400",
              dividerLine: "bg-slate-700",
              dividerText: "text-slate-500",
              socialButtonsBlockButton: "bg-slate-800 border-slate-700 hover:bg-slate-700",
              socialButtonsBlockButtonText: "text-white",
            }
          }}
        />
      </div>
    </div>
  );
}
