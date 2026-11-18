import { he } from '../../../i18n/he';
import { mvrPickMarkup } from '../mvr/mvrPickMarkup';

/**
 * The Show File dialog body: the original `#fileBtn` dialog byte for byte, then the MVR row (import, demo rig,
 * export) and the `#mvrImportError` line, which stays empty until an MVR import fails.
 */
export const showFileMarkup = `<button class="close" id="hClose">✕</button><h2>Show File</h2>
  <p>The show auto-saves in this browser. To move it to another computer, copy the JSON and paste it there.</p>
  <div class="row"><button id="fSave" class="on">⬇ Download show file</button><button id="fCopy">Copy show JSON</button><button id="fDemo">Reload demo show</button><button id="fNew">New empty show</button></div>
  <h3>Import</h3><textarea id="fTxt" placeholder="Paste show JSON here…"></textarea>
  <div class="row"><button id="fImp" class="on">Load pasted show</button><label style="display:flex;align-items:center;gap:6px;color:var(--mut)">or file: <input type="file" id="fFile" accept=".json,application/json"></label></div>
  <h3>MVR</h3><div class="row">${mvrPickMarkup('Import MVR', 'fMvrFile')}<button id="fDemoRig" title="${he.mvr.demoRigTip}">Load demo rig</button><button id="fMvrExport" title="${he.mvr.exportTip}">Export MVR</button></div>
  <p id="mvrImportError" class="mvrError" role="alert"></p>`;
