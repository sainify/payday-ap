import { Ctx } from "../types";
import { json, errorResponse } from "../utils/response";

export async function listTransactions(ctx: Ctx): Promise<Response> {
  const { searchParams } = ctx.url;
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const q = searchParams.get("q")?.trim();
  const min = searchParams.get("min");
  const max = searchParams.get("max");

  let sql = `
    SELECT t.*, c.name AS category_name, c.icon AS category_icon
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ?`;
  const params: unknown[] = [ctx.userId];

  if (type && ["expense", "income"].includes(type)) {
    sql += " AND t.type = ?";
    params.push(type);
  }
  if (category) {
    sql += " AND t.category_id = ?";
    params.push(category);
  }
  if (from) {
    sql += " AND t.txn_date >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND t.txn_date <= ?";
    params.push(to);
  }
  if (q) {
    sql += " AND (LOWER(COALESCE(t.note,'')) LIKE ? OR LOWER(COALESCE(c.name,'')) LIKE ?)";
    const like = `%${q.toLowerCase()}%`;
    params.push(like, like);
  }
  if (min && Number.isFinite(Number(min))) {
    sql += " AND t.amount >= ?";
    params.push(Number(min));
  }
  if (max && Number.isFinite(Number(max))) {
    sql += " AND t.amount <= ?";
    params.push(Number(max));
  }

  sql += " ORDER BY t.txn_date DESC, t.created_at DESC LIMIT 500";

  const { results } = await ctx.env.DB.prepare(sql).bind(...params).all();
  return json(results, {}, ctx.origin);
}

export async function createTransaction(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{
    id?: string;
    type: "expense" | "income";
    amount: number;
    category_id?: string | null;
    note?: string | null;
    txn_date: string;
    wallet_id?: string | null;
    refund_of_id?: string | null;
    splits?: Array<{category_id?:string|null;amount:number;note?:string|null}>;
  }>();

  if (!body.type || !["expense", "income"].includes(body.type)) {
    return errorResponse("A valid type (expense or income) is required.", 400, ctx.origin);
  }
  if (!body.amount || body.amount <= 0) {
    return errorResponse("Amount must be greater than zero.", 400, ctx.origin);
  }
  if (!body.txn_date) {
    return errorResponse("A transaction date is required.", 400, ctx.origin);
  }

  const editId = body.id || ctx.url.searchParams.get("edit_id") || undefined;

  if (editId) {
    const existing = await ctx.env.DB.prepare(
      "SELECT id, type FROM transactions WHERE id = ? AND user_id = ?"
    )
      .bind(editId, ctx.userId)
      .first<{ id: string; type: "expense" | "income" }>();

    if (!existing) {
      return errorResponse("Transaction not found. No new transaction was created.", 404, ctx.origin);
    }

    if (body.type !== existing.type) {
      return errorResponse("Transaction type cannot be changed.", 400, ctx.origin);
    }

    if (body.category_id) {
      const category = await ctx.env.DB.prepare(
        "SELECT id FROM categories WHERE id = ? AND type = ? AND (user_id IS NULL OR user_id = ?)"
      )
        .bind(body.category_id, existing.type, ctx.userId)
        .first();

      if (!category) {
        return errorResponse("Category not found.", 404, ctx.origin);
      }
    }

    await ctx.env.DB.prepare(
      "UPDATE transactions SET amount = ?, category_id = ?, note = ?, txn_date = ? WHERE id = ? AND user_id = ?"
    )
      .bind(
        body.amount,
        body.category_id || null,
        body.note || null,
        body.txn_date,
        editId,
        ctx.userId
      )
      .run();

    return json(
      {
        id: editId,
        type: existing.type,
        amount: body.amount,
        category_id: body.category_id || null,
        note: body.note || null,
        txn_date: body.txn_date,
        updated: true,
      },
      {},
      ctx.origin
    );
  }

  if (body.refund_of_id) {
    if (body.type !== "income") return errorResponse("A refund must be recorded as income.",400,ctx.origin);
    const original = await ctx.env.DB.prepare("SELECT id, amount FROM transactions WHERE id=? AND user_id=? AND type='expense'")
      .bind(body.refund_of_id,ctx.userId).first<{id:string;amount:number}>();
    if (!original) return errorResponse("Original expense not found.",404,ctx.origin);
    const refunded = await ctx.env.DB.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id=? AND refund_of_id=?")
      .bind(ctx.userId,body.refund_of_id).first<{total:number}>();
    if (Number(refunded?.total || 0) + body.amount > Number(original.amount) + 0.005) return errorResponse("Refund amount cannot exceed the remaining amount of the original expense.",400,ctx.origin);
  }

  let categoryId = body.category_id || null;
  if (!categoryId && body.note?.trim()) {
    const rule = await ctx.env.DB.prepare(
      "SELECT category_id FROM transaction_rules WHERE user_id=? AND transaction_type=? AND is_enabled=1 AND LOWER(?) LIKE '%' || match_text || '%' ORDER BY priority ASC, created_at DESC LIMIT 1"
    ).bind(ctx.userId, body.type, body.note.trim().toLowerCase()).first<{category_id:string}>();
    if (rule) categoryId = rule.category_id;
  }

  if (body.category_id) {
    const category = await ctx.env.DB.prepare(
      "SELECT id FROM categories WHERE id = ? AND type = ? AND (user_id IS NULL OR user_id = ?)"
    )
      .bind(body.category_id, body.type, ctx.userId)
      .first();

    if (!category) {
      return errorResponse("Category not found.", 404, ctx.origin);
    }
  }

  if (body.splits?.length) {
    if (body.splits.length < 2 || body.splits.length > 20) return errorResponse("A split must contain 2 to 20 parts.",400,ctx.origin);
    const splitTotal = body.splits.reduce((sum,part)=>sum+Number(part.amount),0);
    if (body.splits.some(part=>!Number.isFinite(Number(part.amount)) || Number(part.amount)<=0) || Math.abs(splitTotal-body.amount)>0.01) {
      return errorResponse("Split amounts must be positive and add up exactly to the transaction total.",400,ctx.origin);
    }
    for (const part of body.splits) {
      if (part.category_id) {
        const valid = await ctx.env.DB.prepare("SELECT id FROM categories WHERE id=? AND type=? AND (user_id IS NULL OR user_id=?)")
          .bind(part.category_id,body.type,ctx.userId).first();
        if (!valid) return errorResponse("One of the split categories is invalid.",400,ctx.origin);
      }
    }
  }

  const id = crypto.randomUUID();
  const walletId = body.wallet_id || `wallet_default_${ctx.userId}`;
  await ctx.env.DB.prepare("INSERT OR IGNORE INTO wallets (id,user_id,name,kind,opening_balance,currency) SELECT ?,id,'Main wallet','bank',0,currency FROM users WHERE id=?").bind(`wallet_default_${ctx.userId}`,ctx.userId).run();
  const wallet = await ctx.env.DB.prepare(
    "SELECT id FROM wallets WHERE id = ? AND user_id = ? AND is_archived = 0"
  ).bind(walletId, ctx.userId).first();
  if (!wallet) return errorResponse("Wallet not found. Please choose an active wallet.", 404, ctx.origin);

  await ctx.env.DB.prepare(
    "INSERT INTO transactions (id, user_id, type, amount, category_id, note, txn_date, wallet_id, refund_of_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(
      id,
      ctx.userId,
      body.type,
      body.amount,
      categoryId,
      body.note || null,
      body.txn_date,
      walletId,
      body.refund_of_id || null
    )
    .run();

  if (body.splits?.length) {
    const statements = body.splits.map(part => ctx.env.DB.prepare(
      "INSERT INTO transaction_splits (id,user_id,transaction_id,category_id,amount,note) VALUES (?,?,?,?,?,?)"
    ).bind(crypto.randomUUID(),ctx.userId,id,part.category_id || null,Number(part.amount),part.note || null));
    await ctx.env.DB.batch(statements);
  }

  return json(
    {
      id,
      type: body.type,
      amount: body.amount,
      category_id: body.category_id || null,
      note: body.note || null,
      txn_date: body.txn_date,
      wallet_id: walletId,
      refund_of_id: body.refund_of_id || null,
    },
    { status: 201 },
    ctx.origin
  );
}

export async function deleteTransaction(ctx: Ctx, id: string): Promise<Response> {
  await ctx.env.DB.prepare(
    "DELETE FROM transactions WHERE id = ? AND user_id = ?"
  )
    .bind(id, ctx.userId)
    .run();

  return json({ ok: true }, {}, ctx.origin);
}


export async function importTransactions(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json<{rows?:Array<{type?:string;amount?:number;category_id?:string|null;note?:string|null;txn_date?:string;wallet_id?:string|null}>}>();
  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length===0 || rows.length>500) return errorResponse("Upload between 1 and 500 transaction rows.",400,ctx.origin);
  await ctx.env.DB.prepare("INSERT OR IGNORE INTO wallets (id,user_id,name,kind,opening_balance,currency) SELECT ?,id,'Main wallet','bank',0,currency FROM users WHERE id=?").bind(`wallet_default_${ctx.userId}`,ctx.userId).run();
  const statements: D1PreparedStatement[] = [];
  for (const row of rows) {
    const amount=Number(row.amount);
    if (!["expense","income"].includes(row.type||"") || !Number.isFinite(amount) || amount<=0 || !/^\d{4}-\d{2}-\d{2}$/.test(row.txn_date||"")) {
      return errorResponse("One or more rows have an invalid type, amount or date. Nothing was imported.",400,ctx.origin);
    }
    const walletId=row.wallet_id || `wallet_default_${ctx.userId}`;
    const wallet=await ctx.env.DB.prepare("SELECT id FROM wallets WHERE id=? AND user_id=? AND is_archived=0").bind(walletId,ctx.userId).first();
    if(!wallet) return errorResponse("An imported row refers to an unknown wallet. Nothing was imported.",400,ctx.origin);
    if(row.category_id){
      const cat=await ctx.env.DB.prepare("SELECT id FROM categories WHERE id=? AND type=? AND (user_id IS NULL OR user_id=?)").bind(row.category_id,row.type,ctx.userId).first();
      if(!cat) return errorResponse("An imported row has an invalid category. Nothing was imported.",400,ctx.origin);
    }
    statements.push(ctx.env.DB.prepare("INSERT INTO transactions (id,user_id,type,amount,category_id,note,txn_date,wallet_id) VALUES (?,?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(),ctx.userId,row.type,amount,row.category_id||null,row.note?.slice(0,240)||null,row.txn_date,walletId));
  }
  for(let i=0;i<statements.length;i+=50) await ctx.env.DB.batch(statements.slice(i,i+50));
  return json({ok:true,imported:statements.length},{status:201},ctx.origin);
}
