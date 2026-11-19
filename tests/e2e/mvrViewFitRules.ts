/** A rectangle of `__desk.test.viewFit()`, in CSS pixels of the page. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** How large the rig is in a view that shows the house too, against the least its rule allows: 1 or more passes. */
type StageFill = (rig: Rect, free: Rect) => number;

/**
 * Every view holds the rig box in frame. FOH, Front and Side fill the frame with it (`null`). Wide and Top show the
 * house too, the stage first: the rig takes at least 40 % of the free width or 55 % of its height in Wide, and its
 * longer side at least 40 % of the shorter frame side in Top.
 */
export const VIEWS: readonly (readonly [string, StageFill | null])[] = [
  ['foh', null],
  ['front', null],
  ['side', null],
  ['wide', (rig, free) => Math.max(rig.width / free.width / 0.4, rig.height / free.height / 0.55)],
  ['top', (rig, free) => Math.max(rig.width, rig.height) / (0.4 * Math.min(free.width, free.height))],
];

/** The measured stage share may miss the rule by this much: the rectangle is read from the drawn frame. */
export const SHARE_SLACK = 0.02;

/** The empty share of the free rectangle on each side of `box`; negative where the box passes the side. */
export const marginsOf = (box: Rect, free: Rect): Record<string, number> => ({
  left: (box.x - free.x) / free.width,
  right: (free.x + free.width - box.x - box.width) / free.width,
  top: (box.y - free.y) / free.height,
  bottom: (free.y + free.height - box.y - box.height) / free.height,
});
