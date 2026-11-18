import { describe, expect, it } from 'vitest';
import { MAX_FILE_LINES, countLines, findOversizedFiles, isLineChecked } from '../../scripts/lineLimit.ts';

const linesOf = (n: number): string => 'a{}\n'.repeat(n);

describe('countLines', () => {
  it('does not count the newline at the end of the file as a line', () => {
    expect(countLines('a\nb\n')).toBe(2);
    expect(countLines('a\nb')).toBe(2);
  });

  it('counts blank lines and treats an empty file as zero lines', () => {
    expect(countLines('a\n\n\nb\n')).toBe(4);
    expect(countLines('')).toBe(0);
  });

  it('counts Windows line endings once', () => {
    expect(countLines('a\r\nb\r\n')).toBe(2);
  });
});

describe('findOversizedFiles', () => {
  it('reports .css and .glsl files over the limit with their line count', () => {
    const files = [
      { path: 'src/styles/big.css', text: linesOf(MAX_FILE_LINES + 1) },
      { path: 'src/render/shaders/beam.glsl', text: linesOf(MAX_FILE_LINES + 5) },
    ];
    expect(findOversizedFiles(files)).toEqual([
      { path: 'src/styles/big.css', lines: MAX_FILE_LINES + 1 },
      { path: 'src/render/shaders/beam.glsl', lines: MAX_FILE_LINES + 5 },
    ]);
  });

  it('reports .html and .yml files over the limit', () => {
    const files = [
      { path: 'index.html', text: linesOf(MAX_FILE_LINES + 1) },
      { path: '.github/workflows/deploy.yml', text: linesOf(MAX_FILE_LINES + 2) },
    ];
    expect(findOversizedFiles(files)).toEqual([
      { path: 'index.html', lines: MAX_FILE_LINES + 1 },
      { path: '.github/workflows/deploy.yml', lines: MAX_FILE_LINES + 2 },
    ]);
  });

  it('accepts a file of exactly the limit', () => {
    expect(findOversizedFiles([{ path: 'src/styles/ok.css', text: linesOf(MAX_FILE_LINES) }])).toEqual([]);
  });

  it('leaves .ts files to ESLint max-lines', () => {
    expect(findOversizedFiles([{ path: 'src/main.ts', text: linesOf(MAX_FILE_LINES * 3) }])).toEqual([]);
  });
});

describe('isLineChecked', () => {
  it('selects the hand-written markup, styles, shaders and workflows', () => {
    const paths = ['a.css', 'a.scss', 'a.glsl', 'index.html', 'deploy.yml'];
    expect(paths.filter(isLineChecked)).toEqual(paths);
  });

  it('skips TypeScript and the JSON and PNG baselines', () => {
    const paths = ['a.ts', 'tests/golden/rig.json', 'tests/e2e/__screenshots__/a.png'];
    expect(paths.filter(isLineChecked)).toEqual([]);
  });
});
