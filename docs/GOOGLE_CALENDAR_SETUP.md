# Google Calendar – Setup

Two parts: **Supabase** (your project) and **Google Cloud**.

---

# Part A: Deploy to your Supabase project

Your app uses the Supabase project in `.env` (`VITE_SUPABASE_URL`). The Edge Functions and table must exist **in that project** or you get 404. Do this first.

## A1. Run the database migration

1. Open **Supabase Dashboard** → your project (the one in your `.env`).
2. Go to **SQL Editor**.
3. Click **New query** and paste the contents of `supabase/migrations/20250316000000_create_google_calendar_tokens.sql`.
4. Run the query (Run).

## A2. Deploy the Edge Functions

1. Install Supabase CLI if needed: `npm install -g supabase` (or see https://supabase.com/docs/guides/cli).
2. In the project root, log in and link your project:
   - `supabase login`
   - `supabase link --project-ref YOUR_REF`  
     (Your ref is the part before `.supabase.co` in your project URL, e.g. `dbuvbqngqjghcqnauldk`.)
3. Set secrets (replace with your real values):
   - `supabase secrets set GOOGLE_CLIENT_ID=your-client-id`
   - `supabase secrets set GOOGLE_CLIENT_SECRET=your-client-secret`
4. Deploy all three functions:
   - `supabase functions deploy google-calendar-auth`
   - `supabase functions deploy google-calendar-events`
   - `supabase functions deploy google-calendar-disconnect`

If you prefer the Dashboard: **Edge Functions** → create each function and paste the code from `supabase/functions/<name>/index.ts`, then set the secrets under **Settings** → **Edge Functions** → **Secrets**.

---

# Part B: Google Cloud setup

Short checklist. Do these in order.

---

## 1. Open Google Cloud Console

- Go to https://console.cloud.google.com/
- Select your project (or create one).

---

## 2. Enable Google Calendar API

- Left menu: **APIs & Services** → **Library**
- Search: **Google Calendar API**
- Open it → click **Enable**

---

## 3. OAuth consent screen (Branding)

- Left menu: **APIs & Services** → **OAuth consent screen**
- If asked, choose **External** (or **Internal** if only your org)
- Fill:
  - **App name:** e.g. Invisible Hours
  - **User support email:** your email
  - **Developer contact:** your email
- Click **Save and Continue**
- **Scopes:** click **Add or remove scopes**
  - Find and tick: **Google Calendar API** → **See and download any calendar you can access using your Google account**  
    (scope: `.../auth/calendar.readonly`)
  - Click **Update** then **Save and Continue**
- **Test users** (if External): add your Google account so you can sign in during testing
- Click **Save and Continue** through the rest

---

## 4. Create OAuth client (credentials)

- Left menu: **APIs & Services** → **Credentials**
- **+ Create credentials** → **OAuth client ID**
- **Application type:** Web application
- **Name:** e.g. Invisible Hours Web
- **Authorized redirect URIs** → **+ Add URI**
  - Local: `http://localhost:5173/`
  - Production: `https://your-domain.com/` (replace with your real app URL)
- Click **Create**
- Copy and save:
  - **Client ID** → you’ll put this in `.env` as `VITE_GOOGLE_CLIENT_ID`
  - **Client secret** → you’ll put this in Supabase secrets as `GOOGLE_CLIENT_SECRET` (do not put in frontend)

---

## 5. Authorized domains (if required)

- Left menu: **APIs & Services** → **OAuth consent screen**
- Open **Branding** (or the section where you see “Authorized domains”)
- **Authorized domains:** add your domain only (e.g. `yourdomain.com` or `localhost` if allowed)
- Save

---

## 6. Set secrets and env

- **Supabase Dashboard** → your project → **Settings** → **Edge Functions** → **Secrets**
  - Add: `GOOGLE_CLIENT_ID` = (your Client ID)
  - Add: `GOOGLE_CLIENT_SECRET` = (your Client secret)
- In the app repo **.env** file:
  - `VITE_GOOGLE_CLIENT_ID` = (same Client ID as above)

---

Done. Redirect URIs in Google must match exactly what your app uses (e.g. `http://localhost:5173/` when testing locally).
