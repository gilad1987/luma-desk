import { byId } from '../../dom';

/**
 * Wires the summary's show choice. "Build" takes the focus, so Enter builds the starting show (the default). Either
 * button ends the choice and gives the focus to the close button, so the keyboard does not fall back to the page
 * when the focused button goes. "Keep" only ends the choice: the import already applied the kept show.
 */
export function wireShowChoice(buildShow: () => void): void {
  const end = (): void => {
    byId('mvrShowChoice').remove();
    byId('mvrSummaryClose').focus();
  };
  const build = byId('mvrBuildShow');
  build.onclick = () => {
    buildShow();
    end();
  };
  byId('mvrKeepCues').onclick = end;
  build.focus();
}
