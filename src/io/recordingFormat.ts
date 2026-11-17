import { stamp } from './download';

/** The recording formats in order of preference: WebM with VP9, then VP8, then any WebM, then MP4 (Safari). */
const PREFERRED_MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
/** The type assumed when the recorder does not report one. */
const FALLBACK_MIME_TYPE = 'video/webm';

/** The first preferred format the browser supports, or '' to let the browser choose. */
export function chooseMimeType(isSupported: (mimeType: string) => boolean): string {
  return PREFERRED_MIME_TYPES.find(isSupported) ?? '';
}

/** The REC button's running time, `m:ss`, from the elapsed milliseconds (whole seconds, rounded down). */
export function formatElapsed(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The blob type of a finished recording: what the recorder reported, else WebM. */
export function recordingType(reportedMimeType: string): string {
  return reportedMimeType || FALLBACK_MIME_TYPE;
}

/** The download name `luma-desk-<stamp>.mp4` or `.webm`, by the recording's type. */
export function recordingFileName(mimeType: string, date: Date = new Date()): string {
  return `luma-desk-${stamp(date)}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
}
