// @vitest-environment jsdom
/** Third review, F0 and N9: one XML declaration in any browser, and a `&#13;` reference that survives two trips. */
import { strFromU8, unzipSync } from 'fflate';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { fx, passFile, passUuid as u } from '../../../shared/index.ts';

const sceneText = (bytes: Uint8Array): string =>
  strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array());
const load = async (original: Uint8Array): Promise<StageDesign> =>
  (await importMvr(original, { name: 'a.mvr' })).design;
const one = (extra = ''): string =>
  fx(u(1), 1, { addresses: '<Address break="0">1</Address>' }).replace('</UnitNumber>', `</UnitNumber>${extra}`);

/** A serializer that writes its own declaration for a document that had one, as Firefox does. */
function stubDeclaringSerializer(): void {
  const Real = XMLSerializer;
  class Declaring {
    serializeToString(node: Node): string {
      return `<?xml version="1.0" encoding="UTF-8"?>\n${new Real().serializeToString(node)}`;
    }
  }
  vi.stubGlobal('XMLSerializer', Declaring);
}

describe('pass-through scene text', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('writes one XML declaration when the serializer adds its own (F0)', async () => {
    const original = passFile(one());
    const design = await load(original);
    stubDeclaringSerializer();
    const { bytes } = exportMvr(design, { original });
    vi.unstubAllGlobals();
    const written = sceneText(bytes);
    expect(written.match(/<\?xml/g)).toHaveLength(1);
    expect(written.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<GeneralSceneDescription')).toBe(true);
    expect((await load(bytes)).fixtures).toHaveLength(1);
  });

  it('keeps a processing instruction that only starts like a declaration (F0)', async () => {
    const original = passFile(one());
    const design = await load(original);
    const Real = XMLSerializer;
    class Styled {
      serializeToString(node: Node): string {
        return `<?xml-stylesheet href="a.xsl"?>${new Real().serializeToString(node)}`;
      }
    }
    vi.stubGlobal('XMLSerializer', Styled);
    expect(sceneText(exportMvr(design, { original }).bytes)).toContain('<?xml-stylesheet href="a.xsl"?>');
  });

  it.each(['r&#13;n', 'a&#13;&#10;b'])(
    'writes the reference %s back, so a second trip is identical (N9)',
    async (text) => {
      const original = passFile(one(`<Function>${text}</Function>`));
      const first = exportMvr(await load(original), { original });
      const second = exportMvr(await load(first.bytes), { original: first.bytes });
      expect(sceneText(first.bytes)).toContain(`<Function>${text.replace('&#10;', '\n')}</Function>`);
      expect(sceneText(second.bytes)).toBe(sceneText(first.bytes));
    },
  );
});
