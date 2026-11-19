import { describe, expect, it } from 'vitest';
import {
  determinant,
  makeMvr,
  parseXml,
  probeMvr,
  probeScene,
  RENDER_RIG_FIXTURES,
  renderStageMvr,
  sceneXml,
} from '../../shared';

// Every expected value below is worked out by hand from the spec's rule p → p.x·u + p.y·v + p.z·w + o.
const m = (u: string, v: string, w: string, o: string): string => `<Matrix>{${u}}{${v}}{${w}}{${o}}</Matrix>`;
const at = (o: string): string => m('1,0,0', '0,1,0', '0,0,1', o);
const ROT_Z90 = (o: string): string => m('0,1,0', '-1,0,0', '0,0,1', o);
const ROT_X90 = (o: string): string => m('1,0,0', '0,0,1', '0,-1,0', o);
const layer = (inner: string, matrix = ''): string =>
  `<Layer uuid="L">${matrix}<ChildList>${inner}</ChildList></Layer>`;
const group = (uuid: string, matrix: string, inner: string): string =>
  `<GroupObject uuid="${uuid}">${matrix}<ChildList>${inner}</ChildList></GroupObject>`;
const fixture = (uuid: string, matrix: string): string => `<Fixture uuid="${uuid}" name="x">${matrix}</Fixture>`;

describe('probeScene', () => {
  it('composes nested rotated groups', () => {
    const inner = group('B', ROT_X90('0,500,0'), fixture('F', at('100,0,0')));
    const [f] = probeScene(sceneXml(layer(group('A', ROT_Z90('1000,0,0'), inner)))).fixtures;
    // B places (100,0,0) at (100,500,0); A turns that to 100·(0,1,0) + 500·(-1,0,0) and adds (1000,0,0)
    expect(f?.position).toEqual([500, 100, 0]);
    expect(f?.matrix).toMatchObject({ u: [0, 1, 0], v: [0, 0, 1], w: [1, 0, 0] });
  });

  it('keeps a mirrored matrix mirrored, for the object and its mesh', () => {
    const geometry = `<Geometries><Geometry3D fileName="a.3ds">${at('100,0,0')}</Geometry3D></Geometries>`;
    const obj = `<SceneObject uuid="S">${m('-1,0,0', '0,1,0', '0,0,1', '10,20,30')}${geometry}</SceneObject>`;
    const probe = probeScene(
      sceneXml(layer(group('G', at('5,0,0'), obj + fixture('F', m('-1,0,0', '0,1,0', '0,0,1', '1,2,3'))))),
    );
    expect(probe.meshes.map((x) => [x.owner, x.fileName, x.matrix.o, x.matrix.u])).toEqual([
      ['S', 'a.3ds', [-85, 20, 30], [-1, 0, 0]],
    ]);
    expect(probe.fixtures[0]?.position).toEqual([6, 2, 3]);
    expect(probe.fixtures.map((f) => determinant(f.matrix))).toEqual([-1]);
  });

  it('applies a layer matrix', () => {
    const [f] = probeScene(sceneXml(layer(fixture('F', at('1,2,3')), at('0,0,1000')))).fixtures;
    expect(f?.position).toEqual([1, 2, 1003]);
  });

  it('places symbols inside symbols', () => {
    const symdefs =
      `<Symdef uuid="OUTER"><ChildList><Geometry3D fileName="a.3ds"/>` +
      `<Symbol uuid="s2" symdef="INNER">${at('0,100,0')}</Symbol></ChildList></Symdef>` +
      `<Symdef uuid="INNER"><ChildList><Geometry3D fileName="b.3ds">${at('10,0,0')}</Geometry3D></ChildList></Symdef>`;
    const symbol = `<Geometries><Symbol uuid="s1" symdef="OUTER">${at('0,0,50')}</Symbol></Geometries>`;
    const obj = `<SceneObject uuid="S">${ROT_Z90('1000,0,0')}${symbol}</SceneObject>`;
    const { meshes } = probeScene(sceneXml(layer(obj), symdefs));
    // object: turn Z 90 at (1000,0,0); s1 at (1000,0,50); s2: 100·(-1,0,0) more; b.3ds: 10·(0,1,0) more
    expect(meshes.map((x) => [x.fileName, x.matrix.o])).toEqual([
      ['a.3ds', [1000, 0, 50]],
      ['b.3ds', [900, 10, 50]],
    ]);
    expect(meshes.every((x) => x.matrix.u.join() === '0,1,0')).toBe(true);
  });

  it('stops a Symdef that contains itself', () => {
    const symdefs = '<Symdef uuid="LOOP"><ChildList><Symbol uuid="s" symdef="LOOP"/></ChildList></Symdef>';
    const obj = '<SceneObject uuid="S"><Geometries><Symbol uuid="s0" symdef="LOOP"/></Geometries></SceneObject>';
    expect(() => probeScene(sceneXml(layer(obj), symdefs))).toThrow(/nest deeper/);
  });
});

describe('probeMvr', () => {
  it('reads a whole archive: the render stage has 40 fixtures, spot 101 on the truss', () => {
    const { fixtures } = probeMvr(renderStageMvr());
    expect(fixtures).toHaveLength(RENDER_RIG_FIXTURES);
    expect(fixtures[0]).toMatchObject({ uuid: 'F-101', position: [-6000, -3000, 7200] });
  });

  it('throws for an archive without a scene file', () => {
    expect(() => probeMvr(makeMvr('', {}).slice(0, 0))).toThrow();
  });
});

describe('parseXml', () => {
  it('skips comments and declarations, decodes entities and survives a stray close tag', () => {
    const doc = parseXml("<?xml version='1.0'?><!-- c --><a x='1 &amp; 2'><b/>t&lt;&#65;</c></a>");
    expect(doc.children[0]).toMatchObject({ tag: 'a', attrs: { x: '1 & 2' }, text: 't<A' });
    expect(doc.children[0]?.children.map((c) => c.tag)).toEqual(['b']);
  });
});
