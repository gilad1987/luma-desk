/**
 * Passes a value through JSON, as saving and loading do: undefined fields go and -0 becomes 0. Comparing round-tripped
 * values with toStrictEqual then checks exactly what a save would keep, and nothing JSON cannot hold.
 */
export const jsonRoundTrip = (value: unknown): unknown => JSON.parse(JSON.stringify(value)) as unknown;
