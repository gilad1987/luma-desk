import type { AutoShowPanel } from '../../ui/panels/autoshow/AutoShowPanel';
import type { CommandLine } from '../../ui/panels/command/CommandLine';
import type { EncodersPanel } from '../../ui/panels/encoders/EncodersPanel';
import type { ExecutorsPanel } from '../../ui/panels/executors/ExecutorsPanel';
import type { SelectionInfo } from '../../ui/panels/selection/SelectionInfo';
import type { SequencePanel } from '../../ui/panels/sequence/SequencePanel';
import type { SheetPanel } from '../../ui/panels/sheet/SheetPanel';
import type { LayoutHandles } from '../layout/wireLayout';
import type { FpsClock } from '../ui/FpsClock';
import type { UiTickScheduler } from './UiTickScheduler';

/** The readouts the throttled UI ticks repaint; names follow the composition root. */
export interface UiTickPanels {
  readonly executors: Pick<ExecutorsPanel, 'fast'>;
  readonly encoders: Pick<EncodersPanel, 'fast'>;
  readonly autoShowPanel: Pick<AutoShowPanel, 'fast'>;
  readonly layout: Pick<LayoutHandles, 'fast'>;
  readonly selectionInfo: Pick<SelectionInfo, 'fast'>;
  readonly commandLine: Pick<CommandLine, 'fast'>;
  readonly sequence: Pick<SequencePanel, 'slow'>;
  readonly sheet: Pick<SheetPanel, 'slow'>;
  readonly fps: Pick<FpsClock, 'slow'>;
}

/**
 * Registers the panel repaints in the order of the original frame loop, which is the order the DOM writes happened
 * in. Fast: executors, encoders, the auto-show pane, the MA read-outs, the selection chips, the command keys. Slow:
 * the sequence and the sheet (each only while its tab shows), then the frame rate and the clock.
 */
export function scheduleUiTicks(ui: UiTickScheduler, panels: UiTickPanels): void {
  ui.onFast(() => panels.executors.fast());
  ui.onFast(() => panels.encoders.fast());
  ui.onFast((now) => panels.autoShowPanel.fast(now));
  ui.onFast(() => panels.layout.fast());
  ui.onFast(() => panels.selectionInfo.fast());
  ui.onFast(() => panels.commandLine.fast());
  ui.onSlow(() => panels.sequence.slow());
  ui.onSlow(() => panels.sheet.slow());
  ui.onSlow(() => panels.fps.slow());
}
