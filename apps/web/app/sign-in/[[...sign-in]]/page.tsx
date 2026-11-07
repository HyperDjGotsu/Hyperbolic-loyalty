import AuthShell from '@/components/auth/AuthShell';
import { StoreSideLink } from '@/components/LaneLink';
import { SHOW_STORE_PITCH } from '@/lib/site-flags';

export default function SignInPage() {
  return (
    <AuthShell
      mode="sign-in"
      extra={!SHOW_STORE_PITCH ? undefined : <>Running a store? <StoreSideLink className="underline underline-offset-2 hover:text-white/80">See how PlayerPass works</StoreSideLink></>}
    />
  );
}
