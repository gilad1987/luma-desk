/**
 * Hebrew words the MVR import reads in the layer and object names of a file, not text the desk shows. Hebrew plots
 * name their layers in Hebrew, so the rules that find LED surfaces, the venue hall and stage drapes need these words next to their
 * English ones; they live here because every Hebrew string of the source lives in the locale (rule I1).
 */
export const mvrNameWords = {
  /** "Screen" and "LED": a standing panel with one of them in its names is an LED surface (`isScreenPlacement`). */
  screen: ['מסך', 'לד'],
  /** "Hall": a layer with it is the venue around the stage and starts hidden. */
  hall: ['אולם'],
  /** "Wall", "walls", "floor" and "ceiling": a layer with one of them is the hall only when it reaches far past the rig. */
  structure: ['קיר', 'קירות', 'רצפה', 'תקרה'],
  /** "Curtain", "curtains", "closure" and "closures": an object with one of them is a stage drape. */
  drape: ['וילון', 'וילונות', 'סגירה', 'סגירות'],
  /** "Cloth screen", a curtain: "screen" alone is an LED surface, so only the pair is a drape. */
  drapePairs: [['מסך', 'בד']],
} as const;
