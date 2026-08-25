import { Ctx } from "../types";
import { errorResponse, json } from "../utils/response";

type ReceiptItemInput = { item_name?: string; quantity?: number; amount?: number };
type ReceiptInput = {
  merchant?: string;
  receipt_date?: string;
  total_amount?: number;
  tax_amount?: number;
  category_id?: string | null;
  payment_method?: string;
  note?: string | null;
  items?: ReceiptItemInput[];
};

function cleanText(value: unknown, max = 120) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

async function fingerprint(merchant: string, date: string, amount: number) {
  const raw = `${merchant.toLowerCase()}|${date}|${amount.toFixed(2)}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function listReceipts(ctx: Ctx): Promise<Response> {
  const { results } = await ctx.env.DB.prepare(`
    SELECT r.*, c.name AS category_name, c.icon AS category_icon
    FROM receipts r
    LEFT JOIN categories c ON c.id = r.category_id
    WHERE r.user_id = ?
    ORDER BY r.receipt_date DESC, r.created_at DESC
    LIMIT 100
  `).bind(ctx.userId).all();
  return json(results, {}, ctx.origin);
}

export async function createReceipt(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<ReceiptInput>();
  const merchant = cleanText(body.merchant || "Receipt");
  const date = cleanText(body.receipt_date, 10);
  const amount = Number(body.total_amount || 0);
  const tax = Math.max(0, Number(body.tax_amount || 0));
  const paymentMethod = cleanText(body.payment_method || "UPI", 30);
  const note = cleanText(body.note || "", 300) || null;

  if (!date) return errorResponse("Receipt date is required.", 400, ctx.origin);
  if (!Number.isFinite(amount) || amount <= 0) return errorResponse("Total amount must be greater than zero.", 400, ctx.origin);

  if (body.category_id) {
    const category = await ctx.env.DB.prepare(
      "SELECT id FROM categories WHERE id = ? AND type = 'expense' AND (user_id IS NULL OR user_id = ?)"
    ).bind(body.category_id, ctx.userId).first();
    if (!category) return errorResponse("Expense category not found.", 404, ctx.origin);
  }

  const fp = await fingerprint(merchant, date, amount);
  const duplicate = await ctx.env.DB.prepare(
    "SELECT id, merchant, receipt_date, total_amount FROM receipts WHERE user_id = ? AND fingerprint = ? LIMIT 1"
  ).bind(ctx.userId, fp).first();
  if (duplicate) return errorResponse("This receipt looks like one you already saved.", 409, ctx.origin);

  const receiptId = crypto.randomUUID();
  const transactionId = crypto.randomUUID();
  const items = (body.items || []).filter((item) => cleanText(item.item_name) && Number(item.amount || 0) >= 0).slice(0, 80);

  const statements = [
    ctx.env.DB.prepare(
      "INSERT INTO transactions (id,user_id,type,amount,category_id,note,txn_date) VALUES (?,?, 'expense', ?,?,?,?)"
    ).bind(transactionId, ctx.userId, amount, body.category_id || null, note || merchant, date),
    ctx.env.DB.prepare(`
      INSERT INTO receipts (id,user_id,transaction_id,merchant,receipt_date,total_amount,tax_amount,category_id,payment_method,note,source,fingerprint)
      VALUES (?,?,?,?,?,?,?,?,?,?, 'scanner', ?)
    `).bind(receiptId, ctx.userId, transactionId, merchant, date, amount, tax, body.category_id || null, paymentMethod, note, fp),
    ...items.map((item) => ctx.env.DB.prepare(
      "INSERT INTO receipt_items (id,receipt_id,item_name,quantity,amount) VALUES (?,?,?,?,?)"
    ).bind(crypto.randomUUID(), receiptId, cleanText(item.item_name), Math.max(0.01, Number(item.quantity || 1)), Math.max(0, Number(item.amount || 0))))
  ];

  await ctx.env.DB.batch(statements);
  return json({ id: receiptId, transaction_id: transactionId, duplicate: false }, { status: 201 }, ctx.origin);
}

export async function getReceipt(ctx: Ctx, id: string): Promise<Response> {
  const receipt = await ctx.env.DB.prepare(`
    SELECT r.*, c.name AS category_name, c.icon AS category_icon
    FROM receipts r LEFT JOIN categories c ON c.id=r.category_id
    WHERE r.id=? AND r.user_id=? LIMIT 1
  `).bind(id, ctx.userId).first();
  if (!receipt) return errorResponse("Receipt not found.", 404, ctx.origin);
  const { results: items } = await ctx.env.DB.prepare(
    "SELECT id,item_name,quantity,amount FROM receipt_items WHERE receipt_id=? ORDER BY created_at ASC"
  ).bind(id).all();
  return json({ ...receipt, items }, {}, ctx.origin);
}
