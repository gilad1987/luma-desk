import { ATTR } from '../../domain/attributes';
import { MAX_FILE_ANGLE } from '../../domain/stage/mvrRestAim';
import { fixtureCount, type FileDataLine } from './fileDataLine';

/**
 * One line for the fixtures whose file tilt the desk cannot reach. The desk tilt has no value past its range, so
 * the rest aim stops at the limit; the pose is then not the one the designer drew, and the summary says how many.
 */
export function tiltLine(clamped: number): FileDataLine[] {
  if (clamped === 0) return [];
  const message =
    `${fixtureCount(clamped)} ${clamped === 1 ? 'states' : 'state'} a tilt in the file's CustomCommands outside the ` +
    `desk range of ${ATTR.tilt.min} to ${ATTR.tilt.max} degrees; the desk stops at its limit.`;
  return [{ kind: 'tiltLimit', count: clamped, message }];
}

/** The line for the commands the desk does not use, by fixture. */
export function unmappedLine(unused: ReadonlyMap<number, readonly string[]>): FileDataLine[] {
  const texts = [...unused.values()].flat();
  if (texts.length === 0) return [];
  const count = fixtureCount(unused.size);
  const message = `${texts.length} CustomCommands on ${count} are not used by the desk, for example "${texts[0]}"; they stay in the file.`;
  return [{ kind: 'unmappedCommands', count: unused.size, message }];
}

/**
 * One line for every fixture whose pan or tilt command states an angle no head adopts. GDTF: "FLOAT_VALUE_PHYSICAL
 * is the physical value that the fixture should adopt", so a value past the trusted GDTF range stops at its end, and
 * without a trusted range a value beyond `MAX_FILE_ANGLE` is not used.
 */
export function limitLine(limited: number): FileDataLine[] {
  if (limited === 0) return [];
  const message =
    `${fixtureCount(limited)} ${limited === 1 ? 'states' : 'state'} a pan or tilt in the file's CustomCommands that ` +
    `no fixture can adopt: a value past the GDTF range stops at the end of the range, and a value beyond ` +
    `${MAX_FILE_ANGLE} degrees without a trusted range is not used.`;
  return [{ kind: 'aimLimit', count: limited, message }];
}
