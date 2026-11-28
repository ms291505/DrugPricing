/*
 * The More filters grid. Its fields come in groups, one per concept (what the drug is, how it's
 * priced), and the grid's columns follow both the number of fields and the panel's width.
 */

/** The grid's column count, and how many of them each group spans (its own fields' columns). */
export type MoreFiltersLayout = { columns: number, spans: number[] };

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/**
 * Lays out groups of `fieldCounts` fields in at most `maxColumns` columns, never more columns than
 * fields. Groups share a row when that takes no more rows than giving each group rows of its own:
 * each gets a column, and every spare column goes to the group with the most rows. Otherwise each
 * group spans every column. Either way the fields keep one column width.
 */
export function moreFiltersLayout(fieldCounts: number[], maxColumns: number): MoreFiltersLayout {
  const columns = Math.max(1, Math.min(maxColumns, sum(fieldCounts)));
  const ownRows = { columns, spans: fieldCounts.map(() => columns) };
  if (fieldCounts.length > columns) return ownRows;

  const spans = fieldCounts.map(() => 1);
  const rows = () => fieldCounts.map((count, i) => Math.ceil(count / spans[i]));
  for (let spare = columns - fieldCounts.length; spare > 0; spare--) {
    const groupRows = rows();
    spans[groupRows.indexOf(Math.max(...groupRows))]++;
  }
  const sharedRows = Math.max(...rows());
  const separateRows = sum(fieldCounts.map(count => Math.ceil(count / columns)));
  return sharedRows <= separateRows ? { columns, spans } : ownRows;
}
