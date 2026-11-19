import { PRODUCT_IDS } from '../../../domain/fixtureProducts';
import { GALLERY_VIEWS, type GalleryParams } from './galleryParams';

/** Called with the params a control asks for; the page shows them by loading their URL. */
export type GalleryChange = (next: GalleryParams) => void;

function createLabel(text: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement('label');
  label.append(text, ' ', control);
  return label;
}

function createProductSelect(params: GalleryParams, onChange: GalleryChange): HTMLLabelElement {
  const select = document.createElement('select');
  for (const id of PRODUCT_IDS) select.add(new Option(id, id));
  select.value = params.id;
  select.addEventListener('change', () => onChange({ ...params, id: select.value }));
  return createLabel('Product', select);
}

function createViewButtons(params: GalleryParams, onChange: GalleryChange): HTMLElement[] {
  return GALLERY_VIEWS.map((view) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = view;
    button.setAttribute('aria-pressed', String(view === params.view));
    button.addEventListener('click', () => onChange({ ...params, view }));
    return button;
  });
}

function createLitToggle(params: GalleryParams, onChange: GalleryChange): HTMLLabelElement {
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = params.isLit;
  box.addEventListener('change', () => onChange({ ...params, isLit: box.checked }));
  return createLabel('Lit', box);
}

function createAngleSlider(text: 'Pan' | 'Tilt', params: GalleryParams, onChange: GalleryChange): HTMLLabelElement {
  const key = text === 'Pan' ? 'pan' : 'tilt';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '-270';
  slider.max = '270';
  slider.step = '5';
  slider.value = String(params[key]);
  slider.title = `${slider.value} deg`;
  // `change`, not `input`: each value reloads the page, so only the released value does
  slider.addEventListener('change', () => onChange({ ...params, [key]: Number(slider.value) }));
  return createLabel(text, slider);
}

/** Adds the gallery's control bar to `parent`: product, view, lit, pan and tilt. English labels: a dev tool. */
export function mountGalleryControls(parent: HTMLElement, params: GalleryParams, onChange: GalleryChange): void {
  const bar = document.createElement('div');
  bar.id = 'controls';
  bar.append(
    createProductSelect(params, onChange),
    ...createViewButtons(params, onChange),
    createLitToggle(params, onChange),
    createAngleSlider('Pan', params, onChange),
    createAngleSlider('Tilt', params, onChange),
  );
  parent.append(bar);
}
