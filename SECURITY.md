# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Contact the maintainer directly
3. Provide details about the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Security Best Practices

### Environment Variables

- **NEVER** commit `.env.local` or any file containing secrets
- All sensitive keys must be stored in Vercel/hosting environment variables
- Use `.env.example` as a template (contains no real values)

### Keys & Secrets

| Variable | Sensitivity | Notes |
|----------|-------------|-------|
| `CLERK_SECRET_KEY` | 🔴 SECRET | Never expose - server-side only |
| `SUPABASE_SERVICE_KEY` | 🔴 SECRET | Never expose - server-side only |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | 🟢 Public | Safe for client-side |
| `NEXT_PUBLIC_SUPABASE_URL` | 🟢 Public | Safe for client-side |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 🟡 Limited | Public but rate-limited by RLS |

### Database Security (Supabase)

- Row Level Security (RLS) is enabled on all tables
- The `anon` key can only access data allowed by RLS policies
- The `service_role` key bypasses RLS - use only server-side

### Authentication (Clerk)

- All auth flows handled by Clerk
- Session tokens validated server-side via middleware
- Protected routes require valid Clerk session

## Deployed Infrastructure

- **Frontend**: Vercel (automatic HTTPS, DDoS protection)
- **Database**: Supabase (managed PostgreSQL, automatic backups)
- **Auth**: Clerk (SOC 2 compliant, handles password storage)

## Updates

Keep dependencies updated to patch security vulnerabilities:

```bash
npm audit
npm update
```
