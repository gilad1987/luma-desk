/**
 * What the MVR controls ask the desk to do. It is the boundary between the DOM controls and the app wiring
 * (`src/app/mvr`), which owns the stage service, the stored files and the 3D scenery that ui may not import.
 */
export interface MvrActions {
  /**
   * Queues the import of a picked `.mvr` file after every MVR load that still runs. It queues synchronously, so a
   * caller that waits for the loads right after the pick waits for this file too.
   */
  importFile(file: File): void;
  /** Queues the return to the built-in stage, so a load that still runs cannot draw over it. */
  loadDemoRig(): void;
  /**
   * Queues the `.mvr` download of the active stage after every MVR load that still runs, so a click right after a
   * pick exports the imported design, not the one before it.
   */
  exportMvr(): void;
}
