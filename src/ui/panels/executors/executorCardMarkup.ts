/** One executor card, byte for byte as the original `buildExecs` template (newlines and indents included). */
export const executorCardMarkup = (
  n: number,
): string => `<div class="ex-top"><span class="ex-num">${n}</span><span class="ex-name"></span><button class="ex-off" title="Off">⏻</button><button class="ex-sel" title="Select">SEL</button></div>
      <div class="ex-cue"><span class="c"></span><span class="x"></span></div>
      <div class="ex-mid"><div class="fader"><div class="ff"></div><div class="cap"></div></div><div class="ex-btns"><button class="b-go">GO+</button><button class="b-back">GO−</button><button class="b-flash">FLASH</button></div></div>
      <div class="ex-lvl"></div>`;
