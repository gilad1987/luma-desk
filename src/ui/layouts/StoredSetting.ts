/**
 * A layout field (`deskMode`, `deskZoom`) as the page keeps it. Earlier versions kept any truthy stored JSON value with
 * its own type (`L.deskMode || 'ma'`), so a corrupt `true` or `{}` must survive the load, the fit and the save exactly
 * as before; the selects only ever add strings.
 */
export type StoredSetting = string | number | boolean | object;
