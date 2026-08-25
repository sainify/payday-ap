import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, ReceiptText, Search } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { Amount } from "@/components/ui/Amount";
import { api } from "@/lib/api";
import { ReceiptRecord } from "@/types";

export default function ReceiptVault() {
  const [items, setItems] = useState<ReceiptRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.get<ReceiptRecord[]>("/receipts").then(setItems).catch((e)=>setError(e instanceof Error?e.message:"Could not load receipts.")).finally(()=>setLoading(false)); }, []);
  const filtered = useMemo(() => items.filter((r) => `${r.merchant || ""} ${r.category_name || ""} ${r.payment_method}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  return <div className="pb-28"><TopBar title="Receipt Vault" subtitle="Your scanned expense history" back right={<Link to="/expense-scanner" className="h-10 w-10 rounded-clay-sm bg-primary text-white flex items-center justify-center"><Camera size={18}/></Link>}/><div className="px-5 space-y-4"><div className="clay-inset px-4 py-3 flex items-center gap-3"><Search size={17} className="text-ink-faint"/><input value={query} onChange={(e)=>setQuery(e.target.value)} className="bg-transparent outline-none flex-1 text-sm" placeholder="Search merchant or category"/></div>{error && <div className="rounded-clay-sm bg-coral-soft text-coral px-4 py-3 text-sm">{error}</div>}{loading && <p className="text-sm text-ink-faint">Loading receipts…</p>}{!loading && filtered.length===0 && <ClayCard><div className="py-6 text-center"><ReceiptText className="mx-auto text-ink-faint mb-3"/><div className="font-semibold">No receipts yet</div><div className="text-sm text-ink-faint mt-1">Scan your first expense receipt.</div></div></ClayCard>}<div className="space-y-3">{filtered.map((r)=><ClayCard key={r.id} className="!p-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="font-semibold truncate">{r.merchant || "Receipt"}</div><div className="text-xs text-ink-faint mt-1">{new Date(`${r.receipt_date}T00:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})} · {r.payment_method}</div><div className="text-xs text-primary mt-1">{r.category_icon} {r.category_name || "Uncategorised"}</div></div><Amount value={-Number(r.total_amount)} sign size="sm" className="text-coral"/></div></ClayCard>)}</div></div></div>;
}
