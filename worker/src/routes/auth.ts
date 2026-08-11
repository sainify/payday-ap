import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";
import { hashSecret, verifySecret, newToken, sessionCookie, clearSessionCookie, parseCookies } from "../utils/auth";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function register(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{ name: string; email: string; password: string; salary_cycle_day: number }>();
  const { name, email, password, salary_cycle_day } = body;

  if (!name || !email || !password || password.length < 8) {
    return errorResponse("Name, email and an 8+ character password are required.", 400, ctx.origin);
  }
  const cycleDay = Math.min(31, Math.max(1, Number(salary_cycle_day) || 1));

  const existing = await ctx.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email.toLowerCase()).first();
  if (existing) return errorResponse("An account with this email already exists.", 409, ctx.origin);

  const id = crypto.randomUUID();
  const passwordHash = await hashSecret(password);

  await ctx.env.DB.batch([
    ctx.env.DB.prepare(
      "INSERT INTO users (id, name, email, password_hash, salary_cycle_day) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, name, email.toLowerCase(), passwordHash, cycleDay),
    ctx.env.DB.prepare("INSERT INTO user_settings (user_id) VALUES (?)").bind(id),
  ]);

  return startSession(ctx, id);
}

export async function login(ctx: Ctx): Promise<Response> {
  const { email, password } = await ctx.req.json<{ email: string; password: string }>();
  if (!email || !password) return errorResponse("Email and password are required.", 400, ctx.origin);

  const user = await ctx.env.DB.prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<{ id: string; password_hash: string }>();

  if (!user || !(await verifySecret(password, user.password_hash))) {
    return errorResponse("Incorrect email or password.", 401, ctx.origin);
  }

  return startSession(ctx, user.id);
}

async function startSession(ctx: Ctx, userId: string): Promise<Response> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  await ctx.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expiresAt)
    .run();

  return json(
    { ok: true },
    { status: 200, headers: { "Set-Cookie": sessionCookie(token, ctx.env.COOKIE_DOMAIN, SESSION_TTL_SECONDS) } },
    ctx.origin
  );
}

export async function logout(ctx: Ctx): Promise<Response> {
  const cookies = parseCookies(ctx.req.headers.get("Cookie"));
  const token = cookies["payday_session"];
  if (token) await ctx.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
  return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(ctx.env.COOKIE_DOMAIN) } }, ctx.origin);
}

export async function setPin(ctx: Ctx): Promise<Response> {
  const { pin } = await ctx.req.json<{ pin: string }>();
  if (!/^\d{4}$/.test(pin)) return errorResponse("PIN must be exactly 4 digits.", 400, ctx.origin);
  const pinHash = await hashSecret(pin);
  await ctx.env.DB.prepare("UPDATE user_settings SET pin_hash = ?, pin_enabled = 1 WHERE user_id = ?")
    .bind(pinHash, ctx.userId)
    .run();
  return json({ ok: true }, {}, ctx.origin);
}

export async function disablePin(ctx: Ctx): Promise<Response> {
  await ctx.env.DB.prepare("UPDATE user_settings SET pin_hash = NULL, pin_enabled = 0 WHERE user_id = ?")
    .bind(ctx.userId)
    .run();
  return json({ ok: true }, {}, ctx.origin);
}

export async function verifyPin(ctx: Ctx): Promise<Response> {
  const { pin } = await ctx.req.json<{ pin: string }>();
  const settings = await ctx.env.DB.prepare("SELECT pin_hash, pin_enabled FROM user_settings WHERE user_id = ?")
    .bind(ctx.userId)
    .first<{ pin_hash: string | null; pin_enabled: number }>();

  if (!settings?.pin_enabled || !settings.pin_hash) return errorResponse("PIN lock is not enabled.", 400, ctx.origin);
  const valid = await verifySecret(pin, settings.pin_hash);
  if (!valid) return errorResponse("Incorrect PIN.", 401, ctx.origin);
  return json({ ok: true }, {}, ctx.origin);
}
