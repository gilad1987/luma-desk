/**
 * The children of `section#viewer`, byte for byte as the original page had them, without the cue HUD (the executors
 * panel inserts it after `#tip`). The renderer looks up `#c`, `#ov` and `#viewer` when it boots and the selection
 * chips read `#selInfo` / `#progInfo`, so this goes into the shell before render boots. It has no Hebrew text.
 */
export const viewerMarkup = [
  '\n      <canvas id="c"></canvas><canvas id="ov"></canvas><div id="selRect"></div>',
  '\n      <div id="vhud"><div class="chip" id="selInfo">Selection: <b>0</b></div>',
  '<div class="chip" id="progInfo">Programmer: empty</div></div>',
  '\n      <div id="tip"></div>',
  '\n      <div id="viewHint">Click fixture: select · Shift+click: add · Shift+drag: box select<br>',
  'Drag: orbit · Right-drag: pan · Wheel: zoom</div>\n    ',
].join('');
