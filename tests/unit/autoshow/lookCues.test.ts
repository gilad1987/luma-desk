import { describe, expect, it, vi } from 'vitest';
import { rng } from '../../../src/core';
import { buildRig } from '../../../src/domain/rig';
import { buildLookList } from '../../../src/autoshow/buildLookList';
import { LookGenerator } from '../../../src/autoshow/LookGenerator';
import { savedLookCue } from '../../../src/autoshow/savedLookCue';
import { STYLES } from '../../../src/autoshow/styles';
import { he } from '../../../src/i18n/he';
import { genLook, LEGACY_STYLES, legacyEnv, SEC_NAMES } from './oracle/legacyGenLook';

const rig = buildRig();
const options = { energy: 0.85, strobes: true, screen: true };

describe('auto look to cue', () => {
  it('saves the playing look as a numbered cue named by style word and section, without sec', () => {
    const look = new LookGenerator(rig, rng(3)).generate(STYLES.mizrahi, 'chorus', options);
    const cue = savedLookCue(look, 4, STYLES.mizrahi);
    expect(Object.keys(cue)).toEqual(['num', 'name', 'fade', 'vals', 'fx']);
    expect(cue.num).toBe(4);
    expect(cue.name).toBe('Mizrahi Chorus');
    expect(cue.vals).toEqual(look.vals);
    expect(cue.vals).not.toBe(look.vals);
    expect(look.sec).toBe('chorus');
  });

  it('names a look with an unknown section by the style word and a trailing space, as the original did', () => {
    const look = new LookGenerator(rig, rng(3)).generate(STYLES.rock, 'verse', options);
    delete look.sec;
    expect(savedLookCue(look, 1, STYLES.rock).name).toBe('Rock ');
  });

  it('builds the same 8-cue list as the original "build cue list"', () => {
    const cues = buildLookList(new LookGenerator(rig, rng(11)), STYLES.edm, options);
    vi.spyOn(Math, 'random').mockImplementation(rng(11));
    const env = legacyEnv(rig, options);
    const style = LEGACY_STYLES.edm;
    if (!style) throw new Error('oracle has no edm');
    const expected = [];
    for (let i = 0; i < 8; i++) {
      const sec = style.sections[i % style.sections.length] ?? '';
      const c: Partial<ReturnType<typeof genLook>> = genLook(env, style, sec);
      c.num = i + 1;
      c.name = `${SEC_NAMES[sec]} ${i + 1}`;
      delete c.sec;
      expected.push(c);
    }
    vi.restoreAllMocks();
    expect(JSON.stringify(cues)).toBe(JSON.stringify(expected));
    expect(cues.map((c) => c.name)).toEqual([
      'Groove 1',
      'Groove 2',
      'Build-up 3',
      'Drop 4',
      'Groove 5',
      'Groove 6',
      'Build-up 7',
      'Drop 8',
    ]);
  });

  it('keeps the original Hebrew taglines, one per style', () => {
    expect(Object.keys(he.autoStyleTaglines)).toEqual(Object.keys(STYLES));
    for (const [id, text] of Object.entries(he.autoStyleTaglines)) expect(text).toBe(LEGACY_STYLES[id]?.he);
  });
});
