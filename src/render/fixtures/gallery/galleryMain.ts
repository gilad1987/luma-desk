/*
 * Entry of the dev-only fixture gallery (`gallery.html`); the spec `tests/gallery/productGallery.spec.ts` shoots it.
 */
import { isProductId, PRODUCT_IDS, PRODUCTS } from '../../../domain/fixtureProducts';
import { TYPES } from '../../../domain/fixtureTypes';
import { mountGalleryControls } from './galleryControls';
import { readGalleryParams, writeGallerySearch } from './galleryParams';
import { GalleryScene } from './GalleryScene';

/**
 * One catalogue product as the shot runner sees it: its id, the body family its shots are filed under, and whether
 * its base type moves (the runner poses only moving heads).
 */
interface GalleryId {
  readonly id: string;
  readonly family: string;
  readonly moving: boolean;
}

declare global {
  interface Window {
    galleryIds: readonly GalleryId[];
  }
}

window.galleryIds = PRODUCT_IDS.map((id) => ({
  id,
  family: PRODUCTS[id].body.family,
  moving: TYPES[PRODUCTS[id].base].moving,
}));

const params = readGalleryParams(location.search);
mountGalleryControls(document.body, params, (next) => {
  location.search = writeGallerySearch(next);
});

const canvas = document.querySelector('canvas');
if (!canvas) throw new Error('gallery.html: no canvas to draw on');
if (isProductId(params.id)) {
  const scene = new GalleryScene(canvas);
  scene.show(params.id, params);
  scene.start(() => {
    document.body.dataset['ready'] = '1';
  });
} else {
  const error = document.createElement('p');
  error.id = 'error';
  error.textContent = `Unknown product id "${params.id}". Pick one of: ${PRODUCT_IDS.join(', ')}`;
  document.body.append(error);
}
