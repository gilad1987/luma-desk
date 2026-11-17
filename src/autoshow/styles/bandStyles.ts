import type { AutoStyle } from '../AutoStyle';

/** The live-band styles: verse and chorus cycles, warm or bright colour, blinders on the big sections. */
export const BAND_STYLES = {
  rock: {
    name: 'Rock',
    fade: 0.3,
    bars: 8,
    pal: [
      ['Red', 'Amber'],
      ['Amber', 'White'],
      ['Blue', 'White'],
      ['Red', 'Blue'],
      ['CTO', 'Red'],
    ],
    pos: ['band', 'cross', 'audience', 'vOut'],
    fxPos: ['tilt', 'bally'],
    fxDim: ['dimChase'],
    rate: [0.5, 1],
    strobe: true,
    blinders: true,
    screen: [1, 2, 6],
    sections: ['verse', 'chorus'],
  },
  pop: {
    name: 'Pop',
    fade: 0.8,
    bars: 8,
    pal: [
      ['Pink', 'Lt Blue'],
      ['Magenta', 'Cyan'],
      ['Lavender', 'Amber'],
      ['Yellow', 'Magenta'],
      ['Congo', 'Pink'],
    ],
    pos: ['fanAud', 'band', 'skyFan', 'cross'],
    fxPos: ['circle', 'pan'],
    fxDim: ['dimSine'],
    fxCol: ['rainbow'],
    rate: [0.5, 1],
    strobe: false,
    blinders: true,
    screen: [3, 4, 6, 1],
    sections: ['verse', 'chorus'],
  },
} as const satisfies Record<string, AutoStyle>;
