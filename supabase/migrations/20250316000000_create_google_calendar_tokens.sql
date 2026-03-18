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
