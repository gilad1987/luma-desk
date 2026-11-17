/**
 * The Store paths: empty programmer, no cue number (next free number), decimal and overwritten cues, and a Store
 * Preset and Store Group that succeed, then recall what they stored (a recall without a selection only toasts).
 */
export const STORE_LINES = [
  'ClearAll',
  'Store',
  'Store Cue 30',
  'Exec 3',
  'Fixture 201 Thru 205 At 70',
  'Store',
  'Store Cue',
  'Store Fade 4',
  'Store Preset 1.9',
  'ClearAll',
  'Preset 1.9',
  'Fixture 201 Thru 210',
  'Preset 1.9',
  'Group 2',
  'Store Preset 4.12',
  'Store Group 42',
  'Label Group 42 Stored Here',
  'Group 42 At 30',
  'Store Cue 2.5',
  'Store Cue 2.5',
];
