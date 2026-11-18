/** Shaders stay plain .glsl files; Vite's `?raw` suffix inlines their source as a string at build time. */
declare module '*.glsl?raw' {
  const source: string;
  export default source;
}
