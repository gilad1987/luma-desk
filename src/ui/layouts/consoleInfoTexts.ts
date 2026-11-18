import { FEATS } from '../../domain/attributes';

/** What the console info labels show; read every 250 ms. */
export interface ConsoleInfoState {
  /** The side tab, empty before the first tab is shown. */
  readonly sideTab: string;
  readonly feature: string;
  readonly selected: number;
  /** Zero-based selected executor. */
  readonly execIndex: number;
  readonly execName: string;
}

/** The MA screen headers: screen 1 tab, screen 2 feature and selection count, screen 3 executor. */
export function maInfoTexts(s: ConsoleInfoState): { readonly d1: string; readonly d2: string; readonly d3: string } {
  const feature = FEATS.find((f) => f[0] === s.feature);
  return {
    d1: s.sideTab.toUpperCase(),
    d2: `${feature ? feature[1].toUpperCase() : ''} · ${s.selected} SEL`,
    d3: `EXEC ${s.execIndex + 1} ${s.execName}`,
  };
}

/** The desk wing labels: playback executor (`empty` without a name), selection count, screen tab. */
export function deskInfoTexts(s: ConsoleInfoState): {
  readonly playback: string;
  readonly programmer: string;
  readonly screen: string;
} {
  return {
    playback: `EXEC ${s.execIndex + 1} · ${s.execName || 'empty'}`,
    programmer: `${s.selected} SELECTED`,
    screen: s.sideTab.toUpperCase(),
  };
}
