import type { Executor } from '../../engine/Executor';
import type { ExecutorPool } from '../../engine/ExecutorPool';

/**
 * The executor at 0-based `index`. Quirk C2: the original used the missing executor anyway, so the browser threw a
 * `TypeError` whose text the operator saw. This throws the same text (Chromium's wording), naming the property the
 * original touched first and whether it read or set it. `Pause` is the one accepted exception: it names `pause`, where
 * the original's `execPause` read `fade` first (quirk J6).
 */
export function executorAt(
  pool: ExecutorPool,
  index: number,
  access: 'reading' | 'setting',
  property: string,
): Executor {
  const executor = pool.execs[index];
  if (executor) return executor;
  const verb = access === 'reading' ? 'read' : 'set';
  throw new TypeError(`Cannot ${verb} properties of undefined (${access} '${property}')`);
}
