/**
 * An operator mistake in a command line. The original threw plain strings and logged `String(err)`; this class keeps
 * the bare text for the log while engine faults (quirk C2's `TypeError`) still log with their `TypeError:` prefix.
 */
export class CommandError extends Error {}
