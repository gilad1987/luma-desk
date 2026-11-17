/**
 * Owns the download-name stamp and the temporary-link download. Whether the browser really saves the file is
 * owned by the Playwright suite.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob, downloadJson, stamp } from '../../../src/io/download';

describe('stamp', () => {
  it('formats local time as yyyymmdd-hhmm with zero padding', () => {
    // the Date is built from local fields, so the result is the same in every time zone
    expect([stamp(new Date(2026, 0, 5, 7, 3)), stamp(new Date(2026, 11, 31, 23, 59))]).toEqual([
      '20260105-0703',
      '20261231-2359',
    ]);
  });
});

describe('downloadBlob', () => {
  const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
  const appendChild = vi.fn();
  let createUrl: ReturnType<typeof vi.fn>, revokeUrl: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('document', { createElement: () => link, body: { appendChild } });
    createUrl = vi.fn(() => 'blob:show');
    revokeUrl = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('clicks a link to the blob and cleans it up 2000 ms later', () => {
    downloadBlob(new Blob(['x']), 'a.webm');
    expect([link.href, link.download, appendChild.mock.calls[0]?.[0], link.click.mock.calls.length]).toEqual([
      'blob:show',
      'a.webm',
      link,
      1,
    ]);
    vi.advanceTimersByTime(1999);
    expect([revokeUrl.mock.calls.length, link.remove.mock.calls.length]).toEqual([0, 0]);
    vi.advanceTimersByTime(1);
    expect([revokeUrl.mock.calls[0]?.[0], link.remove.mock.calls.length]).toEqual(['blob:show', 1]);
  });

  it('saves show text as an application/json blob under the given name', async () => {
    downloadJson('luma-show-20260105-0703.json', '{"v":1}');
    const blob: unknown = createUrl.mock.calls[0]?.[0];
    if (!(blob instanceof Blob)) throw new Error('downloadJson did not create a Blob');
    expect([blob.type, await blob.text(), link.download]).toEqual([
      'application/json',
      '{"v":1}',
      'luma-show-20260105-0703.json',
    ]);
  });
});
