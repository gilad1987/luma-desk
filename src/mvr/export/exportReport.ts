/** One line of the export summary; `all` is the full list behind a grouped line and empty for a single sentence. */
export interface ReportLine {
  readonly text: string;
  readonly all: readonly string[];
}

/**
 * The export summary in three groups. `losses` is what the file does not carry; `warnings` is what it carries but a
 * console user must check; `information` is what was kept, changed or is simply so. The dialog opens by itself only
 * for the first two, so a line about a real loss is not buried under lines every export has.
 */
export interface ExportReport {
  readonly losses: readonly ReportLine[];
  readonly warnings: readonly ReportLine[];
  readonly information: readonly ReportLine[];
}

/** How many sentences a grouped line shows; the rest stay behind "Show all". */
const EXAMPLES = 3;

/** A sentence that stands alone. */
export const line = (text: string): ReportLine => ({ text, all: [] });

/**
 * One line for many sentences of one kind: the count, up to three of them, and the full list behind it (D2). One
 * real file gave 57 overlap sentences, and two real losses were lost among them. A single sentence stays as it is.
 */
export function grouped(what: string, items: readonly string[]): ReportLine[] {
  if (items.length <= 1) return items.map(line);
  const more = items.length > EXAMPLES ? ` (and ${items.length - EXAMPLES} more)` : '';
  const examples = items.slice(0, EXAMPLES).join(' ');
  return [{ text: `${items.length} ${what}. For example: ${examples}${more}`, all: items }];
}

/** Every sentence of the lines, a grouped line as its full list. */
export function flatLines(lines: readonly ReportLine[]): string[] {
  return lines.flatMap((item) => (item.all.length > 0 ? item.all : [item.text]));
}
