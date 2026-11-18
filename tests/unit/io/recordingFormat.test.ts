/** Owns the recorder's pure choices: format preference, running-time label and file name. */
import { describe, expect, it } from 'vitest';
import { chooseMimeType, formatElapsed, recordingFileName, recordingType } from '../../../src/io/recordingFormat';

describe('chooseMimeType', () => {
  it('takes the first supported format in the original order', () => {
    const pick = (supported: string[]): string => chooseMimeType((type) => supported.includes(type));
    expect([
      pick(['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus']),
      pick(['video/mp4', 'video/webm;codecs=vp8,opus']),
      pick(['video/mp4', 'video/webm']),
      pick(['video/mp4']),
      pick([]),
    ]).toEqual(['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4', '']);
  });
});

describe('formatElapsed', () => {
  it('shows whole minutes and zero-padded seconds, rounding down', () => {
    expect([
      formatElapsed(0),
      formatElapsed(999),
      formatElapsed(9500),
      formatElapsed(61_000),
      formatElapsed(600_000),
    ]).toEqual(['0:00', '0:00', '0:09', '1:01', '10:00']);
  });
});

describe('recordingType and recordingFileName', () => {
  it('falls back to WebM and names the file by its container', () => {
    const date = new Date(2026, 10, 17, 9, 5);
    expect([
      recordingType(''),
      recordingType('video/mp4'),
      recordingFileName('video/mp4;codecs=avc1', date),
      recordingFileName('video/webm;codecs=vp9,opus', date),
    ]).toEqual(['video/webm', 'video/mp4', 'luma-desk-20261117-0905.mp4', 'luma-desk-20261117-0905.webm']);
  });
});
