/** Case-insensitive fuzzy match: substring first, then subsequence
 *  (so "shz" matches "shoes zone"). Empty query matches everything. */
export function fuzzyMatch(query: string, text: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  let i = 0;
  for (let c = 0; c < t.length && i < q.length; c++) {
    if (t[c] === q[i]) i++;
  }
  return i === q.length;
}

export function rangeDaysFromParam(value: string | undefined, fallback = 30): number {
  const n = Number(value);
  return [7, 14, 30, 90].includes(n) ? n : fallback;
}
