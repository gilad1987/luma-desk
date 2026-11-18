import { defaultGroupsOf } from '../../domain/stage/groupsOf';
import type { GroupPool } from '../GroupLibrary';
import type { RigSource } from './RigSource';

/**
 * The factory group pool of the current stage. The built-in stage gets no truss groups, so it keeps exactly the
 * 37-slot pool that saved shows and the demo show were made with; any other stage also gets one group per truss in
 * the free slots from 38 on.
 */
export function defaultPoolOf(source: RigSource): GroupPool {
  return defaultGroupsOf(source.rig, source.design, { trussGroups: !source.isBuiltIn });
}
