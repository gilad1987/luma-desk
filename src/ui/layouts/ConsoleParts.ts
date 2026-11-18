import { byId, requireChild } from '../dom';

/**
 * The panel nodes a layout moves into its console slots (the `PARTS` contract of the plan). They are looked up once,
 * because a moved node is no longer where a fresh lookup by parent would expect it. Panels keep their own references.
 */
export class ConsoleParts {
  private readonly featTabs = byId('featTabs');
  private readonly encBody = byId('encBody');
  private readonly encoders = byId('encoders');
  private readonly encExtra = byId('encExtra');
  private readonly cmdFb = byId('cmdFb');
  private readonly cmdrow = requireChild(document, '.cmdrow');
  private readonly keys = requireChild(document, '.keys');

  /** Puts every moved part back in its classic parent, so each layout starts from the same tree. */
  restore(): void {
    this.encBody.append(this.encoders, this.encExtra);
    byId('enc').append(this.featTabs, this.encBody);
    byId('cmdArea').prepend(this.cmdFb, this.cmdrow, this.keys);
    byId('sideTabs').after(byId('pane-pools'));
  }

  /** The MA console: two screens, the programmer section and the master section. */
  toMa(keypad: () => HTMLElement): void {
    const pad = keypad();
    byId('d1s').appendChild(byId('side'));
    byId('d2s').append(byId('pane-pools'), this.encExtra);
    byId('d3s').append(this.cmdFb, this.cmdrow);
    byId('pbSlot').appendChild(byId('execs'));
    byId('execs').style.flex = '1';
    byId('ftSlot').appendChild(this.featTabs);
    byId('ecSlot').appendChild(this.encoders);
    byId('kySlot').appendChild(this.keys);
    byId('kpSlot').appendChild(pad);
    byId('msSlot').appendChild(byId('master'));
  }

  /** The desk console: screen wing, programmer and playback in the centre, command and master on the right. */
  toDesk(keypad: () => HTMLElement): void {
    byId('cwScreen').appendChild(byId('side'));
    byId('encSlot').appendChild(byId('enc'));
    byId('execSlot').appendChild(byId('execs'));
    byId('execs').style.flex = '1';
    byId('cwCmd').appendChild(byId('cmdArea'));
    byId('cmdArea').appendChild(keypad());
    byId('cwMaster').appendChild(byId('master'));
  }

  /** The classic page: side panel beside the viewer, encoder bar and the footer desk under it, no keypad. */
  toClassic(removeKeypad: () => void): void {
    const desk = byId('desk'),
      master = byId('master');
    byId('main').appendChild(byId('side'));
    byId('app').insertBefore(byId('enc'), desk);
    desk.insertBefore(byId('cmdArea'), desk.firstChild);
    removeKeypad();
    desk.insertBefore(byId('execs'), master.parentNode === desk ? master : null);
    byId('execs').style.flex = '';
    desk.appendChild(master);
  }
}
