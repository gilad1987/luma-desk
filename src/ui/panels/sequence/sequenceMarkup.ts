/** The Sequence pane, byte for byte as the original page had it; the panel fills `#seqSel` and `#seqTable`. */
export const sequenceMarkup = [
  '<div class="pane" id="pane-seq">\n        ',
  '<div id="seqHead"><select id="seqSel"></select><span class="sp"></span>',
  '<button id="seqBack">GO−</button><button id="seqGo">GO+</button><button id="seqDel">Delete Cue</button></div>\n        ',
  '<table id="seqTable"></table>\n        ',
  '<div class="seqHelp">Click a cue = Goto · Double-click name/fade to edit · ',
  'STORE then click a cue = merge programmer into it.</div>\n      ',
  '</div>',
].join('');
