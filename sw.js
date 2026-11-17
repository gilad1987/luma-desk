// LUMA DESK service worker — offline app shell, stale-while-revalidate for everything else.
const CACHE = 'luma-desk-v10';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon.png',
  './vendor/three/three.module.js',
  './vendor/three/addons/controls/OrbitControls.js',
  './vendor/three/addons/postprocessing/EffectComposer.js', './vendor/three/addons/postprocessing/RenderPass.js',
  './vendor/three/addons/postprocessing/UnrealBloomPass.js', './vendor/three/addons/postprocessing/OutputPass.js',
  './vendor/three/addons/postprocessing/ShaderPass.js', './vendor/three/addons/postprocessing/MaskPass.js', './vendor/three/addons/postprocessing/Pass.js',
  './vendor/three/addons/shaders/CopyShader.js', './vendor/three/addons/shaders/LuminosityHighPassShader.js', './vendor/three/addons/shaders/OutputShader.js',
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
