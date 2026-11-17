/**
 * The command area (feedback, input, the eight keys), byte for byte as the original page had it. The line breaks
 * inside `.keys` are kept: between inline buttons they render as the gap between the two rows of keys.
 */
export const commandLineMarkup = [
  '<div id="cmdArea">\n      ',
  '<div id="cmdFb"><div>Welcome. Type commands like <span class="ok">Fixture 201 Thru 224 At Full</span></div></div>',
  '\n      <div class="cmdrow"><span>[Channel]&gt;</span>',
  '<input id="cmd" autocomplete="off" spellcheck="false" placeholder="Group 2 At 80"></div>\n      ',
  '<div class="keys">\n        ',
  '<button class="store" id="kStore">STORE</button><button id="kClear">CLEAR</button>',
  '<button id="kHigh">HIGHLT</button><button id="kFan">FAN</button>\n        ',
  '<button id="kAll">ALL</button><button id="kOdd">ODD</button>',
  '<button id="kEven">EVEN</button><button id="kRev">REVERSE</button>\n      ',
  '</div>\n    ',
  '</div>',
].join('');
