/**
 * Hebrew words that name a kind of scenery in MVR object and layer names, not text the desk shows: the scenery
 * material classes (`classWords`) read them next to their English ones; they live here because every Hebrew string of
 * the source lives in the locale (rule I1).
 */
export const mvrClassWords = {
  /** "Band", "people", "figure", "mannequin", "musicians": a light neutral matte so people read. */
  figure: ['להקה', 'אנשים', 'דמות', 'בובה', 'נגנים'],
  /** "Speaker", "speakers". */
  speaker: ['רמקול', 'רמקולים'],
  /** "Truss", "trusses", "roof". */
  truss: ['טראס', 'טראסים', 'גג'],
  /** "Scaffold", "scaffolds", "Layher", "tower". */
  scaffold: ['פיגום', 'פיגומים', 'לייהר', 'מגדל'],
  /** "Curtain", "curtains", "cloth". */
  cloth: ['וילון', 'וילונות', 'בד'],
  /** "Wall", "walls". */
  wall: ['קיר', 'קירות'],
  /** "Stage", "floor", "riser" (podest), "stairs". */
  deck: ['במה', 'רצפה', 'פודסט', 'מדרגות'],
  /** One-letter prefixes ("the", "and", "in", "to", "from") a name may put before one of these words. */
  prefixes: 'הובלמש',
} as const;
