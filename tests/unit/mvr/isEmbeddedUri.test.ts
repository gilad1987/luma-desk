/**
 * One rule for a URI that names no archive file, used by the import and by render (`OfflineLoadingManager`). The
 * bug it guards: the import treating `DATA:` as inline while render sent it to the empty data URL.
 */
import { describe, expect, it } from 'vitest';
import { isEmbeddedUri } from '../../../src/mvr/index.ts';

describe('isEmbeddedUri', () => {
  it('knows data: and blob: URIs in any case, and no file name', () => {
    const uris = ['data:,x', 'DATA:,x', 'Blob:http://h/1', 'blob:http://h/1', 'wood.png', './data.png'];
    expect(uris.map(isEmbeddedUri)).toEqual([true, true, true, true, false, false]);
  });
});
