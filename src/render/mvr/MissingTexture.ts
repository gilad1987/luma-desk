import { Texture } from 'three';

/**
 * The texture the import gives a part whose image file the archive lacks. GLTFLoader plugins must answer a texture
 * request with a texture, so this empty one stands for "no picture"; `styleScenery` reads it as untextured and gives
 * the part the dark matte stage look. It is a class, not a shared instance, because GLTFLoader clones a texture for a
 * second UV set or a texture transform, and `clone` keeps the class.
 */
export class MissingTexture extends Texture {}
