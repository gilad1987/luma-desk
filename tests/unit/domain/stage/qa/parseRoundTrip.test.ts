/**
 * QA3: parseStageDesign on stored JSON. Owns the round trip of every template, inputs that are not objects and
 * prototype keys. The single-rule rejections are owned by parse*.test.ts; random damage by parseFuzz.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { parseStageDesign } from '../../../../../src/domain/stage/parse/parseStageDesign.ts';
import { createTemplate, TEMPLATE_IDS } from '../../../../../src/domain/stage/templates/index.ts';

/** JSON text with numbers rounded to 1e-9, so -0 and the last bit of a re-normalized quaternion compare equal. */
function canonical(value: unknown): unknown {
  const round = (_: string, v: unknown): unknown => (typeof v === 'number' ? Math.round(v * 1e9) / 1e9 + 0 : v);
  return JSON.parse(JSON.stringify(value, round));
}

describe('QA3 parseStageDesign round trip', () => {
  it.each(TEMPLATE_IDS)('parses the stored JSON of the %s template back to the same design', (id) => {
    const template = createTemplate(id);
    const result = parseStageDesign(JSON.parse(JSON.stringify(template)));
    expect(result.ok ? canonical(result.design) : result.errors).toStrictEqual(canonical(template));
  });

  it.each(TEMPLATE_IDS)('gives the same design when the %s template is parsed a second time', (id) => {
    const first = parseStageDesign(JSON.parse(JSON.stringify(createTemplate(id))));
    const second = first.ok ? parseStageDesign(JSON.parse(JSON.stringify(first.design))) : first;
    expect(second).toStrictEqual(first);
  });
});

describe('QA3 parseStageDesign on a value that is not an object', () => {
  it.each([
    ['null', null, 'null'],
    ['a number', 5, '5'],
    ['a string', 'x', '"x"'],
    ['an array', [], 'an array of 0'],
    ['undefined', undefined, 'undefined'],
    ['a boolean', true, 'true'],
  ])('rejects %s with one error that names the value', (_, raw, shown) => {
    expect(parseStageDesign(raw)).toStrictEqual({ ok: false, errors: [`stage: expected an object, got ${shown}`] });
  });
});

describe('QA3 parseStageDesign prototype keys', () => {
  const POLLUTED = '{"__proto__":{"polluted":1,"v":1},"constructor":{"prototype":{"polluted":1}}}';

  it('drops __proto__ and constructor at the top level and pollutes no prototype', () => {
    const raw: unknown = JSON.parse(`${POLLUTED.slice(0, -1)},${JSON.stringify(createTemplate('theatre')).slice(1)}`);
    const result = parseStageDesign(raw);
    const keys = result.ok ? Object.getOwnPropertyNames(result.design) : result.errors;
    expect([keys.includes('__proto__'), keys.includes('constructor'), 'polluted' in {}]).toStrictEqual([
      false,
      false,
      false,
    ]);
  });

  it('drops __proto__ and constructor inside a fixture, a truss and the deck', () => {
    type Stored = { fixtures: object[]; trusses: object[]; deck: object };
    const json = JSON.parse(JSON.stringify(createTemplate('theatre'))) as Stored;
    const extra: unknown = JSON.parse(POLLUTED);
    for (const o of [json.fixtures[0], json.trusses[0], json.deck]) if (o) Object.assign(o, extra);
    const result = parseStageDesign(json);
    const d = result.ok ? result.design : undefined;
    const parts: object[] = d ? [d.fixtures[0] ?? {}, d.trusses[0] ?? {}, d.deck] : [];
    const own = parts
      .flatMap((p) => Object.getOwnPropertyNames(p))
      .filter((k) => k === '__proto__' || k === 'constructor');
    expect([parts.length, own, parts.map((p) => Object.getPrototypeOf(p) === Object.prototype)]).toStrictEqual([
      3,
      [],
      [true, true, true],
    ]);
  });

  it('does not take v from a __proto__ key, so a design with only a polluted version is rejected', () => {
    const result = parseStageDesign(JSON.parse(POLLUTED));
    expect(result).toStrictEqual({ ok: false, errors: ['v: unknown stage version undefined'] });
  });
});
