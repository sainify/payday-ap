import React, { ChangeEvent, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, ImagePlus, Plus, ReceiptText, Sparkles, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayInput, ClaySelect } from "@/components/ui/ClayInput";
import { ClayButton } from "@/components/ui/ClayButton";
import { useCategories } from "@/hooks/useData";
import { api } from "@/lib/api";
import { ReceiptItem } from "@/types";

const today = () => new Date().toISOString().slice(0, 10);

function guessCategory(merchant: string, categories: { id: string; name: string }[]) {
  const text = merchant.toLowerCase();
  const rules: Array<[string[], string]> = [
    [["dmart", "mart", "grocery", "supermarket", "fresh"], "Groceries"],
    [["swiggy", "zomato", "restaurant", "cafe", "food"], "Food & Dining"],
    [["uber", "ola", "petrol", "fuel", "metro"], "Transport"],
    [["amazon", "flipkart", "mall", "store"], "Shopping"],
    [["pharmacy", "medical", "hospital", "clinic"], "Health"],
    [["netflix", "cinema", "movie", "spotify"], "Entertainment"],
    [["hotel", "airline", "flight", "travel"], "Travel"],
    [["school", "college", "course", "academy"], "Education"],
  ];
  for (const [words, category] of rules) {
    if (words.some((word) => text.includes(word))) {
      return categories.find((c) => c.name === category)?.id || "";
    }
  }
  return categories.find((c) => c.name === "Other")?.id || "";
}

export default function ExpenseScanner() {
  const navigate = useNavigate();
  const { data: categories } = useCategories("expense");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [tax, setTax] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const categoryName = useMemo(() => categories?.find((c) => c.id === categoryId)?.name, [categories, categoryId]);

  function chooseImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setError(null);
  }

  function smartCategorize() {
    const id = guessCategory(merchant, categories || []);
    setCategoryId(id);
  }

  function addItem() {
    setItems((old) => [...old, { item_name: "", quantity: 1, amount: 0 }]);
  }

  function updateItem(index: number, patch: Partial<ReceiptItem>) {
    setItems((old) => old.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function save() {
    const total = Number(amount);
    if (!date || !Number.isFinite(total) || total <= 0) {
      setError("Enter a valid receipt date and total amount.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/receipts", {
        merchant: merchant.trim() || "Receipt",
        receipt_date: date,
        total_amount: total,
        tax_amount: Math.max(0, Number(tax || 0)),
        category_id: categoryId || null,
        payment_method: paymentMethod,
        note: note.trim() || null,
        items: items.filter((i) => i.item_name.trim()).map((i) => ({ ...i, amount: Number(i.amount || 0), quantity: Number(i.quantity || 1) })),
      });
      setSaved(true);
      window.setTimeout(() => navigate("/transactions"), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save receipt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-28">
      <TopBar title="Expense Scanner" subtitle="Receipt to expense in seconds" back />
      <div className="px-5 space-y-4">
        <ClayCard className="overflow-hidden !p-0">
          <button type="button" onClick={() => inputRef.current?.click()} className="w-full min-h-52 flex flex-col items-center justify-center gap-3 p-5 clay-pressable">
            {preview ? <img src={preview} alt="Receipt preview" className="w-full max-h-72 object-contain rounded-clay-sm" /> : <><div className="h-16 w-16 rounded-clay bg-primary-soft text-primary flex items-center justify-center"><Camera size={30}/></div><div className="font-display font-semibold text-lg">Scan or upload receipt</div><div className="text-sm text-ink-faint text-center">Use your camera or choose a receipt photo</div></>}
          </button>
          <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={chooseImage} className="hidden" />
          {preview && <div className="px-5 pb-5"><ClayButton className="w-full" variant="neutral" onClick={() => inputRef.current?.click()}><ImagePlus size={17}/> Change photo</ClayButton></div>}
        </ClayCard>

        <ClayCard className="!p-4 bg-primary-soft/60">
          <div className="flex gap-3"><Sparkles size={20} className="text-primary shrink-0"/><div><div className="font-semibold text-sm">Smart receipt review</div><div className="text-xs text-ink-faint mt-1">Photo capture is ready. Enter or verify the extracted fields below. Merchant-based smart category suggestions work now; automatic image text extraction can be connected later without changing this flow.</div></div></div>
        </ClayCard>

        {error && <div className="rounded-clay-sm bg-coral-soft text-coral px-4 py-3 text-sm">{error}</div>}
        {saved && <div className="rounded-clay-sm bg-mint-soft text-mint px-4 py-3 text-sm flex items-center gap-2"><Check size={16}/> Expense saved and Payday balance updated.</div>}

        <ClayCard>
          <div className="flex items-center justify-between mb-4"><div><div className="font-display font-semibold flex items-center gap-2"><ReceiptText size={18}/> Review expense</div><div className="text-xs text-ink-faint mt-1">Everything stays editable before saving</div></div><button type="button" onClick={smartCategorize} className="text-xs font-semibold text-primary">Auto category</button></div>
          <ClayInput label="Merchant / Shop" value={merchant} onChange={(e) => setMerchant(e.target.value)} onBlur={smartCategorize} placeholder="e.g. DMart" />
          <div className="grid grid-cols-2 gap-3"><ClayInput label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /><ClayInput label="Total amount" type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₹0" /></div>
          <div className="grid grid-cols-2 gap-3"><ClayInput label="Tax (optional)" type="number" inputMode="decimal" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="₹0" /><ClaySelect label="Payment" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option>UPI</option><option>Cash</option><option>Debit Card</option><option>Credit Card</option><option>Bank Account</option><option>Other</option></ClaySelect></div>
          <ClaySelect label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Uncategorised</option>{(categories || []).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</ClaySelect>
          {categoryName && <div className="text-xs text-primary -mt-2 mb-4">Suggested: {categoryName}</div>}
          <ClayInput label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything to remember?" />
        </ClayCard>

        <ClayCard>
          <div className="flex items-center justify-between mb-3"><div><div className="font-display font-semibold">Receipt items</div><div className="text-xs text-ink-faint">Optional item-by-item breakdown</div></div><button type="button" onClick={addItem} className="h-10 w-10 clay-surface-sm clay-pressable rounded-clay-sm flex items-center justify-center text-primary"><Plus size={18}/></button></div>
          {items.length === 0 && <button type="button" onClick={addItem} className="w-full clay-inset py-5 text-sm text-ink-faint">+ Add first item</button>}
          <div className="space-y-3">{items.map((item, index) => <div key={index} className="clay-inset p-3"><div className="flex gap-2"><input value={item.item_name} onChange={(e) => updateItem(index,{item_name:e.target.value})} placeholder="Item name" className="flex-1 bg-transparent outline-none text-sm"/><button type="button" onClick={() => setItems((old) => old.filter((_,i)=>i!==index))} className="text-coral"><Trash2 size={16}/></button></div><div className="grid grid-cols-2 gap-3 mt-3"><input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e)=>updateItem(index,{quantity:Number(e.target.value)})} className="bg-transparent outline-none text-sm" placeholder="Qty"/><input type="number" min="0" step="0.01" value={item.amount || ""} onChange={(e)=>updateItem(index,{amount:Number(e.target.value)})} className="bg-transparent outline-none text-sm text-right" placeholder="Amount"/></div></div>)}</div>
        </ClayCard>

        <ClayButton className="w-full" onClick={save} disabled={busy || saved}>{busy ? "Saving…" : "Confirm Expense"}</ClayButton>
        <p className="text-xs text-ink-faint text-center px-4">Saving creates a normal Payday expense, so Available Balance, Spent This Cycle, Safe-to-Spend, budgets and insights use it automatically.</p>
      </div>
    </div>
  );
}
