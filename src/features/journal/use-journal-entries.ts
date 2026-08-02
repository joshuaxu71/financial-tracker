import { useCallback, useState } from "react";

const DEFAULT_CATEGORY_ID = 2; // Food

export type JournalEntryRow = {
   id: string;
   amount: string;
   description: string;
   category_id: number;
};

export type ActiveEntryCell = {
   date: string;
   rowId: string;
   field: "amount" | "description";
} | null;

type RowsMap = Record<string, JournalEntryRow[]>;

let rowIdCounter = 0;
function makeRowId() {
   rowIdCounter += 1;
   return `jr-${rowIdCounter}`;
}

function makeEmptyRow(categoryId = DEFAULT_CATEGORY_ID): JournalEntryRow {
   return { id: makeRowId(), amount: "", description: "", category_id: categoryId };
}

function isRowEmpty(row: JournalEntryRow) {
   return row.amount.trim() === "" && row.description.trim() === "";
}

function withTrailingBlank(rows: JournalEntryRow[]): JournalEntryRow[] {
   const last = rows[rows.length - 1];
   if (!last || !isRowEmpty(last)) {
      return [...rows, makeEmptyRow(last?.category_id)];
   }
   return rows;
}

export function useJournalEntries() {
   const [rowsByDate, setRowsByDate] = useState<RowsMap>({});
   const [activeCell, setActiveCell] = useState<ActiveEntryCell>(null);

   const ensureDayRows = useCallback((date: string) => {
      setRowsByDate((prev) => {
         if (prev[date]) return prev;
         return { ...prev, [date]: [makeEmptyRow()] };
      });
   }, []);

   const updateRow = useCallback(
      (
         date: string,
         rowId: string,
         field: "amount" | "description" | "category_id",
         value: string | number,
      ) => {
         setRowsByDate((prev) => {
            const rows = prev[date] ?? [makeEmptyRow()];
            const updated = rows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r));
            return {
               ...prev,
               [date]: field === "category_id" ? updated : withTrailingBlank(updated),
            };
         });
      },
      [],
   );

   const removeRow = useCallback((date: string, rowId: string) => {
      setRowsByDate((prev) => {
         const rows = (prev[date] ?? []).filter((r) => r.id !== rowId);
         return { ...prev, [date]: rows.length > 0 ? withTrailingBlank(rows) : [makeEmptyRow()] };
      });
   }, []);

   const advance = useCallback((date: string, rowId: string, field: "amount" | "description") => {
      setRowsByDate((snapshot) => {
         setActiveCell(() => {
            const rows = snapshot[date] ?? [];
            const idx = rows.findIndex((r) => r.id === rowId);
            if (idx === -1) return null;

            if (field === "amount") return { date, rowId, field: "description" };

            const next = rows[idx + 1];
            return next ? { date, rowId: next.id, field: "amount" } : null;
         });
         return snapshot;
      });
   }, []);

   const focusCell = useCallback((date: string, rowId: string, field: "amount" | "description") => {
      setActiveCell({ date, rowId, field });
   }, []);

   const clearAll = useCallback(() => {
      setRowsByDate({});
      setActiveCell(null);
   }, []);

   const getCommittedEntries = useCallback(
      () =>
         Object.entries(rowsByDate).flatMap(([date, rows]) =>
            rows.filter((r) => !isRowEmpty(r)).map((row) => ({ date, row })),
         ),
      [rowsByDate],
   );

   const hasAnyPending = Object.values(rowsByDate).some((rows) => rows.some((r) => !isRowEmpty(r)));

   return {
      rowsByDate,
      activeCell,
      hasAnyPending,
      ensureDayRows,
      updateRow,
      removeRow,
      advance,
      focusCell,
      clearAll,
      getCommittedEntries,
   };
}
