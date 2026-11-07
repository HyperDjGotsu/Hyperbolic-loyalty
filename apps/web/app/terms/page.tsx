import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — PlayerPass',
  description: 'The rules for using PlayerPass: accounts, points and prizes, passes, conduct, and more.',
};

const CONTACT_EMAIL = 'darrell@hyperbolictcg.com';
const LAST_UPDATED = 'November 2, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-[#f2efe8]">{title}</h2>
      <div className="mt-3 space-y-3 text-[#c9c2b4] leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#111009] px-4 py-12">
      <article className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-black text-[#f2efe8]">Terms of Service</h1>
        <p className="mt-2 text-sm text-[#7a7060]">Last updated {LAST_UPDATED}</p>

        <p className="mt-6 text-[#c9c2b4] leading-relaxed">
          PlayerPass is a loyalty app for local game stores, run by Hyperbolic Creative. By creating
          an account or using the app you agree to these terms. If you do not agree, please do not use
          PlayerPass. Our{' '}
          <a className="text-[#c4b5fd] underline" href="/privacy">Privacy Policy</a> explains how we
          handle your information.
        </p>

        <Section title="Who can use PlayerPass">
          <p>
            You must be 13 or older. If you are under 18, you confirm that a parent or guardian is
            okay with you using the app and with any pass purchased for you. You need an account to
            use most features, and you are responsible for keeping your sign-in details safe and for
            activity on your account. Give us accurate information and keep one account per person.
          </p>
        </Section>

        <Section title="XP, Prize Points, and ranks">
          <p>
            XP, levels, ranks, and Prize Points are part of a game-like loyalty program. They have no
            cash value, cannot be sold, traded, or transferred, and are not property. Stores decide
            how events award XP and points, and award amounts, multipliers, and prize prices can
            change. We may correct balances that are wrong because of a bug, a mistake, or misuse.
          </p>
        </Section>

        <Section title="Passes">
          <p>
            Passes (Bronze, Silver, Gold, Diamond) change how fast you earn and unlock perks while
            they are active. Passes are sold and billed by participating stores. The price, length,
            and refund rules for a pass are set by the store that sold it, and perks may change over
            time. A pass that has expired stops giving its perks. You can still keep your history.
          </p>
          <p>
            Diamond passes include one Event Credit per month, which takes $15 off one event entry
            at a participating store. It is claimed in the app and confirmed by store staff, it
            applies to one event entry, it has no cash value, and unused credits do not roll over.
            Staff may decline a credit that is claimed by mistake or misused.
          </p>
        </Section>

        <Section title="Prizes and redemptions">
          <p>
            Prizes on the Prize Wall are offered by individual stores and depend on availability.
            Prizes and event rewards are handed out by the store, not by PlayerPass. Staff can
            decline or reverse a redemption that was made by mistake, through misuse, or against
            store rules.
          </p>
        </Section>

        <Section title="Events and check-in">
          <p>
            Events are run by the stores that host them. You may only check in when you are really
            at the event. Checking in for someone else, scanning from somewhere you are not, or any
            other way of earning XP you did not earn is not allowed. Store rules and event rules
            apply in addition to these terms.
          </p>
        </Section>

        <Section title="Your conduct and content">
          <p>
            Be respectful. Do not harass or impersonate other players or staff, post anything
            unlawful, hateful, sexual, or that exposes private information, or try to break, scrape,
            overload, or get around the app or its security. Do not use the app to cheat at events or
            to take advantage of other players.
          </p>
          <p>
            Your display name, avatar, status, and similar profile content are yours. You let us show
            them in the app to other players and store staff as the app is designed to do. You are
            responsible for what you post, and we may remove content that breaks these terms.
          </p>
        </Section>

        <Section title="Staff accounts">
          <p>
            Store staff and managers get extra tools to run events and awards. Staff access is only
            for running the program at your store, and it may be removed at any time. Misusing staff
            tools, including awarding points to yourself or friends without a real reason, can
            lead to removal and reversal of points.
          </p>
        </Section>

        <Section title="Suspension and ending your account">
          <p>
            We or a store may limit, suspend, or end an account that breaks these terms or abuses
            the program. You can delete your account at any time from your Profile screen, as
            described in the Privacy Policy. When an account ends, its XP, points, passes, and unused
            credits end too, without payment or refund from PlayerPass.
          </p>
        </Section>

        <Section title="Changes to the app and these terms">
          <p>
            PlayerPass is still growing. We may add, change, or remove features, ranks, perks, and
            prizes. We may also update these terms. We will update the date above, and for material
            changes we will tell you in the app. Using PlayerPass after a change means you accept it.
          </p>
        </Section>

        <Section title="No warranty and limits on liability">
          <p>
            PlayerPass is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We do not
            promise that it will always work, be error free, or be available, and we are not
            responsible for events, prizes, or services provided by stores or other third parties. To
            the fullest extent the law allows, Hyperbolic Creative is not liable for indirect or
            consequential losses from using the app, and our total liability for any claim is limited
            to the amount you paid us directly for PlayerPass in the 12 months before the claim,
            which may be zero. Some places do not allow these limits, so they may not fully apply to you.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These terms are governed by the laws of the State of California, and any dispute will be
            handled in the state or federal courts located in California, unless the law of your
            place of residence requires otherwise.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms:{' '}
            <a className="text-[#c4b5fd] underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>
      </article>
    </main>
  );
}
