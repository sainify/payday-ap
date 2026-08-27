import React, { useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  X,
  Pencil,
  Trash2,
  ChevronRight,
  ReceiptText,
} from "lucide-react";

import { TopBar } from "@/components/layout/TopBar";
import { ClayButton } from "@/components/ui/ClayButton";
import { ClayInput, ClaySelect } from "@/components/ui/ClayInput";
import { Sheet } from "@/components/ui/Sheet";
import { Amount } from "@/components/ui/Amount";

import {
  useTransactions,
  useCategories,
  mutate,
  type TransactionFilters,
} from "@/hooks/useData";

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

    return [
      ...(expenseCategories || []),
      ...(incomeCategories || []),
    ].filter((c) => {
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
      const day = new Date(
        `${t.txn_date}T00:00:00`
      ).toLocaleDateString("en-IN", {
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
      await mutate(
        `/transactions?edit_id=${encodeURIComponent(editing.id)}`,
        "POST",
        {
          id: editing.id,
          type: editing.type,
          amount,
          category_id: editCategoryId || null,
          note: editNote.trim() || null,
          txn_date: editDate,
        }
      );

      setEditing(null);
      await reload();
    } catch (e) {
      setEditError(
        e instanceof Error
          ? e.message
          : "Could not update transaction."
      );
    } finally {
      setEditBusy(false);
    }
  }

  async function deleteEdit() {
    if (!editing) return;

    const ok = window.confirm(
      "Delete this transaction? This cannot be undone."
    );

    if (!ok) return;

    setEditBusy(true);
    setEditError(null);

    try {
      await mutate(`/transactions/${editing.id}`, "DELETE");
      setEditing(null);
      await reload();
    } catch (e) {
      setEditError(
        e instanceof Error
          ? e.message
          : "Could not delete transaction."
      );
    } finally {
      setEditBusy(false);
    }
  }

  const editCategories =
    editing?.type === "income"
      ? incomeCategories || []
      : expenseCategories || [];

  return (
    <div className="pb-44">
      <TopBar
        title="Transactions"
        subtitle="Every rupee, tracked"
      />

      <div className="px-5 space-y-5">
        {/* SEARCH */}
        <div className="premium-card-sm px-4 py-3 flex items-center gap-3">
          <Search
            size={18}
            className="text-ink-faint shrink-0"
          />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions"
            className="flex-1 bg-transparent outline-none text-sm min-w-0 placeholder:text-ink-faint"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="h-7 w-7 flex items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-ink-faint"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setAdvancedOpen(true)}
            className={clsx(
              "relative h-8 w-8 rounded-full flex items-center justify-center transition-colors",
              activeAdvanced
                ? "bg-primary/10 text-primary"
                : "text-ink-faint"
            )}
            aria-label="Advanced filters"
          >
            <SlidersHorizontal size={17} />

            {activeAdvanced && (
              <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-primary ring-2 ring-white dark:ring-[#1c1c1e]" />
            )}
          </button>
        </div>

        {/* FILTER TABS */}
        <div className="flex items-center gap-2">
          {(["all", "expense", "income"] as FilterType[]).map(
            (f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={clsx(
                  "h-9 px-4 rounded-full text-xs font-semibold capitalize transition-all duration-200",
                  filter === f
                    ? "bg-primary text-white shadow-[0_7px_18px_rgba(79,70,229,0.20)]"
                    : "bg-white/70 dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.05] text-ink-soft"
                )}
              >
                {f}
              </button>
            )
          )}

          {activeAdvanced && (
            <button
              type="button"
              onClick={clearAdvanced}
              className="ml-auto text-[11px] font-semibold text-coral"
            >
              Clear
            </button>
          )}
        </div>

        {/* ACTIVE FILTERS */}
        {activeAdvanced && (
          <div className="premium-card-sm p-3">
            <div className="flex flex-wrap gap-2">
              {advanced.category && (
                <FilterChip text="Category" />
              )}

              {advanced.from && (
                <FilterChip text={`From ${advanced.from}`} />
              )}

              {advanced.to && (
                <FilterChip text={`To ${advanced.to}`} />
              )}

              {advanced.min && (
                <FilterChip text={`Min ₹${advanced.min}`} />
              )}

              {advanced.max && (
                <FilterChip text={`Max ₹${advanced.max}`} />
              )}
            </div>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="premium-card p-5">
            <p className="text-sm text-ink-faint text-center">
              Loading transactions…
            </p>
          </div>
        )}

        {/* EMPTY */}
        {!loading && filtered.length === 0 && (
          <div className="premium-card px-5 py-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-[16px] bg-primary-soft text-primary flex items-center justify-center mb-3">
              <ReceiptText size={21} />
            </div>

            <div className="font-semibold text-sm">
              No transactions found
            </div>

            <p className="text-xs text-ink-faint mt-1">
              Try changing your search or filters.
            </p>
          </div>
        )}

        {/* GROUPED TRANSACTIONS */}
        {Object.entries(grouped).map(([day, txns]) => (
          <section key={day}>
            <div className="section-label px-1 mb-2">
              {day}
            </div>

            <div className="premium-card overflow-hidden">
              {txns.map((t, index) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openEdit(t)}
                  className={clsx(
                    "w-full flex items-center justify-between gap-3 px-4 py-4 text-left active:bg-black/[0.025] dark:active:bg-white/[0.03] transition-colors",
                    index !== 0 &&
                      "border-t border-black/[0.05] dark:border-white/[0.05]"
                  )}
                  aria-label={`Edit ${
                    t.note || t.category_name || "transaction"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={clsx(
                        "h-11 w-11 rounded-[15px] flex items-center justify-center shrink-0",
                        t.type === "expense"
                          ? "bg-coral-soft text-coral"
                          : "bg-mint-soft text-mint"
                      )}
                    >
                      {t.type === "expense" ? (
                        <TrendingDown size={18} />
                      ) : (
                        <TrendingUp size={18} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {t.note ||
                          t.category_name ||
                          "Transaction"}
                      </div>

                      <div className="text-[11px] text-ink-faint mt-1 truncate">
                        {t.category_name || "Uncategorised"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <Amount
                        value={
                          t.type === "expense"
                            ? -t.amount
                            : t.amount
                        }
                        sign
                        size="sm"
                        className={
                          t.type === "expense"
                            ? "text-coral"
                            : "text-mint"
                        }
                      />

                      <div className="text-[9px] text-ink-faint mt-1 capitalize">
                        {t.type}
                      </div>
                    </div>

                    <ChevronRight
                      size={16}
                      className="text-ink-faint"
                    />
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ADVANCED FILTERS */}
      <Sheet
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        title="Advanced Filters"
      >
        <ClaySelect
          label="Category"
          value={advanced.category || ""}
          onChange={(e) =>
            setAdvanced((p) => ({
              ...p,
              category: e.target.value,
            }))
          }
        >
          <option value="">All categories</option>

          {allCategories.map((c) => (
            <option
              key={c.id}
              value={c.id}
            >
              {c.icon} {c.name}
            </option>
          ))}
        </ClaySelect>

        <div className="grid grid-cols-2 gap-3">
          <ClayInput
            label="From"
            type="date"
            value={advanced.from || ""}
            onChange={(e) =>
              setAdvanced((p) => ({
                ...p,
                from: e.target.value,
              }))
            }
          />

          <ClayInput
            label="To"
            type="date"
            value={advanced.to || ""}
            onChange={(e) =>
              setAdvanced((p) => ({
                ...p,
                to: e.target.value,
              }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ClayInput
            label="Min amount"
            type="number"
            min={0}
            value={advanced.min || ""}
            onChange={(e) =>
              setAdvanced((p) => ({
                ...p,
                min: e.target.value,
              }))
            }
          />

          <ClayInput
            label="Max amount"
            type="number"
            min={0}
            value={advanced.max || ""}
            onChange={(e) =>
              setAdvanced((p) => ({
                ...p,
                max: e.target.value,
              }))
            }
          />
        </div>

        <ClayButton
          fullWidth
          onClick={() => setAdvancedOpen(false)}
        >
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

      {/* EDIT TRANSACTION */}
      <Sheet
        open={Boolean(editing)}
        onClose={() =>
          !editBusy && setEditing(null)
        }
        title={
          editing?.type === "income"
            ? "Edit Income"
            : "Edit Expense"
        }
      >
        {editing && (
          <>
            <div className="premium-card-sm px-4 py-3 mb-4 flex items-center justify-between">
              <span className="text-xs text-ink-faint">
                Transaction type
              </span>

              <span
                className={clsx(
                  "text-xs font-semibold capitalize px-3 py-1.5 rounded-full",
                  editing.type === "expense"
                    ? "bg-coral-soft text-coral"
                    : "bg-mint-soft text-mint"
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
              onChange={(e) =>
                setEditAmount(e.target.value)
              }
            />

            {editCategories.length > 0 && (
              <ClaySelect
                label="Category"
                value={editCategoryId}
                onChange={(e) =>
                  setEditCategoryId(e.target.value)
                }
              >
                <option value="">
                  Uncategorised
                </option>

                {editCategories.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.icon} {c.name}
                  </option>
                ))}
              </ClaySelect>
            )}

            <ClayInput
              label="Note (optional)"
              value={editNote}
              onChange={(e) =>
                setEditNote(e.target.value)
              }
            />

            <ClayInput
              label="Date"
              type="date"
              required
              value={editDate}
              onChange={(e) =>
                setEditDate(e.target.value)
              }
            />

            {editError && (
              <div className="rounded-[16px] bg-coral-soft text-coral px-4 py-3 text-xs mb-4">
                {editError}
              </div>
            )}

            <ClayButton
              fullWidth
              disabled={editBusy}
              onClick={saveEdit}
            >
              {editBusy
                ? "Saving…"
                : "Save Changes"}
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

function FilterChip({
  text,
}: {
  text: string;
}) {
  return (
    <span className="px-3 py-1.5 rounded-full bg-primary/8 text-primary text-[10px] font-semibold">
      {text}
    </span>
  );
}
