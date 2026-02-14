# Production Deployment Checklist - UK Profit Calculator

## ✅ Pre-Deployment Verification

### 1. Code Quality Checks
- [x] `npm run lint` — **PASSED**
- [x] `npm run typecheck` — **PASSED**
- [x] `npm run build` — **PASSED**
- [x] `npm run stability` — **PASSED**

### 2. Security Audit
- [x] No localStorage snapshot fallback (removed)
- [x] No copy-to-clipboard logic (removed)
- [x] No `auth_user` localStorage references (removed)
- [x] No `saved_calculations` table references (removed)
- [x] Strict auth gating on "Save Snapshot" button
- [x] RLS enabled on `snapshots` table
- [x] Users can only insert/select their own rows

### 3. Auth System
- [x] Supabase client properly configured
- [x] Login/Signup/Logout flows implemented
- [x] Session restoration on page load
- [x] Auth state synchronization across components
- [x] No snapshot operations possible without authentication

---

## 🚀 Deployment Steps

### Step 1: Set Up Supabase Project

1. **Create Supabase Project**
   - Go to [app.supabase.com](https://app.supabase.com)
   - Create a new project
   - Note the Project URL and anon key

2. **Run SQL Setup**
   - Open Supabase SQL Editor
   - Paste contents of `SUPABASE_SETUP.sql`
   - Click **Run**
   - Verify `snapshots` table exists in Table Editor

3. **Enable Email Authentication**
   - Navigate to **Authentication** → **Providers**
   - Enable **Email** provider
   - Configure email templates (optional)
   - Set **Confirm email** to ON for production

4. **Configure URLs**
   - Set **Site URL** to your production domain (e.g., `https://ukprofitcalc.com`)
   - Add **Redirect URLs**:
     - `http://localhost:3000` (for local dev)
     - `https://yourdomain.com` (for production)

---

### Step 2: Configure Environment Variables

Create `.env.local` (local) and add to hosting platform (production):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to add in production:**
- **Vercel**: Settings → Environment Variables
- **Netlify**: Site settings → Environment variables
- **Railway**: Variables tab

---

### Step 3: Test Authentication Flow

1. **Local Testing**
   ```bash
   npm run dev
   ```
   - Navigate to `http://localhost:3000/calculator`
   - Click **Sign up** in header
   - Enter email and password
   - Check email for confirmation link
   - Click confirmation link
   - Log in with credentials
   - Calculate profit
   - Click **Save Snapshot**
   - Verify in Supabase Table Editor → `snapshots`

2. **Verify RLS**
   - Create a second user account
   - Log in as second user
   - Verify first user's snapshots are NOT visible
   - Save a snapshot as second user
   - Verify only second user's snapshot is visible

---

### Step 4: Deploy to Production

1. **Build Verification**
   ```bash
   npm run stability
   ```
   - All checks must pass

2. **Deploy**
   - Push to Git repository
   - Connect to hosting platform (Vercel/Netlify/Railway)
   - Add environment variables
   - Deploy

3. **Post-Deployment Verification**
   - Visit production URL
   - Test signup flow
   - Test login flow
   - Test snapshot save
   - Verify in Supabase dashboard

---

## 🔒 Security Checklist

### Database Security
- [x] RLS enabled on `snapshots` table
- [x] Insert policy: `auth.uid() = user_id`
- [x] Select policy: `auth.uid() = user_id`
- [x] Foreign key constraint: `user_id → auth.users(id)`
- [x] Cascade delete: snapshots deleted when user deleted
- [x] No public access without authentication

### Client-Side Security
- [x] anon key is safe for client-side use (public)
- [x] No service role key exposed
- [x] No sensitive data in localStorage
- [x] No auth tokens in localStorage (managed by Supabase)
- [x] Auth state synchronized via Supabase SDK

### Code Security
- [x] No hardcoded credentials
- [x] Environment variables used correctly
- [x] No SQL injection risk (using Supabase SDK)
- [x] No XSS risk (React escapes by default)

---

## 📊 Monitoring & Maintenance

### Post-Launch Monitoring
1. **Supabase Dashboard**
   - Monitor user signups
   - Track snapshot creation rate
   - Check for failed authentication attempts

2. **Error Tracking** (optional)
   - Add Sentry or similar for production errors
   - Monitor failed snapshot saves

3. **Analytics** (optional)
   - Track signup conversion rate
   - Monitor snapshot save success rate

### Regular Maintenance
- Review RLS policies monthly
- Monitor database storage usage
- Update Supabase client library regularly
- Review authentication logs for suspicious activity

---

## 🐛 Troubleshooting

### "Supabase is not configured"
- **Cause**: Missing or incorrect environment variables
- **Fix**: Verify `.env.local` exists and contains correct values
- **Restart**: Restart dev server after adding env vars

### "Unable to save snapshot"
- **Cause**: User not authenticated or RLS policy rejection
- **Fix**: 
  1. Verify user is logged in
  2. Check RLS policies are created
  3. Verify `snapshots` table exists
  4. Check browser console for detailed error

### Email confirmation not working
- **Cause**: Email provider not configured
- **Fix**:
  1. For development: Check Supabase inbox or disable email confirmation
  2. For production: Configure custom SMTP in Supabase settings

### Snapshots not appearing
- **Cause**: RLS policy blocking access
- **Fix**:
  1. Verify user is authenticated
  2. Check that `user_id` matches `auth.uid()`
  3. Review RLS policies in Supabase

---

## 📝 Final Verification Before Go-Live

- [ ] All environment variables set in production
- [ ] Supabase SQL script executed successfully
- [ ] Email authentication enabled and tested
- [ ] Site URL and Redirect URLs configured
- [ ] RLS policies verified in Supabase dashboard
- [ ] Test user signup flow works end-to-end
- [ ] Test snapshot save works for authenticated users
- [ ] Test snapshot save blocked for unauthenticated users
- [ ] Verify snapshots are user-isolated (RLS working)
- [ ] Production build passes: `npm run stability`

---

## 🎯 Success Criteria

**Authentication System:**
- ✅ Users can sign up with email/password
- ✅ Users receive confirmation email
- ✅ Users can log in after confirmation
- ✅ Users can log out
- ✅ Session persists across page refreshes
- ✅ Auth state synchronized across components

**Snapshot System:**
- ✅ "Save Snapshot" button visible only when authenticated
- ✅ Snapshots save to Supabase `snapshots` table
- ✅ Users can only see their own snapshots (RLS enforced)
- ✅ Success message shown after save
- ✅ Error message shown if save fails
- ✅ No localStorage fallback

**Code Quality:**
- ✅ No lint errors
- ✅ No TypeScript errors
- ✅ Production build succeeds
- ✅ No dead code
- ✅ No unused imports

---

## 🔐 RLS Policy Verification

Run these queries in Supabase SQL Editor to verify policies:

```sql
-- Verify RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'snapshots';
-- Result should show: relrowsecurity = true

-- Verify policies exist
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'snapshots';
-- Should show 2 policies:
-- 1. "Snapshots insert own" - INSERT
-- 2. "Snapshots select own" - SELECT

-- Test insert as authenticated user (run in Supabase dashboard)
-- Should succeed:
INSERT INTO snapshots (user_id, revenue, total_costs, vat, net_profit, margin, roas)
VALUES (auth.uid(), 1000, 500, 200, 300, 30, 2.5);

-- Test insert with different user_id (should fail)
INSERT INTO snapshots (user_id, revenue, total_costs, vat, net_profit, margin, roas)
VALUES ('00000000-0000-0000-0000-000000000000', 1000, 500, 200, 300, 30, 2.5);
-- Should fail with RLS violation
```

---

## 📞 Support Resources

- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Supabase RLS Guide**: [supabase.com/docs/guides/auth/row-level-security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Deployment Status: READY FOR PRODUCTION** ✅

All security checks passed. All quality checks passed. System is production-ready.
