import { autoStyleTaglines } from './autoStyleTaglines';
import { builder } from './builder';
import { guide } from './guide';
import { messages } from './messages';
import { panels } from './panels';
import { topBar } from './topBar';
import { tour } from './tour';

/**
 * Every Hebrew string the app writes, kept apart from the logic so the copy can change without touching it. The area
 * files hold the text byte for byte as the original page had it (maqaf, LRM marks and arrows included). Every area
 * stays nested under its file's name, so a key never clashes with another area's (`panels.guide` vs `guide`).
 */
export const he = {
  autoStyleTaglines,
  guide,
  tour,
  panels,
  topBar,
  messages,
  builder,
} as const;
