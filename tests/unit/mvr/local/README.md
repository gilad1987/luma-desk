# Local-only MVR tests

These tests read files that may not be committed: the official MVR samples and the MVR schema have no licence that
allows it, and the reference show is private. Each test skips when its input is absent, so `npm test` and CI stay
green and offline.

## Samples and round trip (`samples.test.ts`, `roundTrip.test.ts`)

1. Put the `.mvr` files in one folder, outside the repo. The official samples are at
   `https://www.gdtf.eu/mvr_files/<name>.mvr` (for example `Basic_Festival`, `Messy_Patch`, `Simple_Show`).
2. Run the tests with the folder in `MVR_SAMPLES_DIR`:

   ```sh
   MVR_SAMPLES_DIR=/path/to/samples npx vitest run tests/unit/mvr/local/ --silent=false
   ```

Every `.mvr` file must import without an error and survive export and a second import with the same fixture count,
ids, patches and positions (within 1 mm). The counts of each file (fixtures, patched, missing GDTF, placements,
objects, layers, warnings by code) are logged; `--silent=false` shows them for passing tests too.

To also check the private reference show against the numbers in the plan, set `MVR_REFERENCE_SHOW` to its file name
inside `MVR_SAMPLES_DIR`. Set it on the command line only, so its name is never written into a committed file:

```sh
MVR_SAMPLES_DIR=/path/to/samples MVR_REFERENCE_SHOW='<file name>.mvr' npx vitest run tests/unit/mvr/local/
```

## Schema (`xsd.test.ts`)

1. Download the pinned `mvr.xsd` once (it checks the SHA-256 and writes the gitignored `.cache/mvr/mvr.xsd`):

   ```sh
   npm run fetch:mvr-xsd
   ```

2. Run `npx vitest run tests/unit/mvr/local/xsd.test.ts`.

Every template and an imported third-party design are exported and validated with `xmllint-wasm`. The only error
allowed is the one on `<Data>`: the desk keeps its JSON in `<UserData><Data>`, as Vectorworks does.
