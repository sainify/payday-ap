import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal, TrendingDown, TrendingUp, X, Pencil, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayButton } from "@/components/ui/ClayButton";
import { ClayInput, ClaySelect } from "@/components/ui/ClayInput";
import { Sheet } from "@/components/ui/Sheet";
import { Amount } from "@/components/ui/Amount";
import { useTransactions, useCategories, mutate, type TransactionFilters } from "@/hooks/useData";
import { Transaction } from "@/types";
import clsx from "clsx";

type FilterType = "all" | "expense" | "income";

export default function Transactions() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advanced, setAdvanced] = useState<TransactionFilters>({});

  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const { data: expenseCategories } = useCategories("expense");
  const { data: incomeCategories } = useCategories("income");

  const allCategories = useMemo(() => {
    const seen = new Set<string>();
    return [...(expenseCategories || []), ...(incomeCategories || [])].filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [expenseCategories, incomeCategories]);

  const params: TransactionFilters = {
    q: query || undefined,
    type: filter === "all" ? undefined : filter,
    ...advanced,
  };

  const { data, loading, reload } = useTransactions(params);
  const filtered = data || [];
  const activeAdvanced = Object.values(advanced).some(Boolean);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const t of filtered) {
      const day = new Date(`${t.txn_date}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      groups[day] = groups[day] || [];
      groups[day].push(t);
    }
    return groups;
  }, [filtered]);

  function clearAdvanced() {
    setAdvanced({});
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setEditAmount(String(t.amount));
    setEditCategoryId(t.category_id || "");
    setEditNote(t.note || "");
    setEditDate(t.txn_date);
    setEditError(null);
  }

  async function saveEdit() {
    if (!editing) return;

    const amount = Number(editAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setEditError("Amount must be greater than zero.");
      return;
    }
    if (!editDate) {
      setEditError("Please select a date.");
      return;
    }

    setEditBusy(true);
    setEditError(null);

    try {
      await mutate("/transactions", "POST", {
        id: editing.id,
        type: editing.type,
        amount,
        category_id: editCategoryId || null,
        note: editNote.trim() || null,
        txn_date: editDate,
      });
      setEditing(null);
      await reload();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not update transaction.");
    } finally {
      setEditBusy(false);
    }
  }

  async function deleteEdit() {
    if (!editing) return;
    const ok = window.confirm("Delete this transaction? This cannot be undone.");
    if (!ok) return;

    setEditBusy(true);
    setEditError(null);

    try {
      await mutate(`/transactions/${editing.id}`, "DELETE");
      setEditing(null);
      await reload();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not delete transaction.");
    } finally {
      setEditBusy(false);
    }
  }

  const editCategories =
    editing?.type === "income" ? incomeCategories || [] : expenseCategories || [];

  return (
    <div className="pb-28">
      <TopBar title="Transactions" subtitle="Every rupee, tracked" />
      <div className="px-5 space-y-4">
        <div className="flex items-center gap-2 clay-inset px-4 py-3">
          <Search size={18} className="text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search note or category"
            className="flex-1 bg-transparent outline-none text-sm min-w-0"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-ink-faint">
              <X size={15} />
            </button>
          )}
          <button
            onClick={() => setAdvancedOpen(true)}
            className={clsx("relative", activeAdvanced ? "text-primary" : "text-ink-faint")}
            aria-label="Advanced filters"
          >
            <SlidersHorizontal size={17} />
            {activeAdvanced && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
        </div>

        <div className="flex gap-2">
          {(["all", "expense", "income"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-4 py-2 rounded-clay-sm text-sm font-semibold capitalize transition-all",
                filter === f
                  ? "bg-primary text-white shadow-clay-raised-sm"
                  : "clay-surface-sm text-ink-soft"
              )}
            >
              {f}
            </button>
          ))}
          {activeAdvanced && (
            <button onClick={clearAdvanced} className="ml-auto text-xs font-semibold text-coral">
              Clear filters
            </button>
          )}
        </div>

        {activeAdvanced && (
          <ClayCard className="!p-3">
            <div className="text-xs text-ink-faint flex flex-wrap gap-x-3 gap-y-1">
              {advanced.category && <span>Category filtered</span>}
              {advanced.from && <span>From {advanced.from}</span>}
              {advanced.to && <span>To {advanced.to}</span>}
              {advanced.min && <span>Min ₹{advanced.min}</span>}
              {advanced.max && <span>Max ₹{advanced.max}</span>}
            </div>
          </ClayCard>
        )}

        {loading && <p className="text-sm text-ink-faint px-1">Loading…</p>}

        {!loading && filtered.length === 0 && (
          <ClayCard>
            <p className="text-sm text-ink-faint text-center py-4">
              No transactions match these filters.
            </p>
          </ClayCard>
        )}

        {Object.entries(grouped).map(([day, txns]) => (
          <div key={day}>
            <div className="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-2 px-1">
              {day}
            </div>
            <ClayCard className="!p-2 space-y-1">
              {txns.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openEdit(t)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left rounded-clay-sm active:scale-[0.99] transition-transform"
                  aria-label={`Edit ${t.note || t.category_name || "transaction"}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={clsx(
                        "h-10 w-10 rounded-clay-sm flex items-center justify-center shrink-0",
                        t.type === "expense"
                          ? "bg-coral-soft text-coral"
                          : "bg-mint-soft text-mint"
                      )}
                    >
                      {t.type === "expense" ? (
                        <TrendingDown size={17} />
                      ) : (
                        <TrendingUp size={17} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {t.note || t.category_name || "Transaction"}
                      </div>
                      <div className="text-xs text-ink-faint">
                        {t.category_name || "Uncategorised"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Amount
                      value={t.type === "expense" ? -t.amount : t.amount}
                      sign
                      size="sm"
                      className={t.type === "expense" ? "text-coral" : "text-mint"}
                    />
                    <Pencil size={14} className="text-ink-faint" />
                  </div>
                </button>
              ))}
            </ClayCard>
          </div>
        ))}
      </div>

      <Sheet open={advancedOpen} onClose={() => setAdvancedOpen(false)} title="Advanced Filters">
        <ClaySelect
          label="Category"
          value={advanced.category || ""}
          onChange={(e) => setAdvanced((p) => ({ ...p, category: e.target.value }))}
        >
          <option value="">All categories</option>
          {allCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </ClaySelect>

        <div className="grid grid-cols-2 gap-3">
          <ClayInput
            label="From"
            type="date"
            value={advanced.from || ""}
            onChange={(e) => setAdvanced((p) => ({ ...p, from: e.target.value }))}
          />
          <ClayInput
            label="To"
            type="date"
            value={advanced.to || ""}
            onChange={(e) => setAdvanced((p) => ({ ...p, to: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ClayInput
            label="Min amount"
            type="number"
            min={0}
            value={advanced.min || ""}
            onChange={(e) => setAdvanced((p) => ({ ...p, min: e.target.value }))}
          />
          <ClayInput
            label="Max amount"
            type="number"
            min={0}
            value={advanced.max || ""}
            onChange={(e) => setAdvanced((p) => ({ ...p, max: e.target.value }))}
          />
        </div>

        <ClayButton fullWidth onClick={() => setAdvancedOpen(false)}>
          Apply Filters
        </ClayButton>

        {activeAdvanced && (
          <ClayButton
            fullWidth
            variant="ghost"
            className="mt-2"
            onClick={() => {
              clearAdvanced();
              setAdvancedOpen(false);
            }}
          >
            Clear All
          </ClayButton>
        )}
      </Sheet>

      <Sheet
        open={Boolean(editing)}
        onClose={() => !editBusy && setEditing(null)}
        title={editing?.type === "income" ? "Edit Income" : "Edit Expense"}
      >
        {editing && (
          <>
            <div className="clay-inset px-4 py-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-ink-faint">Transaction type</span>
              <span
                className={clsx(
                  "text-sm font-semibold capitalize",
                  editing.type === "expense" ? "text-coral" : "text-mint"
                )}
              >
                {editing.type}
              </span>
            </div>

            <ClayInput
              label="Amount (₹)"
              type="number"
              inputMode="decimal"
              min={0.01}
              step="0.01"
              required
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />

            {editCategories.length > 0 && (
              <ClaySelect
                label="Category"
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
              >
                <option value="">Uncategorised</option>
                {editCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </ClaySelect>
            )}

            <ClayInput
              label="Note (optional)"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
            />

            <ClayInput
              label="Date"
              type="date"
              required
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />

            {editError && <p className="text-coral text-sm mb-4">{editError}</p>}

            <ClayButton fullWidth disabled={editBusy} onClick={saveEdit}>
              {editBusy ? "Saving…" : "Save Changes"}
            </ClayButton>

            <ClayButton
              fullWidth
              variant="danger"
              disabled={editBusy}
              className="mt-3 flex items-center justify-center gap-2"
              onClick={deleteEdit}
            >
              <Trash2 size={16} />
              Delete Transaction
            </ClayButton>
          </>
        )}
      </Sheet>
    </div>
  );
}
