import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayInput, ClaySelect } from "@/components/ui/ClayInput";
import { ClayButton } from "@/components/ui/ClayButton";
import { useCategories } from "@/hooks/useData";
import { api } from "@/lib/api";
import { toISODate } from "@/lib/cycle";

const titles: Record<string, string> = {
  expense: "Add Expense",
  income: "Add Income",
  salary: "Record Salary",
  bill: "Add Bill / EMI",
  goal: "New Savings Goal",
};

export default function AddEntry() {
  const { type = "expense" } = useParams();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [categoryId, setCategoryId] = useState("");
  const [recurrence, setRecurrence] = useState("monthly");
  const [targetDate, setTargetDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [wallets, setWallets] = useState<Array<{id:string;name:string}>>([]);
  const [walletId, setWalletId] = useState("");
  const [refundOfId, setRefundOfId] = useState("");
  const [recentExpenses, setRecentExpenses] = useState<Array<{id:string;amount:number;note:string|null;txn_date:string}>>([]);
  useEffect(() => { if (type === "expense" || type === "income") { api.get<Array<{id:string;name:string}>>("/wallets").then(rows => { setWallets(rows); setWalletId(rows[0]?.id || ""); }).catch(() => setWallets([])); } if (type === "income") { api.get<Array<{id:string;amount:number;note:string|null;txn_date:string}>>("/transactions?type=expense").then(setRecentExpenses).catch(() => setRecentExpenses([])); } }, [type]);
  const { data: categories } = useCategories(type === "expense" || type === "income" ? (type as "expense" | "income") : undefined);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (type === "expense" || type === "income") {
        await api.post("/transactions", {
          type,
          amount: Number(amount),
          category_id: categoryId || null,
          note,
          txn_date: date,
          wallet_id: walletId || null,
          refund_of_id: refundOfId || null,
        });
      } else if (type === "salary") {
        await api.post("/salary", { amount: Number(amount), salary_date: date, note });
      } else if (type === "bill") {
        await api.post("/bills", { title: note || "Bill", amount: Number(amount), due_date: date, recurrence });
      } else if (type === "goal") {
        await api.post("/goals", {
          title: note || "Goal",
          target_amount: Number(amount),
          target_date: targetDate || null,
        });
      }
      navigate(-1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-28">
      <TopBar title={titles[type] || "Add"} back />
      <div className="px-5">
        <ClayCard>
          <form onSubmit={submit}>
            <ClayInput
              label={type === "goal" ? "Target amount (₹)" : "Amount (₹)"}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              required
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            {(type === "expense" || type === "income") && wallets.length > 0 && (
              <ClaySelect label="Wallet / Account" value={walletId} onChange={(e) => setWalletId(e.target.value)}>
                {wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
              </ClaySelect>
            )}

            {type === "income" && recentExpenses.length > 0 && (
              <ClaySelect label="Refund for an existing expense (optional)" value={refundOfId} onChange={(e) => setRefundOfId(e.target.value)}>
                <option value="">Not a refund</option>
                {recentExpenses.map((item) => <option key={item.id} value={item.id}>{item.note || "Expense"} · ₹{item.amount} · {item.txn_date}</option>)}
              </ClaySelect>
            )}

            {(type === "expense" || type === "income") && categories && categories.length > 0 && (
              <ClaySelect label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </ClaySelect>
            )}

            {type === "bill" && (
              <ClaySelect label="Repeats" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                <option value="one_time">One time</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </ClaySelect>
            )}

            <ClayInput
              label={type === "bill" ? "Title" : type === "goal" ? "Goal name" : "Note (optional)"}
              required={type === "bill" || type === "goal"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {type !== "goal" && (
              <ClayInput
                label={type === "bill" ? "Due date" : type === "salary" ? "Salary date" : "Date"}
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}

            {type === "goal" && (
              <ClayInput
                label="Target date (optional)"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            )}

            <ClayButton type="submit" fullWidth disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </ClayButton>
          </form>
        </ClayCard>
      </div>
    </div>
  );
}
