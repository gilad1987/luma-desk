/**
 * Lines that fail part way (decision 9: statements run in order, so an error leaves the earlier statements applied)
 * and every parser error message. A parser that validates the whole line first changes this transcript.
 */
export const PARTIAL_ERROR_LINES = [
  'Fixture 201 At 50 Group 99',
  'Fixture 1 Thru 3 Bogus',
  'Fixture 201 Thru 203 Bogus',
  'Fixture 202 Thru 204 At 40 At',
  'Group 3 At 20 Preset 9.9',
  'Fixture 205 At 60 Store Cue 3 Exec 99',
  'Fixture 206 At 70 Label Bogus 1 Name',
  'ClearAll',
  'At 50',
  'Preset 9.9',
  'Preset 4.99',
  'Store Group 41',
  'Store Preset 9.1',
  'Goto Cue 99',
  'Delete Cue 99',
  'Label Cue 99 Missing',
  'Label Group 99 Missing',
  'Fade x',
];
