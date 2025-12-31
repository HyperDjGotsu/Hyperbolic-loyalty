# Hyperbolic XP - Loyalty System

A gamified loyalty platform for Games of Martinez TCG store, built with Next.js 14, Supabase, and Clerk authentication.

## Features

- 🎮 **Multi-Game XP Tracking** - Track progress across 10+ TCG games
- 🏴‍☠️ **One Piece Bounty System** - Special bounty poster with monthly/lifetime tracking
- 👑 **Emperor Rankings** - Monthly competitive seasons
- 🎰 **Daily Gacha** - Reward mechanics for engagement
- 📱 **NFC Integration** - Tap-to-view player profiles
- 🔐 **Secure Auth** - Clerk authentication with Supabase backend

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Clerk account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your actual keys.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

See `.env.example` for required variables. **Never commit `.env.local`!**

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Set these in your Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` (if using service role)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Main app interface
│   ├── onboarding/       # New user setup
│   ├── sign-in/          # Clerk auth pages
│   └── sign-up/
├── components/           # React components
├── lib/                  # Utilities & Supabase client
└── public/               # Static assets
```

## Security

See [SECURITY.md](SECURITY.md) for security policy and best practices.

## License

Private - Games of Martinez / Hyperbolic Games
