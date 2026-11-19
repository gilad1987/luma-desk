/**
 * The size limits every builder size field shares (deck, LED wall, truss), so the three panels cannot drift apart.
 * Each panel keeps its own maximum, because a deck, a wall and a truss have different real-world limits.
 */

/** The smallest size a size field sends, in metres: below it the domain's checks or the renderer have nothing to draw. */
export const MIN_SIZE_M = 0.1;

/** The arrow-key step of a size field, in metres: half-metre steps match the 0.5 m grid of the plan. */
export const SIZE_STEP_M = 0.5;
