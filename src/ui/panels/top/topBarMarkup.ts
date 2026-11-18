import { he } from '../../../i18n/he';
import { viewButtons } from './topBarViews';

const ZOOMS = [
  ['auto', 'Auto'],
  ['.85', '85%'],
  ['1', '100%'],
  ['1.15', '115%'],
  ['1.3', '130%'],
  ['1.5', '150%'],
] as const;
const options = (list: readonly (readonly [string, string])[]): string =>
  list.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
const LAYOUTS = options([
  ['ma', 'Console (MA)'],
  ['desk', 'Desk'],
  ['classic', 'Classic'],
]);
const text = he.panels;

/**
 * The "Build Stage" button that opens the Stage Builder: the one part of the bar the original page did not have. It
 * is one constant, so the markup-parity test can name it and remove exactly this text before it compares the bar. It
 * opens the Glow group, the last group that a 1280 px window shows without a scroll (quirk G10, orig:260).
 */
export const buildStageButton = `<button id="buildBtn" title="${he.builder.openTitle}">Build Stage</button>`;

/**
 * The top bar, byte for byte as the original page had it, plus {@link buildStageButton}. It holds controls other modules wire (layout selects,
 * REC, fullscreen, install, MIDI, show file, guide, clock); the bar renders them all so the shell needs no header.
 */
export const topBarMarkup =
  [
    '<header id="top">',
    '<div class="brand"><i></i>LUMA<b>DESK</b></div>',
    `<div class="showname" id="showName">Demo Show — Sultan's Pool, Jerusalem</div>`,
    `<div class="tbg"><label>View</label>\n      ${viewButtons}\n    </div>`,
    '<div class="tbg"><label>House</label><input type="range" id="house" min="0" max="100" value="30" ' +
      'style="width:70px" title="Audience house lights"></div>',
    '<div class="tbg"><label>Haze</label><input type="range" id="haze" min="0" max="100" value="62" ' +
      'style="width:90px"></div>',
    `<div class="tbg">${buildStageButton}<button id="glowBtn" class="on">Glow</button><button id="idsBtn">Fixture IDs</button>` +
      '<button id="realBtn" class="on" title="Real spot lights & shadows on performers">Real light</button></div>',
    '<div class="spacer"></div>',
    `<div class="tbg" id="layoutBox"><label>Layout</label><select id="layoutSel" title="${text.layoutTitle}">` +
      `${LAYOUTS}</select><select id="deskZoom" title="${text.zoomTitle}">${options(ZOOMS)}</select></div>`,
    `<div class="tbg"><button id="recBtn" title="${text.recTitle}">● REC</button>` +
      `<button id="fsBtn" title="${text.fullscreenTitle}">⛶</button>` +
      `<button id="installBtn" style="display:none">${text.install}</button><button id="midiBtn">MIDI</button>` +
      `<button id="fileBtn">Show File</button><button id="helpBtn" class="on">${text.guide}</button></div>`,
    '<div id="clock"></div><div id="fps"></div>',
  ].join('\n    ') + '\n  </header>';
