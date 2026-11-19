/** One fixture's GDTF file and the entry paths of the model files its body names. */
interface MeshPick {
  readonly info: { readonly fileName: string } | undefined;
  readonly paths: readonly string[];
}

/** The model files to unpack, by GDTF archive name: each file is read once for all the fixtures that share it. */
export function meshUses(picks: readonly MeshPick[]): Map<string, Set<string>> {
  const uses = new Map<string, Set<string>>();
  for (const { info, paths } of picks) {
    if (info === undefined) continue;
    const wanted = uses.get(info.fileName) ?? new Set<string>();
    paths.forEach((path) => wanted.add(path));
    uses.set(info.fileName, wanted);
  }
  return uses;
}
