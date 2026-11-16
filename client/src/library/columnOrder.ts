/**
 * Puts the columns named in `order` first, in that order, and the rest after them in their
 * original order. A name with no column is ignored, so one order can serve columns that a table
 * only sometimes has. The columns themselves are returned as they are, never copied.
 */
export function orderColumns<C extends { field: string }>(columns: readonly C[], order: readonly string[]): C[] {
  const listed = [...new Set(order)].flatMap(field => columns.filter(column => column.field === field));
  const rest = columns.filter(column => !order.includes(column.field));
  return [...listed, ...rest];
}
