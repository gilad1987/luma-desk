// @vitest-environment jsdom
/** The URL rules of `OfflineLoadingManager`. The bug it guards: an upper-case `DATA:` URI sent to the empty URL. */
import { describe, expect, it } from 'vitest';
import { OfflineLoadingManager } from '../../../../src/render/mvr/OfflineLoadingManager.ts';

describe('OfflineLoadingManager', () => {
  it('passes an embedded URI through in any case and sends an unknown name to the empty data URL', () => {
    const manager = new OfflineLoadingManager(new Map());
    expect(['DATA:,abc', 'gone.png'].map((url) => manager.resolveURL(url))).toEqual(['DATA:,abc', 'data:,']);
  });
});
