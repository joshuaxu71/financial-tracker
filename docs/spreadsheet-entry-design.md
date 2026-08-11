# Spreadsheet-style rapid entry — design

## Flow: enter mode → edit → commit (bulk upsert)

Not save-per-row. The whole point of this feature is removing per-item friction (input → click add → repeat), so committing per-row would just reintroduce it with extra steps.

1. **Enter edit mode** — user taps "Add expenses" (or similar) for a given day/category. This mounts `SpreadsheetEntryGrid` and gives it a live, editable working set of rows. Nothing is persisted yet.
2. **Make edits** — user types amount → presses next/enter → description → next/enter → drops onto a new blank row, repeatedly. All state lives in `useSpreadsheetEntry`, in memory, uncommitted. Rows can be edited or deleted (backspace-on-empty-row removes it) freely with no persistence cost.
3. **Save** — user taps "Done"/"Save" (or navigates away, if we want autosave-on-blur later). At this point the grid's non-empty rows are handed off as one batch.
4. **Bulk upsert** — the parent screen takes that batch and performs a single upsert transaction: new rows get inserted, and if editing pre-existing entries, changed rows get updated by id. This should be one network/DB round trip, not N.

This matches the `SpreadsheetEntryGrid` component's shape: it holds all editing state internally and exposes non-empty rows imperatively via `ref.getRows()`. The screen hosting the grid wires an explicit **Save** button that calls `getRows()` and passes the batch to a single `upsertExpenses(rows)` call — the grid itself never fires persistence, it just hands over the current snapshot on demand.

## Why not save-per-row

- Re-introduces the exact friction (input → commit → repeat) that this feature exists to remove.
- N round trips instead of 1 — worse on flaky mobile connections, exactly when this feature matters most (in a store, on the go).
- Complicates the empty-trailing-row invariant: if a row is saved the instant it's filled, "is this row still being edited or done" becomes ambiguous, and undo/edit-before-save gets harder.

## Why not fully local-only with no explicit save

An implicit autosave-on-every-keystroke was considered and rejected for v1:
- Half-typed amounts (e.g. "1" before typing "1200") would transiently persist as real transactions, corrupting balances/budgets until the user finishes typing.
- No natural place to show "13 items pending, tap Save" — users lose the sense of a batch they're building.
- Can be added later as a *draft* autosave (local-only, not yet committed to the ledger) without changing the bulk-upsert commit step itself.

## Data shape for the upsert

Each row commits as:
```ts
{ id?: string; amount: number; description: string; categoryId: string; occurredAt: string }
```
- `id` present → update existing entry; absent → insert.
- `categoryId` / `occurredAt` are set by the screen context (e.g. "adding to Food, today"), not per-row in the grid — keeps the grid itself category-agnostic and reusable across contexts (day view, category view, receipt-import review, etc.)
- The upsert is one call: `upsertExpenses(rows)` — server/DB decides insert vs. update per row by presence of `id`.

## Future: OCR fits the same commit step

Per the spec's Phase 2 note, a receipt scan populates the same row shape (amount, description guessed from line item) into the same grid for the user to review/correct before Save — reusing this exact commit path instead of a separate persistence flow.
