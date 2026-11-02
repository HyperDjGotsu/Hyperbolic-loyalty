import AuthShell from '@/components/auth/AuthShell';
import { StoreSideLink } from '@/components/LaneLink';

export default function SignInPage() {
  return (
    <AuthShell
      mode="sign-in"
      extra={<>Running a store? <StoreSideLink className="underline underline-offset-2 hover:text-white/80">See how Player Pass works</StoreSideLink></>}
    />
  );
}
