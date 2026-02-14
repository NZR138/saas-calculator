# UK Profit Calculator - Supabase Setup Guide

## 1. Environment Variables

Create a `.env.local` file in the project root with the following:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### How to get these values:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Database Setup

Run the SQL in `SUPABASE_SETUP.sql` to create the snapshots table and RLS policies:

1. Go to [Supabase SQL Editor](https://app.supabase.com/project/_/sql/new)
2. Paste the contents of `SUPABASE_SETUP.sql`
3. Click **Run**

This will:
- Enable UUID extension
- Create the `snapshots` table
- Enable Row Level Security
- Create insert/select policies for authenticated users
- Add performance indexes

---

## 3. Authentication Setup

Enable Email/Password authentication:

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional)
4. Set **Site URL** to your production domain (e.g., `https://your-domain.com`)
5. Add **Redirect URLs** for local development:
   - `http://localhost:3000`

---

## 4. Test Authentication

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000/calculator`
3. Sign up with a test email
4. Confirm the email (check your inbox or Supabase dashboard)
5. Log in
6. Calculate profit and click **Save Snapshot**
7. Verify the snapshot appears in the Supabase **Table Editor** → `snapshots`

---

## 5. Production Deployment

Before deploying to production:

1. Add production environment variables to your hosting platform (Vercel, Netlify, etc.)
2. Update **Site URL** and **Redirect URLs** in Supabase Authentication settings
3. Run `npm run build` to verify production build passes
4. Deploy

---

## 6. Security Checklist

- ✅ RLS enabled on `snapshots` table
- ✅ Users can only insert/select their own snapshots
- ✅ anon key is public (safe for client-side use)
- ✅ No service role key exposed to client
- ✅ Email confirmation enabled (recommended for production)

---

## 7. Troubleshooting

### "Supabase is not configured"
- Check that `.env.local` exists and contains valid values
- Restart the development server after adding environment variables

### "Unable to save snapshot"
- Verify the `snapshots` table exists in Supabase
- Check that RLS policies are enabled
- Ensure the user is authenticated (signed in)

### Email confirmation not working
- Check Supabase email templates in **Authentication** → **Email Templates**
- Verify your email provider is configured (Supabase uses built-in SMTP for development)

---

## 8. Next Steps

- Add snapshot history view (query `snapshots` table)
- Add snapshot deletion
- Add export to CSV
- Add comparison between snapshots
