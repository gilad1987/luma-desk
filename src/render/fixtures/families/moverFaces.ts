import type { MoverBody } from '../../../domain/fixtureProducts/FixtureProduct';
import type { CanvasPainter } from '../../shared';
import { MOVER_LENS_FACES } from '../lens/moverLensFaces';
import { concentricCells } from './cellFaces';

/**
 * The painter of a mover lens face: 'rings' is the FORTE's zoom lens, 'hotspot' the MegaPointe's, a `cells` face one
 * domed lens per cell (`cellFaces.ts`). The caller paints it lazily, through `LazyLensTextures`.
 */
export function moverFacePainter(face: MoverBody['face']): CanvasPainter {
  switch (face) {
    case 'rings':
      return MOVER_LENS_FACES.forte;
    case 'hotspot':
      return MOVER_LENS_FACES.megapointe;
    default:
      return concentricCells(face.cells);
  }
}
