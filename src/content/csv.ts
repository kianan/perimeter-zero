/** Minimal CSV parser -- fixed schema, no embedded commas/quotes (see brief-database.md).
 * Returns one object per row, keyed by the header row's column names. */
export function parseCsv(raw: string): Record<string, string>[] {
  const [headerLine, ...lines] = raw.trim().split('\n');
  const headers = headerLine.split(',');

  return lines
    .filter((line) => line.length > 0)
    .map((line) => {
      const cells = line.split(',');
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = cells[i] ?? '';
      });
      return row;
    });
}
