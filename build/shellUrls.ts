/**
 * The URLs the worker caches at install. They stay relative, as in the old hand-written list, so they resolve
 * against the worker's own folder and work under a sub-path such as /luma-desk/. './' comes first because the
 * installed app starts at the folder URL, not at index.html. Sorted, so one build always gives one list. Names are not
 * passed through `encodeURI`, as in the old list (quirk I11, orig:sw.js:3).
 */
export function shellUrls(fileNames: readonly string[]): string[] {
  return ['./', ...[...fileNames].sort().map((name) => `./${name}`)];
}
