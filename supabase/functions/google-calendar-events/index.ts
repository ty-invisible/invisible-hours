import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function refreshAccessToken(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  refreshToken: string
): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await supabaseAdmin.from("google_calendar_tokens").update({
    access_token: data.access_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { from, to, timeZone, timeMin: bodyTimeMin, timeMax: bodyTimeMax } = body;
    if (!from || !to) {
      return new Response(JSON.stringify({ error: "Missing from or to" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tokenRow, error: dbError } = await supabaseAdmin
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (dbError || !tokenRow) {
      return new Response(JSON.stringify({ error: "Google Calendar not linked" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenRow.access_token;
    const expiresAt = new Date(tokenRow.expires_at);
    if (expiresAt.getTime() < Date.now() + 60_000) {
      accessToken = await refreshAccessToken(supabaseAdmin, user.id, tokenRow.refresh_token);
    }

    const tz = timeZone || "UTC";
    const timeMin = bodyTimeMin || `${from}T00:00:00Z`;
    const timeMax = bodyTimeMax || `${to}T23:59:59.999Z`;

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      timeZone: tz,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!calRes.ok) {
      const errBody = await calRes.text();
      return new Response(JSON.stringify({ error: "Google API error", detail: errBody }), {
        status: calRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const calData = await calRes.json();
    const events = (calData.items || []).map((item: Record<string, unknown>) => ({
      id: item.id,
      summary: (item as { summary?: string }).summary || "(No title)",
      start: (item as { start?: { dateTime?: string; date?: string } }).start?.dateTime || (item as { start?: { date?: string } }).start?.date || "",
      end: (item as { end?: { dateTime?: string; date?: string } }).end?.dateTime || (item as { end?: { date?: string } }).end?.date || "",
      allDay: !(item as { start?: { dateTime?: string } }).start?.dateTime,
    }));

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
