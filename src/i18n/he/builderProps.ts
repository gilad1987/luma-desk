/**
 * The Stage Builder property panel: the empty-selection hint and the tooltips of the position, aim and truss fields.
 * Kept apart from `builder.ts` so each area file stays one subject; `builder.ts` joins it back as `he.builder.props`.
 */
export const builderProps = {
  nothingSelected: 'בחרו טראס או גוף תאורה כדי לראות את המאפיינים שלו.',
  x: 'מיקום מצד לצד במטרים',
  y: 'גובה מעל הקרקע במטרים',
  z: 'מיקום מירכתי הבמה לכיוון הקהל במטרים',
  pan: 'סיבוב אופקי קבוע במעלות',
  tilt: 'הטיה קבועה במעלות',
  name: 'שם הטראס',
  trussRole: 'התפקיד של גופים חדשים שנוספים לטראס הזה',
} as const;
