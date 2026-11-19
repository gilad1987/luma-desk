/** A lookup texture of the SMAA pass: its image is an `<img>` that three.js fills from a data URI. */
interface Lookup {
  readonly image: unknown;
  needsUpdate: boolean;
}

const canDecode = (image: unknown): image is { decode(): Promise<void> } =>
  typeof image === 'object' && image !== null && 'decode' in image && typeof image.decode === 'function';

async function decoded(texture: Lookup): Promise<void> {
  if (!canDecode(texture.image)) return;
  // an image that cannot be decoded leaves the pass as three.js made it: the chain still draws
  await texture.image.decode().catch(() => undefined);
  texture.needsUpdate = true;
}

/**
 * Resolves when the two lookup images of an SMAA pass are decoded and marked for upload. three.js loads them from
 * data URIs and marks them in `onload`, some time after the pass exists; a frame drawn before that has no edge
 * smoothing. So the first frames of a chain differed from run to run by wall-clock time (about 1,900 edge pixels
 * in the bit-exact FOH screenshot), and a user saw the edges change a moment after the first MVR frame.
 */
export async function smaaReady(pass: { readonly areaTexture: Lookup; readonly searchTexture: Lookup }): Promise<void> {
  await Promise.all([decoded(pass.areaTexture), decoded(pass.searchTexture)]);
}
