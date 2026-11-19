# GDTF default meshes

A GDTF `Model` can name a `PrimitiveType` in place of a mesh file. The GDTF specification publishes the default mesh
of each such type. The app ships these files and draws them for a part that has no mesh file of its own.

## Source and licence

- Source: <https://github.com/mvrdevelopment/spec>, folder `meshes/` (`1.0/` and `1.1/`).
- State of the repository: commit of 2026-04-09, "Clarify usage rights for meshes in README".
- Licence sentence of the repository README: "The folder meshes contains the default meshes that are used by the GDTF
  spec. They are free to use, modify, and distribute, including in commercial applications, without any licensing fees
  or royalties."
- The files are copied unchanged into `public/gdtf-meshes/`, with the file names of the repository.

## Files

Counts and bounds are read from the files (`tests/unit/mvr/primitiveShapes.files.test.ts` holds the bounds). A mesh is
about one unit large. `Z` is up. `Z range` is given as a part of the mesh height, from the mesh origin.

| `PrimitiveType`   | File                                 | Bytes | Vertices | Triangles | Z range        | Y range (of width) |
| ----------------- | ------------------------------------ | ----- | -------- | --------- | -------------- | ------------------ |
| `Base`            | `primitivetype_base.3ds`             | 2637  | 48       | 76        | -0.50 to +0.50 | -0.50 to +0.50     |
| `Yoke`            | `primitivetype_yoke.3ds`             | 2367  | 40       | 68        | -0.50 to +0.50 | -0.50 to +0.50     |
| `Head`            | `primitivetype_head.3ds`             | 3159  | 71       | 80        | -0.50 to +0.50 | -0.50 to +0.50     |
| `Scanner`         | `primitivetype_scanner.3ds`          | 5165  | 105      | 182       | -0.50 to +0.50 | -0.71 to +0.29     |
| `Conventional`    | `primitivetype_conventional.3ds`     | 5035  | 125      | 234       | -0.49 to +0.51 | -0.67 to +0.33     |
| `Base1_1`         | `primitivetype_base_1.1.3ds`         | 2473  | 48       | 76        | -1.00 to 0     | -0.50 to +0.50     |
| `Scanner1_1`      | `primitivetype_scanner_1.1.3ds`      | 7199  | 145      | 258       | -1.00 to 0     | -0.67 to +0.33     |
| `Conventional1_1` | `primitivetype_conventional_1.1.3ds` | 5543  | 125      | 234       | -1.00 to 0     | -0.50 to +0.50     |

`Cube`, `Cylinder` and `Sphere` have no file: the app draws the plain solid. `Undefined` and `Pigtail` have no shape.

## Rules the app follows

- GDTF: "The mesh is explicitly scaled to this dimension. The length defines the dimension of the model on the X axis,
  the width on the Y axis and the height on the Z axis." Each mesh is scaled per axis to the model size, about the
  origin of the mesh.
- GDTF: "The mesh of each fixture part shall be drawn around its own suspension point." The first five meshes are
  centred on their origin.
- GDTF 1.1: "The default meshes for Base, Conventional and Scanner were updated. The origin of the meshes is now the
  mounting plate." These three hang below their origin.
- A model with a mesh file in the GDTF archive is drawn from that file. The default shape is for a model without one.
- Assumption: a plain solid is centred on its origin, and a cylinder stands on the Z axis. The GDTF text places neither.

## How the app uses them

- `src/mvr/gdtf/primitiveShapes.ts` holds the bounds of each shape. The import measures a body with them.
- `src/render/fixtures/gdtf/DefaultShapes.ts` loads a file when the first imported body needs it, once for the rig.
- The service worker caches `public/` at install, so the files are there offline.
