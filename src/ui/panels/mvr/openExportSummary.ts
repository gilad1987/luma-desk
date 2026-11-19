import { he } from '../../../i18n/he';
import type { MvrExportSummary } from '../../../mvr';
import { byId } from '../../dom';
import { createElement, type Modal } from '../../shared';

type ReportLines = MvrExportSummary['report']['losses'];

/** Fixed markup only: every sentence comes from the export and may hold names from the file, so it goes in as text. */
const MARKUP = `<button class="close" id="mvrExportClose">✕</button><h2>${he.mvr.exportTitle}</h2>
  <div id="mvrExportGroups"></div>`;

/** A list of text lines. */
function listOf(texts: readonly string[]): HTMLElement {
  const list = createElement('ul');
  list.dir = 'auto';
  for (const text of texts) {
    const item = createElement('li');
    item.textContent = text;
    list.appendChild(item);
  }
  return list;
}

/** The full list of a grouped line, closed until the user asks for it, so the count stays readable. */
function showAll(all: readonly string[]): HTMLElement {
  const box = createElement('details');
  const label = createElement('summary');
  label.textContent = he.mvr.exportShowAll(all.length);
  box.append(label, listOf(all));
  return box;
}

/** One group under its heading; an empty group shows nothing, so a heading never stands over an empty list. */
function fill(host: HTMLElement, id: string, title: string, lines: ReportLines): void {
  if (lines.length === 0) return;
  const heading = createElement('h3');
  heading.textContent = title;
  const list = listOf(lines.map((item) => item.text));
  list.id = id;
  lines.forEach((item, index) => {
    if (item.all.length > 0) list.children[index]?.appendChild(showAll(item.all));
  });
  host.append(heading, list);
}

/**
 * Opens the export summary in the shared modal in three groups: what the file does not carry, what a console user
 * must check, and what was kept and changed. The caller opens it by itself only for the first two, so a clean export
 * stays a toast and a real loss is not one line among fifty.
 */
export function openExportSummary(modal: Pick<Modal, 'open' | 'close'>, summary: MvrExportSummary): void {
  modal.open(MARKUP);
  byId('mvrExportClose').onclick = () => modal.close();
  const host = byId('mvrExportGroups');
  fill(host, 'mvrExportLosses', he.mvr.exportLosses, summary.report.losses);
  fill(host, 'mvrExportWarnings', he.mvr.exportWarnings, summary.report.warnings);
  fill(host, 'mvrExportNotes', he.mvr.exportKept, summary.report.information);
}
