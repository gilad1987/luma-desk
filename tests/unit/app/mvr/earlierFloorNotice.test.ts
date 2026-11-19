// @vitest-environment jsdom
/**
 * Owns the boot notice about floor fixtures in the earlier orientation: it warns that a new import mirrors the stored
 * pan and tilt, it is shown once per saved stage and again only when the count changes, and the boot restore shows it
 * through the browser store.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { noteEarlierFloorPoses } from '../../../../src/app/mvr/earlierFloorPoses';
import { restoreStoredMvr } from '../../../../src/app/mvr/restoreStoredMvr';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { he } from '../../../../src/i18n/he';
import { importMvr } from '../../../../src/mvr';
import { fakeMvrFlowDeps, gdtfMode, makeGdtf, makeMvr, sceneXml } from '../../../shared';

const HEAD = makeGdtf({
  geometries: '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>',
  modes: gdtfMode('Std', [['Dimmer', 'Offset="1"']]),
});
const unit = (id: number): string =>
  `<Fixture uuid="00000000-0000-4000-8000-00000000000${id}" name="turned over ${id}">` +
  `<Matrix>{1,0,0}{0,-1,0}{0,0,-1}{${id * 1000},0,0}</Matrix><GDTFSpec>Acme@Head</GDTFSpec><GDTFMode>Std</GDTFMode>` +
  `<FixtureID>${id}</FixtureID><Addresses><Address break="0">${id * 10}</Address></Addresses></Fixture>`;
const LAYER = `<Layer uuid="00000000-0000-4000-8000-000000000900" name="Rig"><ChildList>${unit(1)}${unit(2)}</ChildList></Layer>`;
const FILE = new Uint8Array(makeMvr(sceneXml(LAYER), { 'Acme@Head.gdtf': HEAD }));

/** The file as a stage saved before the import kept the body orientation: `keep` of its floor units have a rotation. */
async function stages(keep = 0): Promise<{ saved: StageDesign; fresh: StageDesign }> {
  const fresh = (await importMvr(FILE, { name: 'Rig.mvr' })).design;
  const fixtures = fresh.fixtures.map(({ id, type, role, trussId, position, mount, rotation }, index) => {
    const earlier = { id, type, role, trussId, position, mount };
    return index < keep && rotation ? { ...earlier, rotation } : earlier;
  });
  return { saved: { ...fresh, source: { kind: 'mvr', name: 'Rig.mvr', fileHash: 'h' }, fixtures }, fresh };
}
const memoryStore = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
};

describe('the notice about floor fixtures in the earlier orientation', () => {
  beforeEach(() => localStorage.clear());

  it('warns that a new import mirrors the stored pan and tilt', () => {
    expect(he.mvr.earlierFloorPoses(2)).toMatch(/^2 .*MVR.*Pan.*Tilt.*תמונת ראי/);
  });

  it('is shown once per saved stage, and again when the count changes', async () => {
    const [two, one] = [await stages(), await stages(1)];
    const [toasts, store] = [[] as string[], memoryStore()];
    const note = ({ saved, fresh }: typeof two): void =>
      noteEarlierFloorPoses(saved, fresh, (text) => toasts.push(text), store);
    [two, two, one, one].forEach(note);
    expect(toasts).toEqual([he.mvr.earlierFloorPoses(2), he.mvr.earlierFloorPoses(1)]);
  });

  it('is shown on every boot when the store cannot be read', async () => {
    const { saved, fresh } = await stages();
    const toasts: string[] = [];
    const blocked = {
      getItem: (): never => {
        throw new Error('blocked');
      },
      setItem: (): void => undefined,
    };
    [1, 2].forEach(() => noteEarlierFloorPoses(saved, fresh, (text) => toasts.push(text), blocked));
    expect(toasts).toHaveLength(2);
  });

  it('comes from the boot restore once: the second boot of the same stage is silent', async () => {
    const { saved } = await stages();
    for (const expected of [[he.mvr.earlierFloorPoses(2)], []]) {
      const flow = fakeMvrFlowDeps(saved);
      flow.store.get.mockResolvedValue(FILE);
      await restoreStoredMvr(flow.deps, flow.stage.design);
      expect(flow.toasts).toEqual(expected);
    }
  });
});
