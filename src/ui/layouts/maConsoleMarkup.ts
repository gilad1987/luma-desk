/**
 * The MA console shell: two screens over a deck with the special masters, playback, programmer and master sections.
 * Whitespace between tags follows the original page, where it is visible between inline elements.
 */
export const MA_CONSOLE_MARKUP = `<section id="maConsole">
  <div class="maDesk" id="maBody">
    <div class="maScreens">
      <i class="maCheek"></i><i class="maCheek r"></i
      ><i id="maGrip" title="Drag: console size · double-click: default"></i>
      <div class="disp">
        <div class="dhead"><span>1 · SHEETS + COMMAND</span><b id="d1info"></b></div>
        <div class="dslot" id="d1s"></div>
        <div class="dcmd" id="d3s">
          <div class="dsub"><span>COMMAND</span><b id="d3info"></b></div>
        </div>
      </div>
      <div class="disp">
        <div class="dhead"><span>2 · POOLS + PROGRAMMER</span><b id="d2info"></b></div>
        <div class="dslot dsplit" id="d2s"></div>
      </div>
    </div>
    <div class="maDeck">
      <i class="maCheek"></i><i class="maCheek r"></i>
      <div class="maHinge"></div>
      <div class="maSurface">
        <div class="srf">
          <span class="slab">SPECIAL MASTERS</span><span class="slab s2">PLAYBACK · EXECUTORS 1–10</span>
          <div class="maLcd"></div>
          <div class="maFaders">
            <div class="maSpecs" id="maSpecs"></div>
            <div id="pbSlot"></div>
          </div>
        </div>
        <div class="srf maProg">
          <span class="slab">PROGRAMMER</span>
          <div id="ftSlot"></div>
          <div id="ecSlot"></div>
          <div class="maLow">
            <div class="maLeft">
              <div class="maTouch">
                <div class="tscr">
                  <div class="thead"><span>COLOR</span><b id="tsColInfo"></b></div>
                  <div class="tbody">
                    <canvas class="pad" id="tsCol" width="204" height="124"></canvas
                    ><i class="tmk" id="tsColMk"></i>
                    <div class="tnone" id="tsColNone"></div>
                  </div>
                </div>
                <div class="tscr">
                  <div class="thead"><span>POSITION</span><b id="tsPosInfo"></b></div>
                  <div class="tbody">
                    <canvas class="pad" id="tsPos" width="204" height="124"></canvas>
                    <div class="tnone" id="tsPosNone">NO SELECTION</div>
                  </div>
                </div>
              </div>
              <div id="kySlot"></div>
            </div>
            <div id="kpSlot"></div>
          </div>
        </div>
        <div class="srf maMs">
          <span class="slab">MASTER</span>
          <div id="msSlot"></div>
          <div class="maWheel">
            <span class="lb">LEVEL</span>
            <div class="wheel" id="lvlWheel" title="Dimmer of the selection (Shift = fine)"></div>
            <span class="lb" id="lvlVal">—</span>
          </div>
        </div>
      </div>
      <div class="maRest"></div>
      <div class="maFront">LUMA DESK · LIGHTING CONSOLE</div>
    </div>
  </div>
</section>`;
