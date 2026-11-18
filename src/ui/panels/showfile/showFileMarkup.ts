/** The Show File dialog body, byte for byte as the original `#fileBtn` handler opened it. */
export const showFileMarkup = `<button class="close" id="hClose">✕</button><h2>Show File</h2>
  <p>The show auto-saves in this browser. To move it to another computer, copy the JSON and paste it there.</p>
  <div class="row"><button id="fSave" class="on">⬇ Download show file</button><button id="fCopy">Copy show JSON</button><button id="fDemo">Reload demo show</button><button id="fNew">New empty show</button></div>
  <h3>Import</h3><textarea id="fTxt" placeholder="Paste show JSON here…"></textarea>
  <div class="row"><button id="fImp" class="on">Load pasted show</button><label style="display:flex;align-items:center;gap:6px;color:var(--mut)">or file: <input type="file" id="fFile" accept=".json,application/json"></label></div>`;
