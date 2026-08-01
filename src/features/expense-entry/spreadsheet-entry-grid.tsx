import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { EntryColumn, EntryRow, useSpreadsheetEntry } from './use-spreadsheet-entry';

let rowIdCounter = 0;
function nextRowId() {
  rowIdCounter += 1;
  return `row-${rowIdCounter}`;
}

export type SpreadsheetEntryGridHandle = {
  /** Non-empty rows as currently edited, for the caller's Save action to bulk-upsert. */
  getRows: () => EntryRow[];
  /** Resets the grid to a single empty row after a successful save. */
  clearRows: () => void;
};

/**
 * Grid-style rapid entry for expense rows: type an amount, press next to move to
 * description, press next again to drop onto a fresh row — no per-item "add" tap.
 * Rows stay uncommitted in memory until the caller reads them via `ref.getRows()`
 * on an explicit Save action (see docs/spreadsheet-entry-design.md).
 */
export const SpreadsheetEntryGrid = forwardRef<SpreadsheetEntryGridHandle>(function SpreadsheetEntryGrid(
  _props,
  ref,
) {
  const { rows, activeCell, committedRows, updateCell, removeRow, advance, focusCell, clearRows } =
    useSpreadsheetEntry(nextRowId);
  const inputRefs = useRef(new Map<string, TextInput>());

  useImperativeHandle(
    ref,
    () => ({ getRows: () => committedRows, clearRows }),
    [committedRows, clearRows],
  );

  useEffect(() => {
    const key = cellKey(activeCell.rowId, activeCell.column);
    inputRefs.current.get(key)?.focus();
  }, [activeCell]);

  return (
    <ThemedView type="backgroundElement" style={styles.grid}>
      <View style={styles.headerRow}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.amountColumn}>
          Amount
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.descriptionColumn}>
          Description
        </ThemedText>
      </View>

      {rows.map((row) => (
        <EntryRowInputs
          key={row.id}
          row={row}
          registerInput={(column, input) => {
            const key = cellKey(row.id, column);
            if (input) inputRefs.current.set(key, input);
            else inputRefs.current.delete(key);
          }}
          onChange={(column, value) => updateCell(row.id, column, value)}
          onFocus={(column) => focusCell({ rowId: row.id, column })}
          onSubmit={advance}
          onDelete={() => removeRow(row.id)}
        />
      ))}
    </ThemedView>
  );
});

function cellKey(rowId: string, column: EntryColumn) {
  return `${rowId}:${column}`;
}

type EntryRowInputsProps = {
  row: EntryRow;
  registerInput: (column: EntryColumn, input: TextInput | null) => void;
  onChange: (column: EntryColumn, value: string) => void;
  onFocus: (column: EntryColumn) => void;
  onSubmit: () => void;
  onDelete: () => void;
};

function EntryRowInputs({ row, registerInput, onChange, onFocus, onSubmit, onDelete }: EntryRowInputsProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <TextInput
        ref={(input) => registerInput('amount', input)}
        value={row.amount}
        onChangeText={(value) => onChange('amount', value)}
        onFocus={() => onFocus('amount')}
        onSubmitEditing={onSubmit}
        keyboardType="decimal-pad"
        returnKeyType="next"
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, styles.amountColumn, { color: theme.text }]}
      />
      <TextInput
        ref={(input) => registerInput('description', input)}
        value={row.description}
        onChangeText={(value) => onChange('description', value)}
        onFocus={() => onFocus('description')}
        onSubmitEditing={onSubmit}
        returnKeyType="next"
        placeholder="What was it for?"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, styles.descriptionColumn, { color: theme.text }]}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace' && row.amount === '' && row.description === '') {
            onDelete();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    gap: Spacing.two,
  },
  amountColumn: {
    width: 96,
  },
  descriptionColumn: {
    flex: 1,
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: Spacing.one,
  },
});
