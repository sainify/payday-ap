import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, Landmark, Plus, RefreshCw, Wallet as WalletIcon } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { ClayInput, ClaySelect } from "@/components/ui/ClayInput";
import { api } from "@/lib/api";

type Wallet = { id:string; name:string; kind:string; opening_balance:number; balance:number; currency:string };

const money = (value:number, currency="INR") => new Intl.NumberFormat("en-IN",{style:"currency",currency,maximumFractionDigits:2}).format(value || 0);

export default function WalletsPage() {
  const [wallets,setWallets] = useState<Wallet[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [showCreate,setShowCreate] = useState(false);
  const [name,setName] = useState("");
  const [kind,setKind] = useState("bank");
  const [opening,setOpening] = useState("0");
  const [from,setFrom] = useState("");
  const [to,setTo] = useState("");
  const [amount,setAmount] = useState("");
  const [date,setDate] = useState(new Date().toISOString().slice(0,10));
  const [note,setNote] = useState("");
  const [busy,setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const rows = await api.get<Wallet[]>("/wallets");
      setWallets(rows);
      setFrom(current => rows.some(w=>w.id===current) ? current : rows[0]?.id || "");
      setTo(current => rows.some(w=>w.id===current) && current!==rows[0]?.id ? current : rows[1]?.id || "");
    } catch(e) { setError(e instanceof Error ? e.message : "Could not load wallets."); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{ void load(); },[load]);

  async function createWallet(e:React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await api.post("/wallets",{name,kind,opening_balance:Number(opening)});
      setName(""); setOpening("0"); setShowCreate(false); await load();
    } catch(e) { setError(e instanceof Error ? e.message : "Could not create wallet."); }
    finally { setBusy(false); }
  }

  async function makeTransfer(e:React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await api.post("/wallets/transfer",{from_wallet_id:from,to_wallet_id:to,amount:Number(amount),transfer_date:date,note});
      setAmount(""); setNote(""); await load();
    } catch(e) { setError(e instanceof Error ? e.message : "Could not complete transfer."); }
    finally { setBusy(false); }
  }

  return <div className="pb-32">
    <TopBar title="My Wallets" subtitle="Accounts, cash and transfers"/>
    <div className="px-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-faint">Keep balances separate by account.</p>
        <button onClick={()=>void load()} aria-label="Refresh wallets" className="p-2 rounded-full clay-surface-sm"><RefreshCw size={17}/></button>
      </div>
      {error && <ClayCard className="text-sm text-coral">{error}</ClayCard>}
      {loading ? <ClayCard>Loading wallets…</ClayCard> : <div className="grid grid-cols-2 gap-3">
        {wallets.map(w=><ClayCard key={w.id} className="min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3"><WalletIcon size={19}/></div>
          <div className="font-semibold truncate">{w.name}</div>
          <div className="text-xs text-ink-faint capitalize mt-0.5">{w.kind}</div>
          <div className="font-display text-lg font-bold mt-3 break-words">{money(w.balance,w.currency)}</div>
        </ClayCard>)}
      </div>}
      <ClayButton fullWidth onClick={()=>setShowCreate(v=>!v)}><Plus size={17} className="inline mr-2"/>{showCreate?"Close":"Add wallet"}</ClayButton>
      {showCreate && <ClayCard>
        <h3 className="font-display font-semibold mb-3">Create a wallet</h3>
        <form onSubmit={createWallet}>
          <ClayInput label="Wallet name" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. HDFC Bank" maxLength={40} required/>
          <ClaySelect label="Account type" value={kind} onChange={e=>setKind(e.target.value)}>
            <option value="bank">Bank account</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="savings">Savings</option><option value="other">Other</option>
          </ClaySelect>
          <ClayInput label="Opening balance" type="number" min="0" step="0.01" value={opening} onChange={e=>setOpening(e.target.value)} required/>
          <ClayButton fullWidth disabled={busy}>{busy?"Saving…":"Save wallet"}</ClayButton>
        </form>
      </ClayCard>}
      <ClayCard>
        <div className="flex items-center gap-2 mb-1"><ArrowLeftRight size={19} className="text-primary"/><h3 className="font-display font-semibold">Transfer between wallets</h3></div>
        <p className="text-xs text-ink-faint mb-4">Transfers move money between your accounts without counting as income or spending.</p>
        {wallets.length<2 ? <p className="text-sm text-ink-faint">Create at least two wallets to make a transfer.</p> : <form onSubmit={makeTransfer}>
          <ClaySelect label="From" value={from} onChange={e=>setFrom(e.target.value)}>{wallets.map(w=><option key={w.id} value={w.id}>{w.name} · {money(w.balance,w.currency)}</option>)}</ClaySelect>
          <ClaySelect label="To" value={to} onChange={e=>setTo(e.target.value)}>{wallets.filter(w=>w.id!==from).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</ClaySelect>
          <ClayInput label="Amount" type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/>
          <ClayInput label="Transfer date" type="date" value={date} onChange={e=>setDate(e.target.value)} required/>
          <ClayInput label="Note (optional)" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Monthly savings"/>
          <ClayButton fullWidth disabled={busy || !from || !to || from===to}>{busy?"Processing…":"Transfer money"}</ClayButton>
        </form>}
      </ClayCard>
      <ClayCard className="flex gap-3 items-start"><Landmark size={19} className="text-primary mt-0.5"/><p className="text-xs text-ink-faint">Wallet balances are calculated from each wallet's opening balance, linked transactions and internal transfers. Existing transactions are assigned to your Main wallet during the migration.</p></ClayCard>
    </div>
  </div>;
}
