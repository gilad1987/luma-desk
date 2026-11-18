import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { cacheName } from './cacheName.ts';
import { injectManifest } from './injectManifest.ts';
import { readPublicFiles } from './readPublicFiles.ts';
import { shellUrls } from './shellUrls.ts';
import type { ShippedFile } from './shippedFile.ts';

/** The worker source, from the project root. */
const WORKER_SOURCE = 'sw.ts';
/** The worker output: src/main.ts registers 'sw.js', and the worker's folder (the dist root) is its scope. */
const WORKER_FILE = 'sw.js';

/**
 * Builds sw.ts into dist/sw.js and writes into it the list of files to cache and a cache name made from their
 * content (ADR 0003), so neither is edited by hand again. Build only: in `npm run dev`, Vite answers /sw.js with the
 * transformed module sw.ts. It contains `export {}`, which a classic worker (src/io/serviceWorkerRegistration.ts
 * registers 'sw.js' without `type: 'module'`) cannot parse, and the placeholders are not written in. So the
 * registration fails, src/io/serviceWorkerRegistration.ts ignores the failure (quirk I10, orig:2916), and the dev
 * server never serves stale files.
 */
export function swManifestPlugin(): Plugin {
  let root = '';
  let publicDir = '';
  return {
    name: 'luma-desk:sw-manifest',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      publicDir = config.build.copyPublicDir ? config.publicDir : '';
    },
    buildStart() {
      this.emitFile({ type: 'chunk', id: resolve(root, WORKER_SOURCE), fileName: WORKER_FILE });
    },
    // post: index.html and the CSS files enter the bundle in other plugins' generateBundle hooks
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const worker = bundle[WORKER_FILE];
        if (worker?.type !== 'chunk') return this.error(`${WORKER_FILE} is not in the bundle`);
        // a classic worker cannot load other chunks: code that sw.ts shares with the app must not split out
        if (worker.imports.length > 0 || worker.dynamicImports.length > 0)
          return this.error(`${WORKER_FILE} imports other chunks; it must be self-contained`);
        const shipped: ShippedFile[] = Object.values(bundle)
          .filter((file) => file !== worker)
          .map((file) => ({ name: file.fileName, content: file.type === 'chunk' ? file.code : file.source }));
        shipped.push(...readPublicFiles(publicDir));
        const cache = cacheName([...shipped, { name: WORKER_FILE, content: worker.code }]);
        worker.code = injectManifest(worker.code, { shell: shellUrls(shipped.map((file) => file.name)), cache });
      },
    },
  };
}
