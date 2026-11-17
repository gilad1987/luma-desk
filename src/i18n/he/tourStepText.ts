/**
 * The text of one tour step. A step whose tools differ by layout carries both texts; the tour picks one when the step
 * is shown.
 */
export interface TourStepText {
  readonly title: string;
  readonly text: string | { readonly ma: string; readonly other: string };
}
