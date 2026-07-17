import type { ReactNode } from 'react';

// Prevent the token in the URL from leaking to any third-party resources
// loaded on this page via the Referer request header.
export const headers = () => [{ key: 'Referrer-Policy', value: 'no-referrer' }];

export default function AcceptInviteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
