/** The camera presets of the gallery, each framed on the pair it shows. */
export const GALLERY_VIEWS = ['front34', 'side', 'below', 'floor'] as const;

/** One camera preset of the gallery. */
export type GalleryView = (typeof GALLERY_VIEWS)[number];

/** What the gallery shows; the URL holds it, so a shot is one address and the controls only rewrite it. */
export interface GalleryParams {
  readonly id: string;
  readonly view: GalleryView;
  readonly isLit: boolean;
  /** The pose in degrees, set as the desk does: on a moving head's joints, on a static light's pivot. */
  readonly pan: number;
  readonly tilt: number;
}

const isGalleryView = (v: string): v is GalleryView => GALLERY_VIEWS.some((view) => view === v);

function readDegrees(query: URLSearchParams, key: string): number {
  const degrees = Number(query.get(key) ?? 0);
  return Number.isFinite(degrees) ? degrees : 0;
}

/** Reads `?id=&view=&lit=1&pan=&tilt=`; a missing or unknown view is `front34`, a bad angle is 0. */
export function readGalleryParams(search: string): GalleryParams {
  const query = new URLSearchParams(search);
  const view = query.get('view') ?? '';
  return {
    id: query.get('id') ?? '',
    view: isGalleryView(view) ? view : 'front34',
    isLit: query.get('lit') === '1',
    pan: readDegrees(query, 'pan'),
    tilt: readDegrees(query, 'tilt'),
  };
}

/** The search string that shows `params`; a dark lens and a rest pose stay out of it. */
export function writeGallerySearch(params: GalleryParams): string {
  const query = new URLSearchParams({ id: params.id, view: params.view });
  if (params.isLit) query.set('lit', '1');
  if (params.pan !== 0) query.set('pan', String(params.pan));
  if (params.tilt !== 0) query.set('tilt', String(params.tilt));
  return `?${query.toString()}`;
}
