import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";

type WalletKind = "cash" | "bank" | "upi" | "savings" | "other";

export async function listWallets(ctx: Ctx): Promise<Response> {
  await ensureDefaultWallet(ctx);
  const { results } = await ctx.env.DB.prepare(`
    SELECT w.*,
      w.opening_balance
        + COALESCE((SELECT SUM(s.amount) FROM salary_entries s WHERE s.user_id=w.user_id AND s.wallet_id=w.id),0)
      + COALESCE((SELECT SUM(CASE WHEN t.type='income' THEN t.amount ELSE -t.amount END)
          FROM transactions t WHERE t.user_id=w.user_id AND t.wallet_id=w.id),0)
        + COALESCE((SELECT SUM(amount) FROM wallet_transfers x
          WHERE x.user_id=w.user_id AND x.to_wallet_id=w.id),0)
        - COALESCE((SELECT SUM(amount) FROM wallet_transfers x
          WHERE x.user_id=w.user_id AND x.from_wallet_id=w.id),0) AS balance
    FROM wallets w
    WHERE w.user_id=? AND w.is_archived=0
    ORDER BY w.created_at ASC
  `).bind(ctx.userId).all();
  return json(results, {}, ctx.origin);
}

export async function createWallet(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{name?:string;kind?:WalletKind;opening_balance?:number}>();
  const name = body.name?.trim();
  const kind = body.kind || "other";
  const opening = Number(body.opening_balance ?? 0);
  if (!name || name.length > 40) return errorResponse("Wallet name is required (maximum 40 characters).",400,ctx.origin);
  if (!["cash","bank","upi","savings","other"].includes(kind)) return errorResponse("Choose a valid wallet type.",400,ctx.origin);
  if (!Number.isFinite(opening) || opening < 0) return errorResponse("Opening balance must be zero or more.",400,ctx.origin);
  const id = crypto.randomUUID();
  const user = await ctx.env.DB.prepare("SELECT currency FROM users WHERE id=?").bind(ctx.userId).first<{currency:string}>();
  await ctx.env.DB.prepare("INSERT INTO wallets (id,user_id,name,kind,opening_balance,currency) VALUES (?,?,?,?,?,?)")
    .bind(id,ctx.userId,name,kind,opening,user?.currency || "INR").run();
  return json({id,name,kind,opening_balance:opening,balance:opening}, {status:201}, ctx.origin);
}

export async function transfer(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{from_wallet_id?:string;to_wallet_id?:string;amount?:number;transfer_date?:string;note?:string}>();
  const amount = Number(body.amount);
  if (!body.from_wallet_id || !body.to_wallet_id || body.from_wallet_id === body.to_wallet_id) return errorResponse("Choose two different wallets.",400,ctx.origin);
  if (!Number.isFinite(amount) || amount <= 0) return errorResponse("Transfer amount must be greater than zero.",400,ctx.origin);
  if (!body.transfer_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.transfer_date)) return errorResponse("A valid transfer date is required.",400,ctx.origin);
  const rows = await ctx.env.DB.prepare("SELECT id FROM wallets WHERE user_id=? AND is_archived=0 AND id IN (?,?)")
    .bind(ctx.userId,body.from_wallet_id,body.to_wallet_id).all<{id:string}>();
  if (rows.results.length !== 2) return errorResponse("One or both wallets were not found.",404,ctx.origin);
  const source = await ctx.env.DB.prepare(`
    SELECT w.opening_balance
      + COALESCE((SELECT SUM(s.amount) FROM salary_entries s WHERE s.user_id=w.user_id AND s.wallet_id=w.id),0)
      + COALESCE((SELECT SUM(CASE WHEN t.type='income' THEN t.amount ELSE -t.amount END)
        FROM transactions t WHERE t.user_id=w.user_id AND t.wallet_id=w.id),0)
      + COALESCE((SELECT SUM(amount) FROM wallet_transfers x WHERE x.user_id=w.user_id AND x.to_wallet_id=w.id),0)
      - COALESCE((SELECT SUM(amount) FROM wallet_transfers x WHERE x.user_id=w.user_id AND x.from_wallet_id=w.id),0) AS balance
    FROM wallets w WHERE w.id=? AND w.user_id=?
  `).bind(body.from_wallet_id,ctx.userId).first<{balance:number}>();
  if (!source || Number(source.balance) < amount) return errorResponse("Insufficient wallet balance for this transfer.",400,ctx.origin);
  const id = crypto.randomUUID();
  await ctx.env.DB.prepare("INSERT INTO wallet_transfers (id,user_id,from_wallet_id,to_wallet_id,amount,transfer_date,note) VALUES (?,?,?,?,?,?,?)")
    .bind(id,ctx.userId,body.from_wallet_id,body.to_wallet_id,amount,body.transfer_date,body.note?.trim() || null).run();
  return json({id,amount,transfer_date:body.transfer_date}, {status:201}, ctx.origin);
}

async function ensureDefaultWallet(ctx: Ctx): Promise<void> {
  const user = await ctx.env.DB.prepare("SELECT currency FROM users WHERE id=?").bind(ctx.userId).first<{currency:string}>();
  const settings = await ctx.env.DB.prepare("SELECT opening_balance FROM user_settings WHERE user_id=?").bind(ctx.userId).first<{opening_balance:number}>();
  await ctx.env.DB.prepare(`
    INSERT OR IGNORE INTO wallets (id,user_id,name,kind,opening_balance,currency)
    VALUES (?,?, 'Main wallet','bank',?,?)
  `).bind(`wallet_default_${ctx.userId}`,ctx.userId,settings?.opening_balance || 0,user?.currency || "INR").run();
  await ctx.env.DB.prepare("UPDATE wallets SET opening_balance=? WHERE id=? AND user_id=?").bind(settings?.opening_balance || 0,`wallet_default_${ctx.userId}`,ctx.userId).run();
}
