import { autoStyleTaglines } from './autoStyleTaglines';
import { guide } from './guide';
import { messages } from './messages';
import { topBar } from './topBar';
import { tour } from './tour';

/**
 * Every Hebrew string the app writes, kept apart from the logic so the copy can change without touching it. The area
 * files hold the text byte for byte as the original page had it (maqaf, LRM marks and arrows included).
 */
export const he = {
  autoStyleTaglines,
  guide,
  tour,
  ...topBar,
  ...messages,
} as const;
