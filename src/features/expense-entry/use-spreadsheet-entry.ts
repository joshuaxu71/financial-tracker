import { useCallback, useState } from 'react';

export type EntryColumn = 'amount' | 'description';

export type EntryRow = {
  id: string;
  amount: string;
  description: string;
};

export type EntryCell = {
  rowId: string;
  column: EntryColumn;
};

function createEmptyRow(id: string): EntryRow {
  return { id, amount: '', description: '' };
}

function isRowEmpty(row: EntryRow) {
  return row.amount.trim() === '' && row.description.trim() === '';
}

/**
 * Drives spreadsheet-style rapid entry for expense rows: typing a value and
 * advancing (Enter/Tab, or moving down) always lands on an editable cell, and
 * a blank trailing row is kept available so there's never a manual "add row" step.
 */
export function useSpreadsheetEntry(makeRowId: () => string) {
  const [rows, setRows] = useState<EntryRow[]>(() => [createEmptyRow(makeRowId())]);
  const [activeCell, setActiveCell] = useState<EntryCell>({ rowId: rows[0].id, column: 'amount' });

  const ensureTrailingBlankRow = useCallback(
    (nextRows: EntryRow[]) => {
      const lastRow = nextRows[nextRows.length - 1];
      if (lastRow && !isRowEmpty(lastRow)) {
        return [...nextRows, createEmptyRow(makeRowId())];
      }
      return nextRows;
    },
    [makeRowId],
  );

  const updateCell = useCallback(
    (rowId: string, column: EntryColumn, value: string) => {
      setRows((prev) => {
        const next = prev.map((row) => (row.id === rowId ? { ...row, [column]: value } : row));
        return ensureTrailingBlankRow(next);
      });
    },
    [ensureTrailingBlankRow],
  );

  const removeRow = useCallback(
    (rowId: string) => {
      setRows((prev) => {
        const next = prev.filter((row) => row.id !== rowId);
        return next.length > 0 ? next : [createEmptyRow(makeRowId())];
      });
    },
    [makeRowId],
  );

  /** Advances the active cell the way pressing Enter/Next on a spreadsheet does. */
  const advance = useCallback(() => {
    setRows((currentRows) => {
      setActiveCell((current) => {
        const rowIndex = currentRows.findIndex((row) => row.id === current.rowId);
        if (rowIndex === -1) return current;

        if (current.column === 'amount') {
          return { rowId: current.rowId, column: 'description' };
        }

        const nextRow = currentRows[rowIndex + 1];
        if (nextRow) {
          return { rowId: nextRow.id, column: 'amount' };
        }
        return current;
      });
      return currentRows;
    });
  }, []);

  const focusCell = useCallback((cell: EntryCell) => {
    setActiveCell(cell);
  }, []);

  const clearRows = useCallback(() => {
    const firstRow = createEmptyRow(makeRowId());
    setRows([firstRow]);
    setActiveCell({ rowId: firstRow.id, column: 'amount' });
  }, [makeRowId]);

  const committedRows = rows.filter((row) => !isRowEmpty(row));

  return {
    rows,
    activeCell,
    committedRows,
    updateCell,
    removeRow,
    advance,
    focusCell,
    clearRows,
  };
}
