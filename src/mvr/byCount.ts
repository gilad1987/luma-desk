/**
 * `one` when `count` is 1, else `many`. Import warnings count fixtures and mesh files, and "1 fixture(s) have" reads
 * as a bug to the user; the caller passes whole phrases because the verb and the pronoun change with the noun.
 */
export const byCount = (count: number, one: string, many: string): string => (count === 1 ? one : many);
