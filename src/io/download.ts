/** How long the object URL and the hidden link live after the click; the browser has started the download by then. */
const REVOKE_DELAY_MS = 2000;

/** Pads a date part to two digits. */
function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * The `yyyymmdd-hhmm` local-time stamp in download names, so repeated exports sort by time and do not overwrite each
 * other. Shared by the video recorder and the show-file dialog. `date` defaults to now; tests pass a fixed one.
 */
export function stamp(date: Date = new Date()): string {
  const day = `${date.getFullYear()}${padTwo(date.getMonth() + 1)}${padTwo(date.getDate())}`;
  return `${day}-${padTwo(date.getHours())}${padTwo(date.getMinutes())}`;
}

/**
 * Saves `blob` as a download named `name` through a temporary link, the one way a page can start a download without
 * a server. The object URL is revoked and the link removed after {@link REVOKE_DELAY_MS}, so neither leaks.
 */
export function downloadBlob(blob: Blob, name: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, REVOKE_DELAY_MS);
}

/**
 * Saves `text` as an `application/json` download named `name`. It matches the show-file dialog's `download`
 * parameter, so main.ts passes it as is.
 */
export function downloadJson(name: string, text: string): void {
  downloadBlob(new Blob([text], { type: 'application/json' }), name);
}
