/**
 * The desk console shell: three wings with labelled slots. LayoutManager moves the panels into the slots; the info
 * labels are filled by the 250 ms info tick.
 */
export const DESK_CONSOLE_MARKUP = `<section id="console">
  <div class="cbody" id="cbody">
    <div class="cwing" id="cwScreen">
      <div class="clabel"><span>SCREEN</span><b id="cwScreenInfo"></b></div>
    </div>
    <div class="cwing ccenter" id="cwCenter">
      <div class="clabel"><span>PROGRAMMER</span><b id="cwProgInfo"></b></div>
      <div id="encSlot" style="min-height: 0"></div>
      <div class="clabel"><span>PLAYBACK</span><b id="cwPbInfo"></b></div>
      <div id="execSlot" style="min-height: 0; display: flex; flex-direction: column"></div>
    </div>
    <div class="cright">
      <div class="cwing" id="cwCmd">
        <div class="clabel"><span>COMMAND</span><b>MA syntax</b></div>
      </div>
      <div class="cwing" id="cwMaster">
        <div class="clabel"><span>MASTER</span></div>
      </div>
    </div>
  </div>
</section>`;
