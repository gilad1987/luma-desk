/** What is known of an image when its screen is built; a size may still be unknown while the image decodes. */
export interface ImageFacts {
  readonly name?: string | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
}

/**
 * Resource names of images a CAD program writes when the designer gave the screen no source. Vectorworks exports
 * its own logo ("Vectorworks Logo ....png") as the default image of a video screen; the other words are the usual
 * names of test cards. Such an image is not show content.
 */
const PLACEHOLDER_NAME = /vectorworks[\s_-]*logo|(^|[\s_./-])(placeholder|test[\s_-]*(pattern|card|image))([\s_.-]|$)/i;

/**
 * An image this small on both sides cannot be content: it is a colour swatch or a stub. One small side alone says
 * nothing: a 1920 x 16 image is the content of an LED strip.
 */
const TINY_PIXELS = 16;

/**
 * True for an image that stands for "no content": a known CAD placeholder by its resource name, or a tiny image.
 * The screen then shows the desk's generated content, as a screen without an image does, and the summary counts it.
 */
export function isPlaceholderImage(image: ImageFacts): boolean {
  if (image.name !== undefined && PLACEHOLDER_NAME.test(image.name)) return true;
  const { width, height } = image;
  if (width === undefined || height === undefined || width <= 0 || height <= 0) return false;
  return Math.max(width, height) <= TINY_PIXELS;
}

/** The file images the stage now built replaced with generated content, for the summary; one stage at a time. */
let replaced = new Set<unknown>();

/** Starts the count of a new stage. */
export function resetReplacedImages(): void {
  replaced = new Set();
}

/** Counts `image` as replaced; the same image on many screens counts once. */
export function noteReplacedImage(image: unknown): void {
  replaced.add(image);
}

/** How many file images the stage now built shows generated content for. */
export function replacedImages(): number {
  return replaced.size;
}
