import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Player Pass',
  description: 'What Player Pass collects, why, who handles it, and how to delete it.',
};

const CONTACT_EMAIL = 'support@playerpass.gg';
const LAST_UPDATED = 'October 18, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-[#f2efe8]">{title}</h2>
      <div className="mt-3 space-y-3 text-[#c9c2b4] leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#111009] px-4 py-12">
      <article className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-black text-[#f2efe8]">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#7a7060]">Last updated {LAST_UPDATED}</p>

        <p className="mt-6 text-[#c9c2b4] leading-relaxed">
          Player Pass is a loyalty app for local game stores. You earn XP and Prize Points by
          attending events, redeem prizes, and connect with other players. This page explains what
          we collect, why, who helps us run the app, and how to delete your data.
        </p>

        <Section title="What we collect">
          <p>
            <strong className="text-[#f2efe8]">Account information.</strong> Your email address and
            password (the password is handled by our sign-in provider and is never visible to us),
            your name or display name, and the home store you choose.
          </p>
          <p>
            <strong className="text-[#f2efe8]">Optional profile information.</strong> A profile
            photo or avatar, a Discord username, and a phone number. You can leave these blank.
          </p>
          <p>
            <strong className="text-[#f2efe8]">Activity.</strong> Event check-ins, XP and Prize
            Point history, prize redemptions, friends and friend requests, and the games you play.
          </p>
          <p>
            <strong className="text-[#f2efe8]">Notification tokens.</strong> If you allow
            notifications, a device or browser token so we can send them to you.
          </p>
          <p>
            <strong className="text-[#f2efe8]">Camera and photos.</strong> The camera is used only
            to scan event QR codes, and the scan is processed on your device; we do not store camera
            images. The photo library is accessed only when you choose a profile photo.
          </p>
        </Section>

        <Section title="How we use it">
          <p>
            To run your account and the loyalty program: award and track XP and points, show
            leaderboards and your friends, let store staff check you in and honor redemptions, send
            event and account notifications, and keep the service secure.
          </p>
          <p>
            We do not sell your data, we do not show ads, and we do not use third-party advertising
            or cross-app tracking.
          </p>
        </Section>

        <Section title="Who can see your information">
          <p>
            Other players can see your display name, avatar, level, and leaderboard standing, and
            can find you by name or player ID to send a friend request. Staff at participating
            stores can look up players to award XP, check people in, and process prizes. Your email
            and phone number are not shown to other players.
          </p>
        </Section>

        <Section title="Services that process your data">
          <p>We use these providers to operate Player Pass:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Clerk — sign-in and account authentication</li>
            <li>Supabase — database and file storage (including profile photos)</li>
            <li>Vercel — website and API hosting</li>
            <li>Resend — transactional email, such as staff invitations</li>
            <li>Expo — mobile app updates and push notification delivery</li>
          </ul>
          <p>
            These providers process data only to provide their service to us. We may also disclose
            information if required by law.
          </p>
        </Section>

        <Section title="Deleting your account">
          <p>
            You can delete your account at any time from your Profile screen in the app or on
            playerpass.gg. Deletion removes your sign-in identity and removes or anonymizes your
            profile and activity data. A minimal record that a deletion occurred is kept for audit
            purposes and does not identify you. Accounts with active staff permissions must have
            those removed by a network administrator first.
          </p>
          <p>
            If you cannot access the app, email us at{' '}
            <a className="text-[#c4b5fd] underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>{' '}
            and we will delete your account.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Player Pass is not directed to children under 13, and we do not knowingly collect their
            information. If you believe a child has created an account, contact us and we will
            remove it.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If we change this policy we will update the date above. Material changes will be
            announced in the app.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions or requests:{' '}
            <a className="text-[#c4b5fd] underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>
      </article>
    </main>
  );
}
