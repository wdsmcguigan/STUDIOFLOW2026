"use client";

/**
 * ActualsLedger — append-only cost entry log + estimate/actual/variance display.
 *
 * Three responsibilities:
 * 1. Append form — captures a new cost entry (amount, date, account, optional line,
 *    note) and posts to addCostEntryAction.
 * 2. Ledger list — read-only table of existing entries, newest first. No edit/delete
 *    UI. Corrections are new offsetting (negative) entries.
 * 3. Variance display — budget total + per-account breakdown of estimate vs actual
 *    vs variance. Over/under indicated via --ok / --error status tokens (never raw
 *    hex).
 *
 * Non-negotiable: the ledger is append-only. A correction = a new negative entry.
 *
 * Pattern: "use client", actions as props, <form action={…}>.
 * Tokens only — no hardcoded colors.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/budget/format";
import type { CostEntry, BudgetAccount, BudgetLine, Variance } from "@/lib/budget/schema";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ActualsLedgerProps {
  projectId: string;
  budgetId: string;
  accounts: BudgetAccount[];
  lines: BudgetLine[];
  costEntries: CostEntry[];
  variance: Variance;
  addCostEntryAction: (formData: FormData) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Variance badge — over/under visual treatment using status tokens only
// ---------------------------------------------------------------------------

/**
 * variance = estimate − actual
 * Positive → under budget (ok)
 * Negative → over budget (error)
 * Zero     → exactly on budget (muted)
 */
function VarianceBadge({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span
        className="font-mono text-xs font-semibold tabular-nums"
        style={{ color: "var(--ok)" }}
        aria-label={`Under budget by ${formatCurrency(Math.abs(value))}`}
      >
        {formatCurrency(value)}
        <span className="ml-1 text-[10px] font-medium uppercase tracking-[0.4px]">
          under
        </span>
      </span>
    );
  }
  if (value < 0) {
    return (
      <span
        className="font-mono text-xs font-semibold tabular-nums"
        style={{ color: "var(--error)" }}
        aria-label={`Over budget by ${formatCurrency(Math.abs(value))}`}
      >
        {formatCurrency(Math.abs(value))}
        <span className="ml-1 text-[10px] font-medium uppercase tracking-[0.4px]">
          over
        </span>
      </span>
    );
  }
  return (
    <span className="font-mono text-xs text-[var(--tx-3)] tabular-nums">
      {formatCurrency(0)}
      <span className="ml-1 text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]">
        on budget
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ActualsLedger({
  projectId,
  budgetId,
  accounts,
  lines,
  costEntries,
  variance,
  addCostEntryAction,
}: ActualsLedgerProps) {
  // selectedAccountId for the optional line select filter
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  // Build label maps so the ledger list shows names, not ids
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const lineById = new Map(lines.map((l) => [l.id, l]));

  // Lines filtered by the currently-selected account in the append form
  const linesForAccount = selectedAccountId
    ? lines.filter((l) => l.account_id === selectedAccountId)
    : [];

  // Accounts that have variance data (all accounts from the variance report)
  const accountVarianceEntries = Object.entries(variance.byAccount);

  return (
    <div className="space-y-6">
      {/* ── Variance summary ──────────────────────────────────────────────── */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
          <div className="space-y-0.5">
            <h3 className="font-display text-base font-extrabold tracking-[-0.2px] text-[var(--tx)]">
              Estimate vs Actual
            </h3>
            <p className="text-xs text-[var(--tx-3)]">
              Variance = estimate − actual. Positive = under budget; negative = over
              budget.
            </p>
          </div>

          {/* Budget total summary */}
          <div className="shrink-0 rounded-lg border border-[var(--line)] bg-[var(--s1)] px-4 py-2 space-y-0.5 text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]">
              Budget Total
            </p>
            <div className="flex items-end gap-4">
              <div className="text-right">
                <p className="text-[10px] text-[var(--tx-3)]">Estimate</p>
                <p className="font-mono text-sm font-semibold tabular-nums text-[var(--tx)]">
                  {formatCurrency(variance.budget.estimate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[var(--tx-3)]">Actual</p>
                <p className="font-mono text-sm font-semibold tabular-nums text-[var(--tx)]">
                  {formatCurrency(variance.budget.actual)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[var(--tx-3)]">Variance</p>
                <VarianceBadge value={variance.budget.variance} />
              </div>
            </div>
          </div>
        </div>

        {/* Per-account variance table */}
        {accountVarianceEntries.length > 0 ? (
          <div className="px-6 py-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  <th className="pb-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--tx-3)]">
                    Account
                  </th>
                  <th className="pb-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--tx-3)]">
                    Estimate
                  </th>
                  <th className="pb-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--tx-3)]">
                    Actual
                  </th>
                  <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--tx-3)]">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {accountVarianceEntries.map(([accountId, vl]) => {
                  const account = accountById.get(accountId);
                  const label = account
                    ? `${account.code} — ${account.name}`
                    : `Account ${accountId.slice(0, 8)}`;
                  return (
                    <tr key={accountId}>
                      <td className="py-2 pr-4 text-xs text-[var(--tx)]">
                        {label}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-xs tabular-nums text-[var(--tx-2)]">
                        {formatCurrency(vl.estimate)}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-xs tabular-nums text-[var(--tx-2)]">
                        {formatCurrency(vl.actual)}
                      </td>
                      <td className="py-2 text-right">
                        <VarianceBadge value={vl.variance} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-4">
            <p className="text-xs text-[var(--tx-3)]">
              No actuals recorded yet — add entries below to see variance.
            </p>
          </div>
        )}
      </div>

      {/* ── Append form ───────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        <div className="border-b border-[var(--line)] px-6 py-4">
          <h3 className="font-display text-sm font-extrabold tracking-[-0.1px] text-[var(--tx)]">
            Add Actuals Entry
          </h3>
          <p className="mt-0.5 text-xs text-[var(--tx-3)]">
            Corrections are entered as offsetting (negative) entries — the ledger
            is append-only.
          </p>
        </div>

        <form action={addCostEntryAction} className="px-6 py-4">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="budgetId" value={budgetId} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Amount */}
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor="actuals-amount"
                className="text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]"
              >
                Amount (negative to offset)
              </label>
              <input
                id="actuals-amount"
                type="number"
                name="amount"
                step="0.01"
                required
                placeholder="e.g. 1250.00 or -500.00"
                aria-label="Entry amount"
                className="h-7 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-right text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </div>

            {/* Entry date */}
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor="actuals-entry-date"
                className="text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]"
              >
                Entry Date
              </label>
              <input
                id="actuals-entry-date"
                type="date"
                name="entryDate"
                required
                aria-label="Entry date"
                className="h-7 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </div>

            {/* Account (required) */}
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor="actuals-account"
                className="text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]"
              >
                Account (required)
              </label>
              <select
                id="actuals-account"
                name="accountId"
                required
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                aria-label="Account"
                className="h-7 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="">— select account —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Line (optional — only shown when an account is selected) */}
            <div className="flex flex-col gap-0.5">
              <label
                htmlFor="actuals-line"
                className="text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]"
              >
                Line (optional)
              </label>
              <select
                id="actuals-line"
                name="lineId"
                disabled={linesForAccount.length === 0}
                aria-label="Budget line (optional)"
                className="h-7 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50"
              >
                <option value="">— account-level (no line) —</option>
                {linesForAccount.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div className="flex flex-col gap-0.5 sm:col-span-2 lg:col-span-2">
              <label
                htmlFor="actuals-note"
                className="text-[10px] font-medium uppercase tracking-[0.4px] text-[var(--tx-3)]"
              >
                Note (optional)
              </label>
              <input
                id="actuals-note"
                type="text"
                name="note"
                maxLength={500}
                placeholder="e.g. Invoice #1234 — Grip equipment rental"
                aria-label="Note"
                className="h-7 w-full rounded-lg border border-[var(--line-2)] bg-[var(--s2)] px-2 text-xs text-[var(--tx)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="submit" variant="ember" size="sm">
              Add entry
            </Button>
          </div>
        </form>
      </div>

      {/* ── Ledger list ───────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        <div className="border-b border-[var(--line)] px-6 py-4">
          <h3 className="font-display text-sm font-extrabold tracking-[-0.1px] text-[var(--tx)]">
            Actuals Ledger
          </h3>
          <p className="mt-0.5 text-xs text-[var(--tx-3)]">
            Append-only — no edits or deletes. Enter a negative amount to offset a
            prior entry.
          </p>
        </div>

        {costEntries.length === 0 ? (
          <div className="px-6 py-6 text-center">
            <p className="text-sm text-[var(--tx-3)]">
              No actuals recorded yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--s1)]">
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--tx-3)]">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--tx-3)]">
                    Account
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--tx-3)]">
                    Line
                  </th>
                  <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--tx-3)]">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.4px] text-[var(--tx-3)]">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {costEntries.map((entry) => {
                  const account = accountById.get(entry.account_id);
                  const line = entry.line_id ? lineById.get(entry.line_id) : null;
                  const isNegative = entry.amount < 0;

                  return (
                    <tr key={entry.id} className="hover:bg-[var(--s1)] transition-colors">
                      <td className="px-4 py-2 text-xs tabular-nums text-[var(--tx-2)]">
                        {entry.entry_date}
                      </td>
                      <td className="px-4 py-2 text-xs text-[var(--tx)]">
                        {account
                          ? `${account.code} — ${account.name}`
                          : entry.account_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2 text-xs text-[var(--tx-3)]">
                        {line ? line.description : (
                          <span className="italic">—</span>
                        )}
                      </td>
                      <td
                        className="px-4 py-2 text-right font-mono text-xs font-semibold tabular-nums"
                        style={{
                          color: isNegative
                            ? "var(--warn)"
                            : "var(--tx)",
                        }}
                      >
                        {isNegative && "("}
                        {formatCurrency(Math.abs(entry.amount))}
                        {isNegative && ")"}
                      </td>
                      <td className="px-4 py-2 text-xs text-[var(--tx-3)]">
                        {entry.note ?? (
                          <span className="italic">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
