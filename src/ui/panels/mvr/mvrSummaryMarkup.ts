import { he } from '../../../i18n/he';
import type { ImportSummaryView, SummaryCount } from './importSummaryView';

/** One label/value row; `data-count` holds the bare number, which the e2e tests read. */
const countRow = ({ key, label, value }: SummaryCount): string =>
  `<div class="mvrCount"><span>${label}</span><b data-count="${key}">${value}</b></div>`;

/** A heading only when its list has rows, so an import without warnings or layers shows no empty section. */
const heading = (present: boolean, html: string): string => (present ? html : '');

/**
 * The show choice after an import that kept the operator's cues; "Build" comes first and takes the focus, so it is
 * the default. Fixed text only.
 */
const SHOW_CHOICE = `<div id="mvrShowChoice" class="mvrShowChoice"><p>${he.mvr.cuesKept}</p>
  <button id="mvrBuildShow">Build a starting show for this rig</button> <button id="mvrKeepCues">Keep my cues</button></div>`;

/**
 * The import summary dialog body (`#mvrSummary`). The counts, the offset and the geometry line come from code
 * (numbers and fixed English labels), so they go into the markup as they are. The warnings, the body lines and the
 * layer names come from the file, so `openMvrSummary` writes them into `#mvrWarnings`, `#mvrBodies` and `#mvrLayers`
 * as text, never as markup.
 */
export function mvrSummaryMarkup(view: ImportSummaryView, layerCount: number, offerShow = false): string {
  return `<button class="close" id="mvrSummaryClose">✕</button><h2>MVR import</h2>
  <div id="mvrSummary" class="mvrSummary">${offerShow ? SHOW_CHOICE : ''}
  <div class="mvrCounts">${view.counts.map(countRow).join('')}</div>
  <p>${view.offset}</p><p>${view.geometry}</p>
  ${heading(view.warnings.length > 0, '<h3>Warnings</h3>')}<ul id="mvrWarnings" class="mvrWarnings"></ul>
  ${heading(view.bodies.length > 0, '<h3>Fixture bodies</h3>')}<ul id="mvrBodies" class="mvrWarnings"></ul>
  ${heading(layerCount > 0, `<h3 title="${he.mvr.layersTip}">Layers</h3>`)}<div id="mvrLayers" class="mvrLayers"></div>
  </div>`;
}
