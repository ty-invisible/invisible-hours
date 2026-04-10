import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getInitialAdminEmails(): Set<string> {
  const raw = Deno.env.get("INITIAL_ADMIN_EMAILS") ?? "";
  return new Set(
    raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
}

async function isCallerAdmin(
  admin: ReturnType<typeof createClient>,
  userId: string,
  email: string | undefined,
): Promise<boolean> {
  const { data } = await admin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  if (data?.is_admin) return true;
  const emails = getInitialAdminEmails();
  return !!(email && emails.has(email.toLowerCase()));
}

async function getAuthUser(req: Request, admin: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: json({ error: "Missing authorization" }, 401) };
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) {
    return { error: json({ error: "Invalid token" }, 401) };
  }
  return { user };
}

function fullNameFromUser(u: User): string {
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  const raw = meta?.full_name ?? meta?.name;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (u.email) return u.email.split("@")[0] ?? "—";
  return "—";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const auth = await getAuthUser(req, admin);
    if ("error" in auth) return auth.error;
    const { user: caller } = auth;

    const url = new URL(req.url);

    if (req.method === "GET" && url.searchParams.get("action") === "self") {
      const isAdmin = await isCallerAdmin(admin, caller.id, caller.email);
      return json({ isAdmin });
    }

    if (req.method === "GET") {
      if (!(await isCallerAdmin(admin, caller.id, caller.email))) {
        return json({ error: "Forbidden" }, 403);
      }

      const allUsers: User[] = [];
      let page = 1;
      const perPage = 200;
      for (;;) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) {
          return json({ error: error.message }, 500);
        }
        allUsers.push(...data.users);
        if (data.users.length < perPage) break;
        page += 1;
      }

      const ids = allUsers.map((u) => u.id);
      const adminMap = new Map<string, boolean>();
      const chunk = 100;
      for (let i = 0; i < ids.length; i += chunk) {
        const slice = ids.slice(i, i + chunk);
        const { data: rows, error: pErr } = await admin
          .from("profiles")
          .select("id, is_admin")
          .in("id", slice);
        if (pErr) {
          return json({ error: pErr.message }, 500);
        }
        for (const row of rows ?? []) {
          adminMap.set(row.id as string, !!row.is_admin);
        }
      }

      const users = allUsers.map((u) => ({
        id: u.id,
        email: u.email ?? "",
        fullName: fullNameFromUser(u),
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        isAdmin: adminMap.get(u.id) ?? false,
      }));

      users.sort((a, b) => (a.email || "").localeCompare(b.email || "", undefined, { sensitivity: "base" }));

      return json({ users });
    }

    if (req.method === "PATCH") {
      if (!(await isCallerAdmin(admin, caller.id, caller.email))) {
        return json({ error: "Forbidden" }, 403);
      }
      const body = await req.json() as { userId?: string; isAdmin?: boolean };
      const targetId = body.userId;
      if (!targetId || typeof body.isAdmin !== "boolean") {
        return json({ error: "Expected userId and isAdmin" }, 400);
      }
      if (targetId === caller.id && body.isAdmin === false) {
        return json({ error: "You cannot remove your own admin role" }, 400);
      }

      const { data: existing } = await admin.from("profiles").select("id").eq("id", targetId).maybeSingle();
      if (existing) {
        const { error: upErr } = await admin.from("profiles").update({ is_admin: body.isAdmin }).eq("id", targetId);
        if (upErr) return json({ error: upErr.message }, 500);
      } else {
        const { error: insErr } = await admin.from("profiles").insert({
          id: targetId,
          full_name: "",
          is_admin: body.isAdmin,
        });
        if (insErr) return json({ error: insErr.message }, 500);
      }
      return json({ ok: true });
    }

    if (req.method === "DELETE") {
      if (!(await isCallerAdmin(admin, caller.id, caller.email))) {
        return json({ error: "Forbidden" }, 403);
      }
      const body = await req.json() as { userId?: string };
      const targetId = body.userId;
      if (!targetId) {
        return json({ error: "Expected userId" }, 400);
      }
      if (targetId === caller.id) {
        return json({ error: "You cannot delete your own account" }, 400);
      }

      const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
      if (delErr) {
        return json({ error: delErr.message }, 500);
      }
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
