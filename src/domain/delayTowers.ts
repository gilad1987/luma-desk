/**
 * The bases of the two delay speaker towers in the audience as [x, z], in metres. The 3D venue model stands the towers
 * there and the crowd layout leaves those spots free of chairs, so both read this one source and cannot drift apart.
 */
export const DELAY_TOWERS: readonly (readonly [x: number, z: number])[] = [
  [-24, 33],
  [24, 33],
];
