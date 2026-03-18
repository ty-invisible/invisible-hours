# Supabase: Everything to run for Google Calendar

Use the **same Supabase project** as in your `.env` (e.g. `dbuvbqngqjghcqnauldk`).

---

## 1. SQL Editor – run this once

In Supabase Dashboard → **SQL Editor** → **New query**, paste the block below and click **Run**.

```sql
-- Google Calendar OAuth tokens (one row per user)
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tokens"
  ON google_calendar_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tokens"
  ON google_calendar_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tokens"
  ON google_calendar_tokens FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tokens"
  ON google_calendar_tokens FOR DELETE
  USING (user_id = auth.uid());
```

---

## 2. Edge Function secrets

In Supabase Dashboard → **Project Settings** (gear) → **Edge Functions** → **Secrets** (or **Settings** → **Edge Functions** → **Secrets**):

Add two secrets:

| Name                 | Value                          |
|----------------------|--------------------------------|
| `GOOGLE_CLIENT_ID`   | Your Google OAuth Client ID    |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client secret |

(Same values you used in Google Cloud and in `.env` for the client ID.)

---

## 3. Deploy Edge Functions (Supabase CLI)

In your project root (where `supabase/` lives), run:

```bash
# Log in (once)
supabase login

# Use YOUR project ref (from your project URL: https://XXXX.supabase.co → XXXX)
supabase link --project-ref dbuvbqngqjghcqnauldk

# Set secrets via CLI (optional if you already set them in Dashboard)
supabase secrets set GOOGLE_CLIENT_ID="427345898969-it74363etja1kqbtcdmsdg4oggu3scdj.apps.googleusercontent.com"
supabase secrets set GOOGLE_CLIENT_SECRET="your-client-secret-here"

# Deploy all three functions
supabase functions deploy google-calendar-auth
supabase functions deploy google-calendar-events
supabase functions deploy google-calendar-disconnect
```

Replace `your-client-secret-here` with your real client secret. Replace the project ref if yours is different.

---

## 4. If you don’t use the CLI (Dashboard only)

1. **Secrets**  
   Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as in section 2.

2. **Create each function**  
   Edge Functions → **Create a new function**:

   - **google-calendar-auth**  
     Copy the full contents of `supabase/functions/google-calendar-auth/index.ts` into the editor and deploy.

   - **google-calendar-events**  
     Copy the full contents of `supabase/functions/google-calendar-events/index.ts` and deploy.

   - **google-calendar-disconnect**  
     Copy the full contents of `supabase/functions/google-calendar-disconnect/index.ts` and deploy.

3. **Verify**  
   After deployment, the app should call:
   - `https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-calendar-auth`
   - `https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-calendar-events`
   - `https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-calendar-disconnect`

   and get 200 (or a normal error body), not 404.

---

## Checklist

- [ ] SQL migration run in SQL Editor
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set in Edge Function secrets
- [ ] `google-calendar-auth` deployed
- [ ] `google-calendar-events` deployed
- [ ] `google-calendar-disconnect` deployed
