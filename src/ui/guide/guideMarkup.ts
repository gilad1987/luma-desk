import { he } from '../../i18n/he';

/**
 * The guide and tour overlays of the page shell, outside `#app`. Guide fills `#gNav`, `#gTitle` and `#gBody`; Tour
 * fills the tip. The whitespace between tags follows the original page, where it is visible between inline buttons.
 */
export const guideMarkup = (): string => `<div id="guide">
  <div class="gbox">
    <nav class="gnav" id="gNav"></nav>
    <div class="gmain">
      <div class="ghead">
        <h2 id="gTitle"></h2>
        <button id="gClose">${he.guide.frame.close}</button>
      </div>
      <div class="gbody" id="gBody"></div>
      <div class="gfoot"><button id="gPrev">${he.guide.frame.prev}</button><button id="gNext">${he.guide.frame.next}</button></div>
    </div>
  </div>
</div>
<div id="tourHole"></div>
<div id="tourTip">
  <h4 id="tTitle"></h4>
  <p id="tText"></p>
  <div class="tr">
    <button id="tPrev">→</button><button class="nx" id="tNext">${he.tour.next}</button><button id="tEnd">${he.tour.end}</button
    ><span id="tCount"></span>
  </div>
</div>`;
